import { createWasteObligationsApiService } from '#services/waste-obligations-api.service.js'

export function mapSessionUserToApiUser(sessionUser) {
  if (sessionUser?.id && sessionUser?.email) {
    return {
      id: sessionUser.id,
      email: sessionUser.email,
      name: sessionUser.name ?? 'Unknown'
    }
  }

  return { id: 'mock-user', email: 'mock-user@test.local', name: 'Mock User' }
}

export async function approveComplianceDeclaration(
  organisationId,
  id,
  sessionUser,
  traceId
) {
  const api = createWasteObligationsApiService()
  return api.updateComplianceDeclaration(
    {
      organisationId,
      id,
      status: 'Accepted',
      user: mapSessionUserToApiUser(sessionUser)
    },
    traceId
  )
}
