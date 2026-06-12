import { certificatesOfComplianceController } from './controller.js'

export const certificatesOfComplianceList = {
  plugin: {
    name: 'certificatesOfCompliance',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/certificates-of-compliance',
          options: {
            auth: false,
            ...certificatesOfComplianceController
          }
        }
      ])
    }
  }
}
