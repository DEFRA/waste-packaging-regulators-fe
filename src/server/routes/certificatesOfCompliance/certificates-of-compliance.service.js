import { config } from '#/config/config.js'
import { createLogger } from '#/server/common/helpers/logging/logger.js'

const logger = createLogger()

// --- Mock data ---
// This will be replaced with calls to APIs.
// The model shape is correct, but it will be a combination of api calls.
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

// --- API calls ---

async function getComplianceSummary(organisationType) {
  const url = `${config.get('apiBaseUrl')}/compliance/summary?type=${organisationType}`

  logger.debug({ url }, 'Fetching compliance summary')

  // TODO: uncomment when the backend API is available
  // const response = await fetch(url)
  // if (!response.ok) {
  //   throw new Error(`Compliance summary request failed with status ${response.status}`)
  // }
  // return response.json()

  return mockSummary
}

async function getComplianceList(organisationType, tab, page) {
  const url = `${config.get('apiBaseUrl')}/compliance/list?type=${organisationType}&tab=${tab}&page=${page}`

  logger.debug({ url }, 'Fetching compliance list')

  // TODO: uncomment when the backend API is available
  // const response = await fetch(url)
  // if (!response.ok) {
  //   throw new Error(`Compliance list request failed with status ${response.status}`)
  // }
  // return response.json()

  return {
    items: mockListByTab[tab] ?? [],
    totalPages: 6,
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
 * @returns {Promise<object>}
 */
export async function getCertificatesOfComplianceViewModel(
  organisationType,
  tab,
  currentPage
) {
  const baseUrl = `/certificates-of-compliance?type=${organisationType}&tab=${tab}`

  const [summary, list] = await Promise.all([
    getComplianceSummary(organisationType),
    getComplianceList(organisationType, tab, currentPage)
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
