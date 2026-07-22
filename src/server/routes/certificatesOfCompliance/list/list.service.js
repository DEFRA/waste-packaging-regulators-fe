import { config } from '#config/config.js'
import { createAccountApiService } from '#services/account-api.service.js'
import { createWasteObligationsApiService } from '#services/waste-obligations-api.service.js'
import { createWasteOrganisationsApiService } from '#services/waste-organisations-api.service.js'
import {
  mockSummary,
  mockSummaryByOrganisationType,
  mockListByOrganisationType
} from '../certificates-of-compliance.mock.js'
import {
  registrationTypeByOrganisationType,
  statusByTab,
  PAGE_SIZE,
  DECLARATIONS_BATCH_SIZE,
  NO_DATA,
  UNKNOWN_ORGANISATION,
  COMPLIANCE_SCHEMES,
  COMPLIANCE_YEAR
} from '../common/constants.js'
import { mapOrganisationName } from '../common/organisation.js'

function mapDeclarationToItem(declaration) {
  const {
    id,
    organisation,
    obligationStatus,
    isRegulation43Compliant,
    created,
    percentageMet
  } = declaration
  return {
    id,
    organisationReferenceNumber: organisation.referenceNumber,
    organisationId: organisation.id,
    organisationName: mapOrganisationName(organisation),
    recyclingObligationsMet: obligationStatus?.toLowerCase() === 'met',
    regulation43Met: isRegulation43Compliant,
    percentageMet: percentageMet ?? null,
    dateSubmitted: created
  }
}

// Reference number is resolved from the Account API (default 'No data'); the
// organisation name comes from the waste-organisations record via the
// compliance-scheme-aware derivation below.
function mapOrganisationToItem(organisation, organisationType) {
  const organisationName =
    organisationType === COMPLIANCE_SCHEMES
      ? (organisation.tradingName ?? organisation.name ?? UNKNOWN_ORGANISATION)
      : (organisation.name ?? UNKNOWN_ORGANISATION)
  return {
    id: null,
    organisationId: organisation.id,
    companiesHouseNumber: organisation.companiesHouseNumber ?? null,
    organisationReferenceNumber: NO_DATA,
    organisationName
  }
}

// Direct producers share an external id between waste-organisations and the
// Account API, so their reference number is resolved by external id.
async function resolveNotSubmittedOrganisationReferenceNumbers(
  accountApi,
  items,
  traceId
) {
  const externalIds = items.map((item) => item.organisationId).filter(Boolean)

  if (externalIds.length === 0) {
    return
  }

  const { organisations = [] } = await accountApi.getOrganisationsByExternalIds(
    externalIds,
    traceId
  )

  const detailsByExternalId = new Map(
    organisations.map((org) => [org.externalId, org])
  )

  for (const item of items) {
    const details = detailsByExternalId.get(item.organisationId)
    item.organisationReferenceNumber = details?.referenceNumber ?? NO_DATA
  }
}

// Compliance schemes do NOT share an external id with the Account API (the
// scheme identity lives in a separate table). Their reference number lives on
// the operator organisation and is matched by Companies House number instead.
async function resolveNotSubmittedComplianceSchemeReferenceNumbers(
  accountApi,
  items,
  traceId
) {
  const companiesHouseNumbers = items
    .map((item) => item.companiesHouseNumber)
    .filter(Boolean)

  if (companiesHouseNumbers.length === 0) {
    return
  }

  const organisations =
    await accountApi.getOrganisationsByCompaniesHouseNumbers(
      companiesHouseNumbers,
      traceId
    )

  // A Companies House number can match more than one organisation (e.g. a
  // producer and the scheme operator); keep the compliance-scheme operator.
  const complianceSchemeByCompaniesHouseNumber = new Map(
    organisations
      .filter((org) => org.isComplianceScheme)
      .map((org) => [org.companiesHouseNumber, org])
  )

  for (const item of items) {
    const details = complianceSchemeByCompaniesHouseNumber.get(
      item.companiesHouseNumber
    )
    item.organisationReferenceNumber = details?.referenceNumber ?? NO_DATA
  }
}

async function fetchAllDeclarations(api, params, traceId) {
  const first = await api.listComplianceDeclarations(
    { ...params, page: 1, pageSize: DECLARATIONS_BATCH_SIZE },
    traceId
  )
  const totalPages = Math.ceil(first.total / DECLARATIONS_BATCH_SIZE)

  if (totalPages <= 1) {
    return first.complianceDeclarations
  }

  const remaining = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, i) =>
      api.listComplianceDeclarations(
        { ...params, page: i + 2, pageSize: DECLARATIONS_BATCH_SIZE },
        traceId
      )
    )
  )

  return [
    ...first.complianceDeclarations,
    ...remaining.flatMap((r) => r.complianceDeclarations)
  ]
}

async function getComplianceSummary(
  obligationsApi,
  organisationsApi,
  organisationType,
  traceId
) {
  if (config.get('useMockApi')) {
    return mockSummaryByOrganisationType[organisationType] ?? mockSummary
  }

  const registrationType = registrationTypeByOrganisationType[organisationType]

  const [pendingResult, acceptedResult, notSubmittedResult] = await Promise.all(
    [
      obligationsApi.listComplianceDeclarations(
        { status: 'Submitted', registrationType, pageSize: 1 },
        traceId
      ),
      obligationsApi.listComplianceDeclarations(
        { status: 'Accepted', registrationType, pageSize: 1 },
        traceId
      ),
      organisationsApi.listComplianceOrganisations(
        { registrationType, registrationYears: COMPLIANCE_YEAR },
        traceId
      )
    ]
  )

  return {
    // Real API does not yet expose compliance year; use configured registration year
    complianceYear: String(COMPLIANCE_YEAR),
    totalPending: pendingResult.total,
    totalAccepted: acceptedResult.total,
    totalNotSubmitted:
      notSubmittedResult.organisations.length -
      pendingResult.total -
      acceptedResult.total
  }
}

async function getNotSubmittedComplianceList(
  obligationsApi,
  organisationsApi,
  accountApi,
  organisationType,
  registrationType,
  page,
  traceId
) {
  const [orgsResult, pendingDeclarations, acceptedDeclarations] =
    await Promise.all([
      organisationsApi.listComplianceOrganisations(
        { registrationType, registrationYears: COMPLIANCE_YEAR },
        traceId
      ),
      fetchAllDeclarations(
        obligationsApi,
        { status: 'Submitted', registrationType },
        traceId
      ),
      fetchAllDeclarations(
        obligationsApi,
        { status: 'Accepted', registrationType },
        traceId
      )
    ])

  const submittedIds = new Set([
    ...pendingDeclarations.map((d) => d.organisation.id),
    ...acceptedDeclarations.map((d) => d.organisation.id)
  ])

  const allItems = orgsResult.organisations
    .filter((org) => !submittedIds.has(org.id))
    .map((org) => mapOrganisationToItem(org, organisationType))

  const totalPages = Math.ceil(allItems.length / PAGE_SIZE) || 1
  const start = (page - 1) * PAGE_SIZE
  const items = allItems.slice(start, start + PAGE_SIZE)

  if (organisationType === COMPLIANCE_SCHEMES) {
    await resolveNotSubmittedComplianceSchemeReferenceNumbers(
      accountApi,
      items,
      traceId
    )
  } else {
    await resolveNotSubmittedOrganisationReferenceNumbers(
      accountApi,
      items,
      traceId
    )
  }

  return {
    items,
    totalPages,
    currentPage: page
  }
}

async function getComplianceList(
  obligationsApi,
  organisationsApi,
  accountApi,
  organisationType,
  tab,
  page,
  traceId
) {
  if (config.get('useMockApi')) {
    const listByTab = mockListByOrganisationType[organisationType] ?? {}
    return {
      items: listByTab[tab] ?? [],
      totalPages: 6,
      currentPage: page
    }
  }

  const registrationType = registrationTypeByOrganisationType[organisationType]

  if (tab === 'not-submitted') {
    return getNotSubmittedComplianceList(
      obligationsApi,
      organisationsApi,
      accountApi,
      organisationType,
      registrationType,
      page,
      traceId
    )
  }

  const status = statusByTab[tab]

  if (!status) {
    return { items: [], totalPages: 1, currentPage: page }
  }

  const data = await obligationsApi.listComplianceDeclarations(
    { status, registrationType, page, pageSize: PAGE_SIZE },
    traceId
  )

  return {
    items: data.complianceDeclarations.map(mapDeclarationToItem),
    totalPages: Math.ceil(data.total / PAGE_SIZE) || 1,
    currentPage: page
  }
}

export async function getCertificatesOfComplianceViewModel(
  organisationType,
  tab,
  currentPage,
  traceId
) {
  const apiWasteObligation = createWasteObligationsApiService()
  const apiWasteOrganisation = createWasteOrganisationsApiService()
  const apiAccount = createAccountApiService()
  const baseUrl = `/certificates-of-compliance?type=${organisationType}&tab=${tab}`

  const [summary, list] = await Promise.all([
    getComplianceSummary(
      apiWasteObligation,
      apiWasteOrganisation,
      organisationType,
      traceId
    ),
    getComplianceList(
      apiWasteObligation,
      apiWasteOrganisation,
      apiAccount,
      organisationType,
      tab,
      currentPage,
      traceId
    )
  ])

  return {
    heading: 'View certificates and statements of compliance',
    backlink: './',
    complianceYear: summary.complianceYear,
    totalPending: summary.totalPending,
    totalAccepted: summary.totalAccepted,
    totalNotSubmitted: summary.totalNotSubmitted,
    organisationType,
    activeTab: tab,
    items: list.items,
    pagination: {
      currentPage,
      totalPages: list.totalPages,
      baseUrl
    }
  }
}
