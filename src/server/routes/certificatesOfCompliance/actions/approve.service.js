import { config } from '#config/config.js'
import { createWasteObligationsApiService } from '#services/waste-obligations-api.service.js'

const GUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isGuid(value) {
  return typeof value === 'string' && GUID_PATTERN.test(value.trim())
}

function resolveSessionUserId(sessionUser) {
  const candidates = [
    sessionUser?.id,
    sessionUser?.profile?.oid,
    sessionUser?.profile?.sub
  ]

  return candidates.find(isGuid)
}

function resolveSessionUserEmail(sessionUser) {
  const email =
    sessionUser?.email ??
    sessionUser?.profile?.email ??
    sessionUser?.profile?.emails?.[0] ??
    sessionUser?.contactEmail

  return typeof email === 'string' && email.trim() ? email.trim() : undefined
}

function resolveSessionUserName(sessionUser) {
  if (sessionUser?.name?.trim()) {
    return sessionUser.name.trim()
  }

  const fromParts = [sessionUser?.firstName, sessionUser?.lastName]
    .filter(Boolean)
    .join(' ')
    .trim()

  return fromParts || 'Unknown'
}

export function mapSessionUserToApiUser(sessionUser) {
  const id = resolveSessionUserId(sessionUser)
  const email = resolveSessionUserEmail(sessionUser)

  if (id && email) {
    return {
      id,
      email,
      name: resolveSessionUserName(sessionUser)
    }
  }

  if (config.get('useMockApi')) {
    return { id: 'mock-user', email: 'mock-user@test.local', name: 'Mock User' }
  }

  throw new Error(
    'Cannot resolve regulator user id and email for obligations API — sign in again'
  )
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
