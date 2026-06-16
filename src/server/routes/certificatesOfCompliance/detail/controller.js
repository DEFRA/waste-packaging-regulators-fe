import { config } from '#/config/config.js'
import { getCertificateOfComplianceDetailViewModel } from '../certificates-of-compliance.service.js'

export const certificatesOfComplianceDetailController = {
  async handler(request, h) {
    if (!request.yar.get('user')) {
      request.yar.set('returnTo', request.url.pathname + request.url.search)
      return h.redirect('/signin-oidc')
    }

    const { organisationId, id } = request.params
    const traceId = request.headers[config.get('tracing.header')]

    const viewModel = await getCertificateOfComplianceDetailViewModel(
      organisationId,
      id,
      traceId
    )

    const acceptSuccess = request.yar.flash('acceptSuccess').length > 0

    return h.view('certificatesOfCompliance/detail/index', {
      ...viewModel,
      organisationId,
      id,
      acceptSuccess
    })
  }
}
