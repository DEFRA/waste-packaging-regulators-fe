import { certificatesOfComplianceController } from './controller.js'
import { SESSION_USER_STRATEGY } from '#server/auth/session-user.js'

export const certificatesOfComplianceList = {
  plugin: {
    name: 'certificatesOfCompliance',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/',
          options: {
            auth: SESSION_USER_STRATEGY,
            ...certificatesOfComplianceController
          }
        }
      ])
    }
  }
}
