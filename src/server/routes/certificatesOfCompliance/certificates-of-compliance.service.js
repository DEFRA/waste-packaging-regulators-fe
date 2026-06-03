import { config } from '#/config/config.js'
import { createWasteObligationsApiService } from '#/services/waste-obligations-api.service.js'

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
    id: organisation.referenceNumber ?? declaration.id,
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

// --- API calls ---

async function getComplianceSummary(api, organisationType, traceId) {
  if (config.get('useMockApi')) {
    return mockSummary
  }

  const registrationType = registrationTypeByOrganisationType[organisationType]

  const [pendingResult, acceptedResult] = await Promise.all([
    api.listComplianceDeclarations(
      { status: 'Submitted', registrationType, pageSize: 1 },
      traceId
    ),
    api.listComplianceDeclarations(
      { status: 'Accepted', registrationType, pageSize: 1 },
      traceId
    )
  ])

  return {
    // TODO: confirm where complianceYear comes from
    complianceYear: mockSummary.complianceYear,
    totalPending: pendingResult.total,
    totalAccepted: acceptedResult.total,
    // TODO: not-submitted count — confirm endpoint/status with backend team
    totalNotSubmitted: 0
  }
}

async function getComplianceList(api, organisationType, tab, page, traceId) {
  if (config.get('useMockApi')) {
    return {
      items: mockListByTab[tab] ?? [],
      totalPages: 6,
      currentPage: page
    }
  }

  const status = statusByTab[tab]

  if (!status) {
    // TODO: not-submitted tab — confirm endpoint/status value with backend team
    return { items: [], totalPages: 1, currentPage: page }
  }

  const registrationType = registrationTypeByOrganisationType[organisationType]

  const data = await api.listComplianceDeclarations(
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
  const api = createWasteObligationsApiService()
  const baseUrl = `/certificates-of-compliance?type=${organisationType}&tab=${tab}`

  const [summary, list] = await Promise.all([
    getComplianceSummary(api, organisationType, traceId),
    getComplianceList(api, organisationType, tab, currentPage, traceId)
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
