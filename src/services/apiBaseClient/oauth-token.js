const TOKEN_BUFFER_SECONDS = 60
const DEFAULT_TOKEN_EXPIRES_IN_SECONDS = 3600
const MIN_TOKEN_TTL_MS = 1000

// App-level (client_credentials) tokens are not user-specific, so a per-process
// cache keyed by clientId:scope is safe and avoids a token request per call.
const tokenCache = new Map()
const refreshPromises = new Map()

function buildCacheKey(clientId, scope) {
  return ['oauth-token', clientId, scope].join(':')
}

function assertOAuthOptions({ clientId, clientSecret, scope, tokenEndpoint }) {
  const missing = []
  if (!clientId) missing.push('clientId')
  if (!clientSecret) missing.push('clientSecret')
  if (!scope) missing.push('scope')
  if (!tokenEndpoint) missing.push('tokenEndpoint')

  if (missing.length > 0) {
    throw new Error(
      `OAuth bearer auth is missing required options (${missing.join(', ')})`
    )
  }
}

export async function getServiceOAuthAccessToken(options) {
  assertOAuthOptions(options)

  const cacheKey = buildCacheKey(options.clientId, options.scope)
  const cached = tokenCache.get(cacheKey)

  if (cached && cached.expiresAt > Date.now()) {
    return cached.token
  }

  return refreshAccessToken(cacheKey, options)
}

function refreshAccessToken(cacheKey, options) {
  if (!refreshPromises.has(cacheKey)) {
    refreshPromises.set(
      cacheKey,
      requestToken(cacheKey, options).finally(() => {
        refreshPromises.delete(cacheKey)
      })
    )
  }

  return refreshPromises.get(cacheKey)
}

async function requestToken(
  cacheKey,
  { clientId, clientSecret, scope, tokenEndpoint, fetchImpl = fetch, logger }
) {
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    scope
  })

  const response = await fetchImpl(tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  })

  if (!response.ok) {
    logger?.warn(
      `OAuth client credentials token request failed: status=${response.status}, statusText=${response.statusText}`
    )
    throw new Error(
      `OAuth token request failed (${response.status} ${response.statusText})`
    )
  }

  const data = await response.json()

  if (!data?.access_token) {
    logger?.warn('OAuth token response did not include access_token')
    throw new Error('OAuth token response did not include access_token')
  }

  const expiresInSeconds = Number(
    data.expires_in ?? DEFAULT_TOKEN_EXPIRES_IN_SECONDS
  )
  const ttlMs = Math.max(
    (expiresInSeconds - TOKEN_BUFFER_SECONDS) * 1000,
    MIN_TOKEN_TTL_MS
  )

  tokenCache.set(cacheKey, {
    token: data.access_token,
    expiresAt: Date.now() + ttlMs
  })

  return data.access_token
}

export function resetServiceOAuthTokenCacheForTests() {
  tokenCache.clear()
  refreshPromises.clear()
}
