import { config } from '#config/config.js'
import { handleApiError } from '#server/common/helpers/handle-api-error.js'
import { getCertificatesOfComplianceViewModel } from './list.service.js'

const complianceListSortKey = (organisationType) =>
  `complianceListSort:${organisationType}`

export const getDefaultSortColumn = (submissionStatus) => {
  if (submissionStatus !== 'not-submitted') {
    return 'dateSubmitted'
  }
  return 'organisationName'
}

export function resolveSortForSubmissionStatus(
  request,
  submissionStatus,
  type
) {
  const sortStorageKey = complianceListSortKey(type)
  const storedSorts = request.yar.get(sortStorageKey) ?? {}

  if (request.query.sortColumn) {
    const sortColumn = request.query.sortColumn
    const sortDirection = request.query.sortDirection ?? 'asc'
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
    const { sortColumn, sortDirection } = resolveSortForSubmissionStatus(
      request,
      submissionStatus,
      type
    )

    const traceId = request.headers[config.get('tracing.header')]

    const viewModel = await getCertificatesOfComplianceViewModel(
      type,
      submissionStatus,
      Number.parseInt(page, 10),
      sortColumn,
      sortDirection,
      traceId
    ).catch((error) => {
      handleApiError(request, error)
      throw error
    })

    return h.view('certificatesOfCompliance/list/index', viewModel)
  }
}
