import {
  certificatesOfComplianceAcceptGetController,
  certificatesOfComplianceAcceptPostController
} from './controller.js'
import { SESSION_USER_STRATEGY } from '#server/auth/session-user.js'

export const certificatesOfComplianceAccept = {
  plugin: {
    name: 'certificatesOfComplianceAccept',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/{organisationId}/{documentType}/{id}/accept',
          options: {
            auth: SESSION_USER_STRATEGY,
            ...certificatesOfComplianceAcceptGetController
          }
        },
        {
          method: 'POST',
          path: '/{organisationId}/{documentType}/{id}/accept',
          options: {
            auth: SESSION_USER_STRATEGY,
            ...certificatesOfComplianceAcceptPostController
          }
        }
      ])
    }
  }
}
