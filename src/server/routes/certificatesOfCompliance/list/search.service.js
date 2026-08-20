import { config } from '#config/config.js'
import { throwIfMockErrorConfigured } from '#server/common/helpers/mock-api-error.js'
import { createWasteObligationsApiService } from '#services/waste-obligations-api.service.js'
import { mockListByOrganisationType } from '../certificates-of-compliance.mock.js'
import {
  registrationTypeByOrganisationType,
  searchSubmissionStatusByDeclarationStatus,
  COMPLIANCE_YEAR,
  SEARCH_RESULTS_PAGE_SIZE,
  SEARCH_STATUSES
} from '../common/constants.js'
import { mapDeclarationToItem, sortItems } from './list.service.js'

// Stands in for the API's matching when running against fixtures. It is an
// approximation: the API also matches the compliance scheme and scheme operator
// names, which the fixtures do not carry.
function mockRowMatchesTerm(item, searchTerm) {
  const term = searchTerm.toLowerCase()

  return [item.organisationName, item.organisationReferenceNumber].some(
    (value) => value?.toLowerCase().includes(term)
  )
}

function mapDeclarationToSearchItem(declaration) {
  return {
    ...mapDeclarationToItem(declaration),
    submissionStatus:
      searchSubmissionStatusByDeclarationStatus[declaration.status] ??
      declaration.status
  }
}

// The mock fixtures are already in row shape rather than declaration shape, so
// they are filtered and labelled here instead of going through the mapper.
function getMockSearchResults(organisationType, searchTerm) {
  throwIfMockErrorConfigured('waste-obligations-api')

  const listByTab = mockListByOrganisationType[organisationType] ?? {}
  const items = [
    ...(listByTab.pending ?? []).map((item) => ({
      ...item,
      submissionStatus: 'Pending'
    })),
    ...(listByTab.accepted ?? []).map((item) => ({
      ...item,
      submissionStatus: 'Accepted'
    }))
  ].filter((item) => mockRowMatchesTerm(item, searchTerm))

  sortItems(items, 'dateSubmitted', 'desc')

  return { items, total: items.length, truncated: false }
}

// Pending and accepted submissions matching the term, for the organisation type
// of the page. One row per submission, most recent first.
export async function getComplianceSearchResults(
  organisationType,
  searchTerm,
  traceId
) {
  if (config.get('useMockApi')) {
    return getMockSearchResults(organisationType, searchTerm)
  }

  const obligationsApi = createWasteObligationsApiService()
  const registrationType = registrationTypeByOrganisationType[organisationType]

  const data = await obligationsApi.listComplianceDeclarations(
    {
      // obligationYear scopes results to the compliance year the page is showing,
      // and is the prefix of the ObligationYear_Status_OrganisationRegistrationType
      // index, so without it the search cannot use that index.
      obligationYear: COMPLIANCE_YEAR,
      status: SEARCH_STATUSES,
      registrationType,
      search: searchTerm,
      sortColumn: 'DateSubmitted',
      sortDirection: 'desc',
      page: 1,
      pageSize: SEARCH_RESULTS_PAGE_SIZE
    },
    traceId
  )

  const items = data.complianceDeclarations.map(mapDeclarationToSearchItem)

  return {
    items,
    total: data.total,
    truncated: data.total > items.length
  }
}
