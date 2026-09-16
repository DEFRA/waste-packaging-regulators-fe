import { certificatesOfComplianceDetailController } from './controller.js'

export const certificatesOfComplianceDetail = {
  plugin: {
    name: 'certificatesOfComplianceDetail',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/{organisationId}',
          options: {
            auth: false,
            ...certificatesOfComplianceDetailController
          }
        },
        {
          method: 'GET',
          path: '/{organisationId}/{documentType}/{id}',
          options: {
            auth: false,
            ...certificatesOfComplianceDetailController
          }
        }
      ])
    }
  }
}
