import {
  certificatesOfComplianceCancelReasonGetController,
  certificatesOfComplianceCancelReasonPostController,
  certificatesOfComplianceCancelCheckGetController,
  certificatesOfComplianceCancelEmailPreviewGetController,
  certificatesOfComplianceCancelPostController
} from './controller.js'

export const certificatesOfComplianceCancel = {
  plugin: {
    name: 'certificatesOfComplianceCancel',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/{organisationId}/certificates-of-compliance/{id}/cancel/reason',
          options: {
            ...certificatesOfComplianceCancelReasonGetController
          }
        },
        {
          method: 'POST',
          path: '/{organisationId}/certificates-of-compliance/{id}/cancel/reason',
          options: {
            ...certificatesOfComplianceCancelReasonPostController
          }
        },
        {
          method: 'GET',
          path: '/{organisationId}/certificates-of-compliance/{id}/cancel/check',
          options: {
            ...certificatesOfComplianceCancelCheckGetController
          }
        },
        {
          method: 'GET',
          path: '/{organisationId}/certificates-of-compliance/{id}/cancel/email-preview',
          options: {
            ...certificatesOfComplianceCancelEmailPreviewGetController
          }
        },
        {
          method: 'POST',
          path: '/{organisationId}/certificates-of-compliance/{id}/cancel',
          options: {
            ...certificatesOfComplianceCancelPostController
          }
        }
      ])
    }
  }
}
