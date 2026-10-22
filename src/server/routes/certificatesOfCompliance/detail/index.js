import { certificatesOfComplianceDetailController } from './controller.js'
import { SESSION_USER_STRATEGY } from '#server/auth/session-user.js'

export const certificatesOfComplianceDetail = {
  plugin: {
    name: 'certificatesOfComplianceDetail',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/{organisationId}',
          options: {
            auth: SESSION_USER_STRATEGY,
            ...certificatesOfComplianceDetailController
          }
        },
        {
          method: 'GET',
          path: '/{organisationId}/{documentType}/{id}',
          options: {
            auth: SESSION_USER_STRATEGY,
            ...certificatesOfComplianceDetailController
          }
        }
      ])
    }
  }
}
