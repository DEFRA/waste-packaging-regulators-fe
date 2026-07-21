import { config } from '#config/config.js'
import { createWasteObligationsApiService } from '#services/waste-obligations-api.service.js'
import { mapSessionUserToApiUser } from './approve.service.js'

export async function cancelComplianceDeclaration(
  organisationId,
  id,
  sessionUser,
  reason,
  traceId
) {
  if (config.get('useMockApi')) {
    return null
  }

  const api = createWasteObligationsApiService()
  return api.updateComplianceDeclaration(
    {
      organisationId,
      id,
      status: 'Cancelled',
      reason,
      user: mapSessionUserToApiUser(sessionUser)
    },
    traceId
  )
}
