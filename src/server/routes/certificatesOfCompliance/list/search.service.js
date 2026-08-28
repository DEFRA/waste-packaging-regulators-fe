import { createWasteObligationsApiService } from '#services/waste-obligations-api.service.js'
import {
  registrationTypeByOrganisationType,
  searchSubmissionStatusByDeclarationStatus,
  COMPLIANCE_YEAR,
  SEARCH_RESULTS_PAGE_SIZE,
  SEARCH_STATUSES
} from '../common/constants.js'
import { mapDeclarationToItem } from './list.service.js'

function mapDeclarationToSearchItem(declaration) {
  return {
    ...mapDeclarationToItem(declaration),
    submissionStatus:
      searchSubmissionStatusByDeclarationStatus[declaration.status] ??
      declaration.status
  }
}

// Pending, accepted and cancelled submissions matching the term, for the
// organisation type of the page. One row per submission, most recent first, so
// an organisation with more than one submission gets a row for each.
export async function getComplianceSearchResults(
  organisationType,
  searchTerm,
  traceId
) {
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
