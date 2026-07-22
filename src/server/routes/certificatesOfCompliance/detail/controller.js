import { config } from '#config/config.js'
import { handleApiError } from '#server/common/helpers/handle-api-error.js'
import {
  getDeclarationSessionKey,
  readAndClearCertificateActionBannerFlags
} from '../actions/session.service.js'
import { getCertificateOfComplianceDetailViewModel } from './detail.service.js'
import { redirectToSignIn } from './actions-controller.js'

function parseObligationYearQuery(value) {
  if (value == null || value === '') {
    return undefined
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

export const certificatesOfComplianceDetailController = {
  async handler(request, h) {
    if (!request.yar.get('user')) {
      return redirectToSignIn(request, h)
    }

    const { organisationId, id } = request.params
    const traceId = request.headers[config.get('tracing.header')]
    const obligationYear =
      id == null
        ? parseObligationYearQuery(request.query.obligationYear)
        : undefined
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
        session: request.yar,
        obligationYear
      }
    ).catch((error) => {
      handleApiError(request, error)
      throw error
    })

    return h.view('certificatesOfCompliance/detail/index', viewModel)
  }
}
