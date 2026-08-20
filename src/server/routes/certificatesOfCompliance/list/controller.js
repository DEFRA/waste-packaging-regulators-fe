import Boom from '@hapi/boom'
import { config } from '#config/config.js'
import { handleApiError } from '#server/common/helpers/handle-api-error.js'
import {
  SEARCH_ERROR_TEXT,
  SEARCH_TERM_MAX_LENGTH
} from '../common/constants.js'
import { getCertificatesOfComplianceViewModel } from './list.service.js'
import { getComplianceSearchResults } from './search.service.js'

// An absent `search` param means no search was run, so the page renders as
// normal. An empty or whitespace-only one means the user pressed Search with
// nothing entered, which is a validation error.
export const parseSearchTerm = (rawSearch) => {
  if (rawSearch === undefined) {
    return { searchTerm: '', errors: null }
  }

  const searchTerm = rawSearch.trim().slice(0, SEARCH_TERM_MAX_LENGTH)

  if (searchTerm === '') {
    return {
      searchTerm: '',
      errors: {
        summary: [{ text: SEARCH_ERROR_TEXT, href: '#search' }],
        search: { text: SEARCH_ERROR_TEXT }
      }
    }
  }

  return { searchTerm, errors: null }
}

const complianceListSortKey = (organisationType) =>
  `complianceListSort:${organisationType}`

export const getDefaultSortColumn = (submissionStatus) => {
  if (submissionStatus !== 'not-submitted') {
    return 'DateSubmitted'
  }
  return 'OrganisationName'
}

export function resolveSortForSubmissionStatus(
  request,
  submissionStatus,
  type
) {
  const sortStorageKey = complianceListSortKey(type)
  const storedSorts = request.yar.get(sortStorageKey) ?? {}

  if (request.query.sort) {
    const match = request.query.sort.match(/^([^[]+)(?:\[([^\]]+)\])?$/)
    const sortColumn = match ? match[1] : request.query.sort
    const sortDirection = match?.[2] ?? 'asc'
    request.yar.set(sortStorageKey, {
      ...storedSorts,
      [submissionStatus]: { column: sortColumn, direction: sortDirection }
    })
    return { sortColumn, sortDirection }
  }

  const stored = storedSorts[submissionStatus]
  if (stored) {
    return {
      sortColumn: stored.column,
      sortDirection: stored.direction
    }
  }

  return {
    sortColumn: getDefaultSortColumn(submissionStatus),
    sortDirection: request.query.sortDirection ?? 'asc'
  }
}

export const certificatesOfComplianceController = {
  async handler(request, h) {
    if (!request.yar.get('user')) {
      request.yar.set('returnTo', request.url.pathname + request.url.search)
      return h.redirect('/signin-oidc')
    }

    const {
      type = 'direct-producers',
      tab: submissionStatus = 'pending',
      page = '1'
    } = request.query

    if (!['direct-producers', 'compliance-schemes'].includes(type)) {
      throw Boom.badRequest(`Invalid organisation type: ${type}`)
    }

    if (!['pending', 'accepted', 'not-submitted'].includes(submissionStatus)) {
      throw Boom.badRequest(`Invalid submission status: ${submissionStatus}`)
    }
    const { sortColumn, sortDirection } = resolveSortForSubmissionStatus(
      request,
      submissionStatus,
      type
    )

    const { searchTerm, errors } = parseSearchTerm(request.query.search)

    const traceId = request.headers[config.get('tracing.header')]

    const [viewModel, search] = await Promise.all([
      getCertificatesOfComplianceViewModel(
        type,
        submissionStatus,
        Number.parseInt(page, 10),
        sortColumn,
        sortDirection,
        traceId
      ),
      searchTerm ? getComplianceSearchResults(type, searchTerm, traceId) : null
    ]).catch((error) => {
      handleApiError(request, error)
      throw error
    })

    return h.view('certificatesOfCompliance/list/index', {
      ...viewModel,
      searchTerm,
      errors,
      isSearch: search !== null,
      searchItems: search?.items ?? [],
      searchResultCount: search?.total ?? 0,
      searchTruncated: search?.truncated ?? false,
      clearSearchUrl: `/certificates-of-compliance?type=${type}&tab=${submissionStatus}`,
      pageTitle: errors ? `Error: ${viewModel.heading}` : viewModel.heading
    })
  }
}
