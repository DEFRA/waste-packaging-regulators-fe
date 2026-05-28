import { getCertificatesOfComplianceViewModel } from './certificates-of-compliance.service.js'

export const certificatesOfComplianceController = {
  async handler(request, h) {
    const {
      type = 'compliance-schemes',
      tab = 'pending',
      page = '1'
    } = request.query

    const viewModel = await getCertificatesOfComplianceViewModel(
      type,
      tab,
      parseInt(page, 10)
    )

    return h.view('certificatesOfCompliance/index', viewModel)
  }
}
