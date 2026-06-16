import { config } from '#/config/config.js'
import {
  getCertificateOfComplianceDetailViewModel,
  getDeclarationSessionKey,
  readAndClearCertificateActionBannerFlags
} from '../certificates-of-compliance.service.js'
import { redirectToSignIn } from './actions-controller.js'

export const certificatesOfComplianceDetailController = {
  async handler(request, h) {
    if (!request.yar.get('user')) {
      return redirectToSignIn(request, h)
    }

    const { organisationId, id } = request.params
    const traceId = request.headers[config.get('tracing.header')]
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
        session: request.yar
      }
    )

    return h.view('certificatesOfCompliance/detail/index', viewModel)
  }
}
