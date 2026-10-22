import {
  certificatesOfComplianceCancelReasonGetController,
  certificatesOfComplianceCancelReasonPostController,
  certificatesOfComplianceCancelCheckGetController,
  certificatesOfComplianceCancelEmailPreviewGetController,
  certificatesOfComplianceCancelGetController,
  certificatesOfComplianceCancelPostController
} from './controller.js'
import { SESSION_USER_STRATEGY } from '#server/auth/session-user.js'

export const certificatesOfComplianceCancel = {
  plugin: {
    name: 'certificatesOfComplianceCancel',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/{organisationId}/{documentType}/{id}/cancel/reason',
          options: {
            auth: SESSION_USER_STRATEGY,
            ...certificatesOfComplianceCancelReasonGetController
          }
        },
        {
          method: 'POST',
          path: '/{organisationId}/{documentType}/{id}/cancel/reason',
          options: {
            auth: SESSION_USER_STRATEGY,
            ...certificatesOfComplianceCancelReasonPostController
          }
        },
        {
          method: 'GET',
          path: '/{organisationId}/{documentType}/{id}/cancel/check',
          options: {
            auth: SESSION_USER_STRATEGY,
            ...certificatesOfComplianceCancelCheckGetController
          }
        },
        {
          method: 'GET',
          path: '/{organisationId}/{documentType}/{id}/cancel/email-preview',
          options: {
            auth: SESSION_USER_STRATEGY,
            ...certificatesOfComplianceCancelEmailPreviewGetController
          }
        },
        {
          method: 'GET',
          path: '/{organisationId}/{documentType}/{id}/cancel',
          options: {
            auth: SESSION_USER_STRATEGY,
            ...certificatesOfComplianceCancelGetController
          }
        },
        {
          method: 'POST',
          path: '/{organisationId}/{documentType}/{id}/cancel',
          options: {
            auth: SESSION_USER_STRATEGY,
            ...certificatesOfComplianceCancelPostController
          }
        }
      ])
    }
  }
}
