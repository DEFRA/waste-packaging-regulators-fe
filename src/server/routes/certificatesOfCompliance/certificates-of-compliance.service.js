import { config } from '#/config/config.js'
import { createWasteObligationsApiService } from '#/services/waste-obligations-api.service.js'
import { createWasteOrganisationsApiService } from '#/services/waste-organisations-api.service.js'

// --- Mock data ---
// Temporary — will be replaced by real API responses once endpoints are confirmed.
// Exported so tests can assert against the same values without hardcoding them twice.

export const mockSummary = {
  complianceYear: '2026',
  totalPending: 42,
  totalAccepted: 156,
  totalNotSubmitted: 8
}

export const mockPendingItems = [
  {
    id: '101411',
    organisationName: 'Howco Group plc',
    recyclingObligationsMet: false,
    percentageMet: 97,
    dateSubmitted: '2027-01-31'
  },
  {
    id: '204872',
    organisationName: 'Greenfield Packaging Ltd',
    recyclingObligationsMet: false,
    percentageMet: 84,
    dateSubmitted: '2027-01-28'
  }
]

export const mockAcceptedItems = [
  {
    id: '309145',
    organisationName: 'Acme Compliance Co',
    recyclingObligationsMet: true,
    regulation43Met: true,
    percentageMet: 112,
    dateSubmitted: '2027-01-15'
  },
  {
    id: '412067',
    organisationName: 'BlueSky Materials plc',
    recyclingObligationsMet: true,
    regulation43Met: false,
    percentageMet: 103,
    dateSubmitted: '2027-01-10'
  }
]

export const mockNotSubmittedItems = [
  {
    id: '518293',
    organisationName: 'Redwood Retail Group',
    recyclingObligationsMet: false,
    percentageMet: 0,
    dateSubmitted: null
  }
]

const mockListByTab = {
  pending: mockPendingItems,
  accepted: mockAcceptedItems,
  'not-submitted': mockNotSubmittedItems
}

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
  // 'not-submitted': TODO — confirm with backend whether this is a separate endpoint or a different status
}

const PAGE_SIZE = 20

function mapDeclarationToItem(declaration) {
  const {
    organisation,
    obligationStatus,
    isRegulation43Compliant,
    created,
    percentageMet
  } = declaration
  return {
    id: organisation.referenceNumber,
    organisationName:
      organisation.name ??
      organisation.complianceSchemeName ??
      organisation.schemeOperatorName ??
      'Unknown organisation',
    recyclingObligationsMet: obligationStatus === 'Met',
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

const DECLARATIONS_BATCH_SIZE = 100

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
      items: mockListByTab[tab] ?? [],
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

// --- View model ---

/**
 * Builds the complete view model for the certificates of compliance page.
 * Fires both API calls in parallel and assembles the result.
 *
 * @param {string} organisationType - 'compliance-schemes' or 'direct-producers'
 * @param {string} tab - 'pending' | 'accepted' | 'not-submitted'
 * @param {number} currentPage - 1-based page number
 * @param {string} [traceId] - request trace ID for upstream correlation
 * @returns {Promise<object>}
 */
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
