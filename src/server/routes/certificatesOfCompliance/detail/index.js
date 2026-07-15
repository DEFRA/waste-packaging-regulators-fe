import { certificatesOfComplianceDetailController } from './controller.js'
import { certificatesOfComplianceCancelController } from './actions-controller.js'

export const certificatesOfComplianceDetail = {
  plugin: {
    name: 'certificatesOfComplianceDetail',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/{organisationId}/certificates-of-compliance/{id?}',
          options: {
            auth: false,
            ...certificatesOfComplianceDetailController
          }
        },
        {
          method: 'POST',
          path: '/{organisationId}/certificates-of-compliance/{id}/cancel',
          options: {
            auth: false,
            ...certificatesOfComplianceCancelController
          }
        }
      ])
    }
  }
}
