import { config } from '#config/config.js'
import { getCertificatesOfComplianceViewModel } from './list.service.js'

export const certificatesOfComplianceController = {
  async handler(request, h) {
    if (!request.yar.get('user')) {
      request.yar.set('returnTo', request.url.pathname + request.url.search)
      return h.redirect('/signin-oidc')
    }

    const {
      type = 'direct-producers',
      tab = 'pending',
      page = '1',
      sortColumn = tab !== 'not-submitted' ? 'dateSubmitted' : type === 'direct-producers' ? 'obligationCoveragePercentage' : 'recyclingObligationsMet',
      sortDirection = 'descending'
    } = request.query

    const traceId = request.headers[config.get('tracing.header')]

    const viewModel = await getCertificatesOfComplianceViewModel(
      type,
      tab,
      Number.parseInt(page, 10),
      sortColumn,
      sortDirection,
      traceId
    )

    return h.view('certificatesOfCompliance/list/index', viewModel)
  }
}
