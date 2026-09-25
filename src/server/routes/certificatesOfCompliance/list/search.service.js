import { createWasteObligationsApiService } from '#services/waste-obligations-api.service.js'
import {
  registrationTypeByOrganisationType,
  searchSubmissionStatusByDeclarationStatus,
  COMPLIANCE_YEAR,
  SEARCH_RESULTS_PAGE_SIZE,
  SEARCH_STATUSES,
  SEARCH_STATUS_NOT_SUBMITTED,
  SEARCH_UNSUBMITTED_SORT
} from '../common/constants.js'
import { mapDeclarationToItem, mapUnsubmittedToItem } from './list.service.js'
import { groupSearchItemsByOrganisation } from './search-grouping.js'

function mapDeclarationToSearchItem(declaration) {
  return {
    ...mapDeclarationToItem(declaration),
    submissionStatus:
      searchSubmissionStatusByDeclarationStatus[declaration.status] ??
      declaration.status
  }
}

function mapUnsubmittedToSearchItem(row) {
  return {
    ...mapUnsubmittedToItem(row),
    submissionStatus: SEARCH_STATUS_NOT_SUBMITTED
  }
}

// Two endpoints, because "not submitted" is not a declaration status: the
// declaration search can only return organisations that have submitted.
export async function getComplianceSearchResults(
  organisationType,
  searchTerm,
  traceId,
  country = null
) {
  const obligationsApi = createWasteObligationsApiService()
  const registrationType = registrationTypeByOrganisationType[organisationType]

  const [declarationData, unsubmittedData] = await Promise.all([
    obligationsApi.listComplianceDeclarations(
      {
        // obligationYear scopes results to the compliance year the page is showing,
        // and is the prefix of the ObligationYear_Status_OrganisationRegistrationType
        // index, so without it the search cannot use that index.
        obligationYear: COMPLIANCE_YEAR,
        status: SEARCH_STATUSES,
        registrationType,
        country,
        search: searchTerm,
        sortColumn: 'DateSubmitted',
        sortDirection: 'desc',
        page: 1,
        pageSize: SEARCH_RESULTS_PAGE_SIZE
      },
      traceId
    ),
    obligationsApi.listUnsubmittedComplianceDeclarations(
      {
        obligationYear: COMPLIANCE_YEAR,
        registrationType,
        country,
        search: searchTerm,
        sort: SEARCH_UNSUBMITTED_SORT,
        page: 1,
        pageSize: SEARCH_RESULTS_PAGE_SIZE
      },
      traceId
    )
  ])

  const items = groupSearchItemsByOrganisation(
    declarationData.complianceDeclarations.map(mapDeclarationToSearchItem),
    unsubmittedData.unsubmittedOrganisations.map(mapUnsubmittedToSearchItem)
  )

  // Rows that exist, not rows rendered: a cancelled-only organisation counts two.
  const total = declarationData.total + unsubmittedData.total

  return {
    items,
    total,
    truncated: total > items.length
  }
}
