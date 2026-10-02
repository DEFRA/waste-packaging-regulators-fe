import { createAccountApiService } from '#services/account-api.service.js'
import { createWasteObligationsApiService } from '#services/waste-obligations-api.service.js'
import { createWasteOrganisationsApiService } from '#services/waste-organisations-api.service.js'
import { localeUrl } from '#server/common/helpers/i18n/locale-url.js'
import { translate } from '#server/common/helpers/i18n/translate.js'
import { buildCertificateSuccessBanner } from '../actions/detail-actions.js'
import { cocPageI18n } from '../common/locale-strings.js'
import { getDeclarationDetail } from './detail-fetch.service.js'

const DETAIL_PATH_PATTERN =
  /^\/[^/]+\/(certificate|statement)\/[^/?#]+(?:\?[^#]*)?$/i

/**
 * Validates a relative return path from a history View submission link.
 *
 * @param {string|undefined} fromDetail
 * @param {string} [routePrefix]
 * @returns {string|null}
 */
export function validateFromDetailPath(fromDetail, routePrefix = '') {
  if (typeof fromDetail !== 'string' || !fromDetail.trim()) {
    return null
  }

  const path = fromDetail.trim()
  if (!path.startsWith('/') || path.includes('://') || path.includes('..')) {
    return null
  }

  if (routePrefix) {
    const prefix = routePrefix.replace(/\/$/, '')
    if (path !== prefix && !path.startsWith(`${prefix}/`)) {
      return null
    }
    return path
  }

  if (!DETAIL_PATH_PATTERN.test(path)) {
    return null
  }

  return path
}

export function buildDetailBacklink({
  type,
  tab,
  fromDetail,
  locale = 'en',
  routePrefix = ''
}) {
  const validatedFromDetail = validateFromDetailPath(fromDetail, routePrefix)

  if (validatedFromDetail) {
    return {
      backlink: localeUrl(validatedFromDetail, locale),
      backlinkText: translate(locale, 'common.nav.back')
    }
  }

  const backlinkQueryParams = new URLSearchParams()
  if (type) {
    backlinkQueryParams.append('type', type)
  }
  if (tab) {
    backlinkQueryParams.append('tab', tab)
  }

  const queryString = backlinkQueryParams.toString()
  const backlinkPath = queryString
    ? `${routePrefix || '/'}?${queryString}`
    : routePrefix || '/'

  return {
    backlink: localeUrl(backlinkPath, locale),
    backlinkText: translate(
      locale,
      'certificatesOfCompliance.detail.backlinkText'
    )
  }
}

export async function getCertificateOfComplianceDetailViewModel(
  organisationId,
  id,
  {
    traceId,
    bannerFlags = {},
    obligationYear,
    locale = 'en',
    routePrefix = '',
    type,
    tab,
    fromDetail
  } = {}
) {
  const obligationsApi = createWasteObligationsApiService()
  const organisationsApi = createWasteOrganisationsApiService()
  const accountApi = createAccountApiService()

  const detail = await getDeclarationDetail(
    obligationsApi,
    organisationsApi,
    accountApi,
    organisationId,
    id,
    { traceId, obligationYear, locale, routePrefix, type, tab }
  )

  const i18n = cocPageI18n(locale, 'detail')

  const { backlink, backlinkText } = buildDetailBacklink({
    type,
    tab,
    fromDetail,
    locale,
    routePrefix
  })

  return {
    pageTitle: detail.companyName,
    heading: detail.companyName,
    backlink,
    backlinkText,
    successBanner: buildCertificateSuccessBanner(
      bannerFlags,
      detail.registrationType,
      locale
    ),
    locale,
    i18n,
    ...detail
  }
}
