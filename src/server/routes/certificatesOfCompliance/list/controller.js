import Boom from '@hapi/boom'
import { config } from '#config/config.js'
import { handleApiError } from '#server/common/helpers/handle-api-error.js'
import { getLocale } from '#server/common/helpers/i18n/get-locale.js'
import {
  bindLocaleUrl,
  persistAuthLocale,
  redirectWithLocale
} from '#server/common/helpers/i18n/locale-url.js'
import { translate } from '#server/common/helpers/i18n/translate.js'
import { SEARCH_TERM_MAX_LENGTH } from '../common/constants.js'
import { cocPageI18n } from '../common/locale-strings.js'
import { getCertificatesOfComplianceViewModel } from './list.service.js'
import { getComplianceSearchResults } from './search.service.js'

export const parseSearchTerm = (rawSearch, locale = 'en') => {
  if (rawSearch === undefined) {
    return { searchTerm: '', errors: null }
  }

  const searchTerm = rawSearch.trim().slice(0, SEARCH_TERM_MAX_LENGTH)
  const searchError = translate(
    locale,
    'certificatesOfCompliance.list.search.error'
  )

  if (searchTerm === '') {
    return {
      searchTerm: '',
      errors: {
        summary: [{ text: searchError, href: '#search' }],
        search: { text: searchError }
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

  const defaultSortColumn = getDefaultSortColumn(submissionStatus)
  const defaultSortDirection =
    defaultSortColumn === 'DateSubmitted' ? 'desc' : 'asc'

  return {
    sortColumn: defaultSortColumn,
    sortDirection: request.query.sortDirection ?? defaultSortDirection
  }
}

export const certificatesOfComplianceController = {
  async handler(request, h) {
    const locale = getLocale(request)

    if (!request.yar.get('user')) {
      persistAuthLocale(request, locale)
      request.yar.set('returnTo', request.url.pathname + request.url.search)
      return redirectWithLocale(h, request, '/signin-oidc')
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

    const { searchTerm, errors } = parseSearchTerm(request.query.search, locale)

    const traceId = request.headers[config.get('tracing.header')]

    const [viewModel, search] = await Promise.all([
      getCertificatesOfComplianceViewModel(
        type,
        submissionStatus,
        Number.parseInt(page, 10),
        sortColumn,
        sortDirection,
        traceId,
        locale
      ),
      searchTerm ? getComplianceSearchResults(type, searchTerm, traceId) : null
    ]).catch((error) => {
      handleApiError(request, error)
      throw error
    })

    const i18n = cocPageI18n(locale, 'list')
    const errorPrefix = translate(locale, 'common.errorPrefix')

    const url = bindLocaleUrl(locale)

    return h.view('certificatesOfCompliance/list/index', {
      ...viewModel,
      locale,
      i18n,
      searchTerm,
      errors,
      isSearch: search !== null,
      searchItems: search?.items ?? [],
      searchResultCount: search?.total ?? 0,
      searchTruncated: search?.truncated ?? false,
      clearSearchUrl: url(
        `/certificates-of-compliance?type=${type}&tab=${submissionStatus}`
      ),
      pageTitle: errors
        ? `${errorPrefix}${viewModel.heading}`
        : viewModel.heading
    })
  }
}
