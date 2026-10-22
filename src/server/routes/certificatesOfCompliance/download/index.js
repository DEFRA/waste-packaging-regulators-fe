import { certificatesOfComplianceDownloadController } from './controller.js'
import { SESSION_USER_STRATEGY } from '#server/auth/session-user.js'

export const certificatesOfComplianceDownload = {
  plugin: {
    name: 'certificatesOfComplianceDownload',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/download',
          options: {
            auth: SESSION_USER_STRATEGY,
            ...certificatesOfComplianceDownloadController
          }
        }
      ])
    }
  }
}
