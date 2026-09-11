import {
  certificatesOfComplianceAcceptGetController,
  certificatesOfComplianceAcceptPostController
} from './controller.js'

export const certificatesOfComplianceAccept = {
  plugin: {
    name: 'certificatesOfComplianceAccept',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/{organisationId}/{documentType}/{id}/accept',
          options: {
            auth: false,
            ...certificatesOfComplianceAcceptGetController
          }
        },
        {
          method: 'POST',
          path: '/{organisationId}/{documentType}/{id}/accept',
          options: {
            auth: false,
            ...certificatesOfComplianceAcceptPostController
          }
        }
      ])
    }
  }
}
