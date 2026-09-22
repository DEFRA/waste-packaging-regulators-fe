import { createAccountApiService } from '#services/account-api.service.js'
import { createWasteObligationsApiService } from '#services/waste-obligations-api.service.js'
import { createWasteOrganisationsApiService } from '#services/waste-organisations-api.service.js'
import { localeUrl } from '#server/common/helpers/i18n/locale-url.js'
import { translate } from '#server/common/helpers/i18n/translate.js'
import { buildCertificateSuccessBanner } from '../actions/detail-actions.js'
import { cocPageI18n } from '../common/locale-strings.js'
import { getDeclarationDetail } from './detail-fetch.service.js'

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
    tab
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
    pageTitle: detail.companyName,
    heading: detail.companyName,
    backlink: localeUrl(backlinkPath, locale),
    backlinkText: translate(
      locale,
      'certificatesOfCompliance.detail.backlinkText'
    ),
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
