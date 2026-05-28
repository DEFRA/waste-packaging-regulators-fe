import { certificatesOfComplianceController } from './controller.js'

export const certificatesOfCompliance = {
  plugin: {
    name: 'certificatesOfCompliance',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/certificates-of-compliance',
          ...certificatesOfComplianceController
        }
      ])
    }
  }
}
