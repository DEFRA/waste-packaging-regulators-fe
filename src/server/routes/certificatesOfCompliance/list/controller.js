import { config } from '#config/config.js'
import { getCertificatesOfComplianceViewModel } from './list.service.js'

export const getDefaultSortColumn = (tab, type) => {
  if (tab !== 'not-submitted') {
    return 'dateSubmitted'
  }
  return type === 'direct-producers'
    ? 'obligationCoveragePercentage'
    : 'recyclingObligationsMet'
}

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
      sortDirection = 'desc'
    } = request.query
    const sortColumn =
      request.query.sortColumn || getDefaultSortColumn(tab, type)

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
