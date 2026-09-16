import { certificatesOfComplianceDownloadController } from './controller.js'

export const certificatesOfComplianceDownload = {
  plugin: {
    name: 'certificatesOfComplianceDownload',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/download',
          options: {
            auth: false,
            ...certificatesOfComplianceDownloadController
          }
        }
      ])
    }
  }
}
