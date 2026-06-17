import { config } from '#/config/config.js'
import { handleApiError } from '#/server/common/helpers/handle-api-error.js'
import {
  getCertificateOfComplianceDetailViewModel,
  getDeclarationSessionKey,
  mockSummary,
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
    const obligationYear =
      request.query.obligationYear ?? mockSummary.complianceYear
    const declarationKey = getDeclarationSessionKey(organisationId, id)
    const bannerFlags = readAndClearCertificateActionBannerFlags(
      request.yar,
      declarationKey
    )

    try {
      const viewModel = await getCertificateOfComplianceDetailViewModel(
        organisationId,
        id,
        {
          traceId,
          bannerFlags,
          session: request.yar,
          obligationYear
        }
      )

      return h.view('certificatesOfCompliance/detail/index', viewModel)
    } catch (error) {
      handleApiError(request, error)
    }
  }
}
