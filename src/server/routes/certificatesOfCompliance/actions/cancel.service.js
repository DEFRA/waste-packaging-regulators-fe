import { createWasteObligationsApiService } from '#services/waste-obligations-api.service.js'
import { mapSessionUserToApiUser } from './approve.service.js'
import { buildCancellationNotificationParameters } from './cancellation-notification-parameters.js'

export async function cancelComplianceDeclaration(
  organisationId,
  id,
  sessionUser,
  reason,
  traceId,
  { registrationType, environmentalRegulator } = {}
) {
  const api = createWasteObligationsApiService()
  const notificationParameters = buildCancellationNotificationParameters({
    registrationType,
    environmentalRegulator
  })

  return api.updateComplianceDeclaration(
    {
      organisationId,
      id,
      status: 'Cancelled',
      reason,
      user: mapSessionUserToApiUser(sessionUser),
      notification: { parameters: notificationParameters }
    },
    traceId
  )
}
