import { config } from '#config/config.js'
import { getLocale } from '#server/common/helpers/i18n/get-locale.js'
import { getForwardedPrefix } from '#server/common/helpers/proxy/forwarded-prefix.js'
import {
  getDeclarationSessionKey,
  readAndClearCertificateActionBannerFlags
} from '../actions/session.service.js'
import { getCertificateOfComplianceDetailViewModel } from './detail.service.js'

function parseObligationYearQuery(value) {
  if (value == null || value === '') {
    return undefined
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

export const certificatesOfComplianceDetailController = {
  async handler(request, h) {
    const { organisationId, id } = request.params
    const traceId = request.headers[config.get('tracing.header')]
    const { type, tab, obligationYear: queryObligationYear } = request.query
    const obligationYear =
      id == null ? parseObligationYearQuery(queryObligationYear) : undefined
    const locale = getLocale(request)
    const declarationKey = getDeclarationSessionKey(organisationId, id)
    const bannerFlags = readAndClearCertificateActionBannerFlags(
      request.yar,
      declarationKey
    )

    const viewModel = await getCertificateOfComplianceDetailViewModel(
      organisationId,
      id,
      {
        traceId,
        bannerFlags,
        obligationYear,
        locale,
        routePrefix: getForwardedPrefix(request),
        type,
        tab
      }
    )

    return h
      .view('certificatesOfCompliance/detail/index', viewModel)
      .header('Cache-Control', 'no-cache, no-store, must-revalidate')
  }
}
