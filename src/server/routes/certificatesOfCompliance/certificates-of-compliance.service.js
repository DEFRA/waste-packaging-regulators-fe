import { config } from '#/config/config.js'
import { createWasteObligationsApiService } from '#/services/waste-obligations-api.service.js'
import { createWasteOrganisationsApiService } from '#/services/waste-organisations-api.service.js'
import {
  mockSummary,
  mockListByTypeAndTab,
  mockDetailFor
} from './certificates-of-compliance.mock.js'

export {
  mockSummary,
  mockDetailData,
  mockComplianceDetailData,
  mockPendingItems,
  mockAcceptedItems,
  mockNotSubmittedItems,
  mockCompliancePendingItems,
  mockComplianceAcceptedItems,
  mockComplianceNotSubmittedItems
} from './certificates-of-compliance.mock.js'

// --- Response mapping ---

// Maps our organisationType URL param to the API's registrationType value
const registrationTypeByOrganisationType = {
  'compliance-schemes': 'ComplianceScheme',
  'direct-producers': 'DirectProducer'
}

// Maps our tab name to the API's declaration status value
const statusByTab = {
  pending: 'Submitted',
  accepted: 'Accepted'
}

const PAGE_SIZE = 20
const DECLARATIONS_BATCH_SIZE = 100

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
    organisationName:
      organisation.name ??
      organisation.complianceSchemeName ??
      organisation.schemeOperatorName ??
      'Unknown organisation',
    recyclingObligationsMet: obligationStatus?.toLowerCase() === 'met',
    regulation43Met: isRegulation43Compliant,
    percentageMet: percentageMet ?? null,
    dateSubmitted: created
  }
}

function mapOrganisationToItem(organisation, organisationType) {
  const organisationName =
    organisation.registrationType === 'compliance-schemes'
      ? (organisation.tradingName ??
        organisation.name ??
        'Unknown organisation')
      : (organisation.name ?? 'Unknown organisation')
  return {
    id: organisation.companiesHouseNumber,
    organisationName
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

// --- API calls ---

async function getComplianceSummary(
  obligationsApi,
  organisationsApi,
  organisationType,
  traceId
) {
  if (config.get('useMockApi')) {
    return mockSummary
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
        { registrationType, registrationYears: 2026 },
        traceId
      )
    ]
  )

  return {
    // TODO: confirm where complianceYear comes from
    complianceYear: mockSummary.complianceYear,
    totalPending: pendingResult.total,
    totalAccepted: acceptedResult.total,
    totalNotSubmitted:
      notSubmittedResult.organisations.length -
      pendingResult.total -
      acceptedResult.total
  }
}

async function getComplianceList(
  obligationsApi,
  organisationsApi,
  organisationType,
  tab,
  page,
  traceId
) {
  if (config.get('useMockApi')) {
    return {
      items: mockListByTypeAndTab[organisationType]?.[tab] ?? [],
      totalPages: 6,
      currentPage: page
    }
  }

  const registrationType = registrationTypeByOrganisationType[organisationType]

  if (tab === 'not-submitted') {
    const [orgsResult, pendingDeclarations, acceptedDeclarations] =
      await Promise.all([
        organisationsApi.listComplianceOrganisations(
          { registrationType, registrationYears: 2026 },
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
    return {
      items: allItems.slice(start, start + PAGE_SIZE),
      totalPages,
      currentPage: page
    }
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

// --- List page view model ---

export async function getCertificatesOfComplianceViewModel(
  organisationType,
  tab,
  currentPage,
  traceId
) {
  const apiWasteObligation = createWasteObligationsApiService()
  const apiWasteOrganisation = createWasteOrganisationsApiService()
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

// --- Detail response mapping ---

const organisationTypeDisplayNames = {
  DirectProducer: 'Direct producer',
  ComplianceScheme: 'Compliance scheme'
}

const GLASS_BREAKDOWN_MATERIALS = new Set(['GlassRemelt', 'RemainingGlass'])

function formatDate(isoString) {
  if (!isoString) return null
  return new Date(isoString).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

function mapObligation(obligation) {
  return {
    name: obligation.material,
    obligationToMeet: obligation.tonnages.obligated,
    awaitingAcceptance: obligation.tonnages.awaitingAcceptance,
    accepted: obligation.tonnages.accepted,
    outstanding: obligation.tonnages.outstanding,
    met: obligation.status?.toLowerCase() === 'met'
  }
}

function computeTotals(rows) {
  return {
    obligationToMeet: rows.reduce((sum, r) => sum + r.obligationToMeet, 0),
    awaitingAcceptance: rows.reduce((sum, r) => sum + r.awaitingAcceptance, 0),
    accepted: rows.reduce((sum, r) => sum + r.accepted, 0),
    outstanding: rows.reduce((sum, r) => sum + r.outstanding, 0),
    met: rows.every((r) => r.met)
  }
}

function mapDeclarationToDetail(data) {
  const {
    organisation,
    obligationYear,
    obligations,
    obligationStatus,
    submitterName,
    created
  } = data

  const companyName =
    organisation.name ??
    organisation.complianceSchemeName ??
    organisation.schemeOperatorName ??
    'Unknown organisation'

  const allMapped = obligations.map(mapObligation)
  const materials = allMapped.filter(
    (_, i) => !GLASS_BREAKDOWN_MATERIALS.has(obligations[i].material)
  )
  const glassBreakdown = allMapped.filter((_, i) =>
    GLASS_BREAKDOWN_MATERIALS.has(obligations[i].material)
  )

  return {
    complianceYear: String(obligationYear),
    companyName,
    isComplianceScheme: organisation.registrationType === 'ComplianceScheme',
    recyclingObligationsMet: obligationStatus?.toLowerCase() === 'met',
    dateDeclarationSubmitted: formatDate(created),
    organisationType:
      organisationTypeDisplayNames[organisation.registrationType] ??
      organisation.registrationType,
    organisationRef: organisation.referenceNumber,
    // TODO: these will come from the account API call
    companiesHouseNumber: organisation.companiesHouseNumber ?? null,
    nameOnAccount: organisation.nameOnAccount ?? null,
    declarationEmailAddress: organisation.contactEmailAddress ?? null,
    companyPhoneNumber: organisation.contactPhoneNumber ?? null,
    declarationSignedBy: submitterName,
    materials,
    materialTotals: computeTotals(materials),
    glassBreakdown,
    glassBreakdownTotals: computeTotals(glassBreakdown)
  }
}

// --- Detail API call ---

async function getDeclarationDetail(
  obligationsApi,
  organisationId,
  id,
  traceId
) {
  if (config.get('useMockApi')) {
    return mapDeclarationToDetail(mockDetailFor(id))
  }

  const data = await obligationsApi.getComplianceDeclaration(
    { id, organisationId },
    traceId
  )
  return mapDeclarationToDetail(data)
}

// --- Detail page view model ---

export async function getCertificateOfComplianceDetailViewModel(
  organisationId,
  id,
  traceId
) {
  const apiWasteObligation = createWasteObligationsApiService()

  const detail = await getDeclarationDetail(
    apiWasteObligation,
    organisationId,
    id,
    traceId
  )

  return {
    heading: 'Certificate of compliance',
    backlink: '/certificates-of-compliance',
    ...detail
  }
}
