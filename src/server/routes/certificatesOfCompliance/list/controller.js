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
import {
  getForwardedPrefix,
  getProxyPrefix,
  withForwardedPrefix
} from '#server/common/helpers/proxy/forwarded-prefix.js'
import { SEARCH_TERM_MAX_LENGTH } from '../common/constants.js'
import {
  cocPageI18n,
  translateSearchResultCount
} from '../common/locale-strings.js'
import { getSessionUser } from '#server/common/helpers/get-session-user.js'
import { getRegulatorCountryCode } from '#server/common/helpers/regulator-country-code.js'
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

// The page number now reaches the API rather than being applied to an in-memory
// slice, so a junk value has to be resolved here. `?page=abc` used to slice to
// an empty array and render an empty page; unguarded it would become a 400.
export const parsePageNumber = (raw) => {
  const page = Number.parseInt(raw, 10)
  return Number.isFinite(page) && page >= 1 ? page : 1
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

function redirectUnauthenticated(request, h, locale) {
  persistAuthLocale(request, locale)
  const localPath = request.url.pathname + request.url.search
  request.yar.set('returnTo', withForwardedPrefix(request, localPath))
  const signinUrl = getProxyPrefix(request)
    ? withForwardedPrefix(request, '/signin-oidc')
    : '/signin-oidc'
  return redirectWithLocale(h, request, signinUrl)
}

function validateListParams(type, submissionStatus) {
  if (!['direct-producers', 'compliance-schemes'].includes(type)) {
    throw Boom.badRequest(`Invalid organisation type: ${type}`)
  }
  if (!['pending', 'accepted', 'not-submitted'].includes(submissionStatus)) {
    throw Boom.badRequest(`Invalid submission status: ${submissionStatus}`)
  }
}

function buildListViewData(
  viewModel,
  search,
  { locale, i18n, searchTerm, errors, type, submissionStatus, routePrefix }
) {
  const url = bindLocaleUrl(locale)
  const errorPrefix = translate(locale, 'common.errorPrefix')
  return {
    ...viewModel,
    locale,
    i18n,
    searchTerm,
    errors,
    isSearch: search !== null,
    searchItems: search?.items ?? [],
    searchResultCount: search?.total ?? 0,
    searchResultLabel: translateSearchResultCount(locale, search?.total ?? 0),
    searchTruncated: search?.truncated ?? false,
    clearSearchUrl: url(
      `${routePrefix || '/'}?type=${type}&tab=${submissionStatus}`
    ),
    pageTitle: errors ? `${errorPrefix}${viewModel.heading}` : viewModel.heading
  }
}

export const certificatesOfComplianceController = {
  async handler(request, h) {
    const locale = getLocale(request)

    if (!request.yar.get('user')) {
      return redirectUnauthenticated(request, h, locale)
    }

    const {
      type = 'direct-producers',
      tab: submissionStatus = 'pending',
      page = '1'
    } = request.query

    validateListParams(type, submissionStatus)

    const { sortColumn, sortDirection } = resolveSortForSubmissionStatus(
      request,
      submissionStatus,
      type
    )

    const { searchTerm, errors } = parseSearchTerm(request.query.search, locale)
    const traceId = request.headers[config.get('tracing.header')]
    const routePrefix = getForwardedPrefix(request)
    const sessionUser = getSessionUser(request)
    const country = getRegulatorCountryCode(sessionUser)

    if (country == null && sessionUser != null) {
      request.logger.warn(
        'Session user has no mapped nationId; obligations list will not be filtered by country'
      )
    }

    const [viewModel, search] = await Promise.all([
      getCertificatesOfComplianceViewModel(
        type,
        submissionStatus,
        parsePageNumber(page),
        sortColumn,
        sortDirection,
        { traceId, locale, routePrefix, country }
      ),
      searchTerm
        ? getComplianceSearchResults(type, searchTerm, traceId, country)
        : null
    ]).catch((error) => {
      handleApiError(request, error)
      throw error
    })

    const i18n = cocPageI18n(locale, 'list')

    return h
      .view(
        'certificatesOfCompliance/list/index',
        buildListViewData(viewModel, search, {
          locale,
          i18n,
          searchTerm,
          errors,
          type,
          submissionStatus,
          routePrefix
        })
      )
      .header('Cache-Control', 'no-cache, no-store, must-revalidate')
  }
}
