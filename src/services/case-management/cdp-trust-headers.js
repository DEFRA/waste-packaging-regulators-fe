import { createHmac, randomBytes } from 'node:crypto'

import { getRegulatorCaseManagementNation } from '#server/common/helpers/regulator-case-management-nation.js'

function textOrEmpty(value) {
  return value == null ? '' : String(value)
}

function buildV3ExtendedSignaturePayload({
  clientId,
  userId,
  userName,
  userNation,
  userEmail,
  timestamp,
  nonce
}) {
  return [
    'v3',
    clientId,
    userId,
    userName,
    '',
    userNation,
    userEmail,
    timestamp,
    nonce
  ].join('\n')
}

export function buildCaseManagementTrustHeaders({
  sessionUser,
  clientId,
  sharedSecret
}) {
  const nation = getRegulatorCaseManagementNation(sessionUser)
  const userId = textOrEmpty(sessionUser?.id)
  const userName = textOrEmpty(sessionUser?.name)
  const userEmail = textOrEmpty(sessionUser?.email)

  const headers = {
    'x-cdp-client-id': clientId,
    'x-cdp-user-id': userId,
    'x-cdp-user-name': userName,
    'x-cdp-user-nation': nation ?? '',
    'x-cdp-user-email': userEmail
  }

  const secret = textOrEmpty(sharedSecret)
  if (!secret) {
    return headers
  }

  const timestamp = new Date().toISOString()
  const nonce = `${Date.now()}-${randomBytes(8).toString('base64url')}`
  const payload = buildV3ExtendedSignaturePayload({
    clientId,
    userId,
    userName,
    userNation: nation ?? '',
    userEmail,
    timestamp,
    nonce
  })
  const signature = createHmac('sha256', secret)
    .update(payload)
    .digest('base64')

  return {
    ...headers,
    'x-cdp-auth-timestamp': timestamp,
    'x-cdp-auth-nonce': nonce,
    'x-cdp-auth-signature': signature
  }
}
