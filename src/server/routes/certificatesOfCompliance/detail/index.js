import { certificatesOfComplianceDetailController } from './controller.js'

export const certificatesOfComplianceDetail = {
  plugin: {
    name: 'certificatesOfComplianceDetail',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/{organisationId}/certificates-of-compliance/{id}',
          options: {
            auth: false,
            ...certificatesOfComplianceDetailController
          }
        }
      ])
    }
  }
}
