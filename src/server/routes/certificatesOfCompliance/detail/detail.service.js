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
  { traceId, bannerFlags = {}, obligationYear, locale = 'en' } = {}
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
    { traceId, obligationYear, locale }
  )

  const i18n = cocPageI18n(locale, 'detail')

  return {
    pageTitle: detail.companyName,
    heading: detail.companyName,
    backlink: localeUrl('/certificates-of-compliance', locale),
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
