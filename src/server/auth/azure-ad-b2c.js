/**
 * Azure AD B2C OpenID Connect helpers (authority URL and end-session / logout).
 */

/** Bell registers the OAuth state cookie as `bell-${provider.name}`. */
export const BELL_AZURE_AD_B2C_COOKIE = 'bell-azure-ad-b2c'

function buildAuthorityFromInstance(cfg) {
  if (!cfg.instance || !cfg.domain || !cfg.userFlow) {
    return null
  }
  const inst = String(cfg.instance).replace(/\/$/, '')
  return `${inst}/${cfg.domain}/${cfg.userFlow}`
}

function buildAuthorityFromTenant(cfg) {
  if (!cfg.tenantName || !cfg.userFlow) {
    return null
  }
  return `https://${cfg.tenantName}.b2clogin.com/${cfg.tenantName}.onmicrosoft.com/${cfg.userFlow}`
}

export function getB2cAuthorityPrefix(cfg) {
  if (!cfg) {
    return null
  }
  return buildAuthorityFromInstance(cfg) ?? buildAuthorityFromTenant(cfg)
}

/**
 * @param {string} authorityPrefix - from {@link getB2cAuthorityPrefix}
 * @param {string} [postLogoutRedirectAbsoluteUrl] - optional `post_logout_redirect_uri` (must be registered in B2C)
 */
export function buildB2cLogoutUrl(
  authorityPrefix,
  postLogoutRedirectAbsoluteUrl
) {
  const base = `${authorityPrefix}/oauth2/v2.0/logout`
  if (!postLogoutRedirectAbsoluteUrl) {
    return base
  }
  const params = new URLSearchParams({
    post_logout_redirect_uri: postLogoutRedirectAbsoluteUrl
  })
  return `${base}?${params.toString()}`
}

function firstForwarded(value) {
  if (!value || typeof value !== 'string') {
    return undefined
  }
  return value.split(',')[0].trim()
}

function isRequestHttps(request) {
  const proto = firstForwarded(request.headers['x-forwarded-proto'])
  return proto === 'https' || request.server.info.protocol === 'https'
}

function upgradeToHttpsIfNeeded(request, url) {
  if (isRequestHttps(request) && url.protocol === 'http:') {
    url.protocol = 'https:'
  }
  return url.href
}

function resolveAbsoluteUrlFromConfiguredRedirect(request, path, redirectUri) {
  const u = new URL(redirectUri)
  upgradeToHttpsIfNeeded(request, u)
  return new URL(path, u.origin).href
}

function resolveAbsoluteUrlFromRequestHost(request, path) {
  const proto =
    firstForwarded(request.headers['x-forwarded-proto']) ||
    request.server.info.protocol
  const host =
    firstForwarded(request.headers['x-forwarded-host']) ||
    request.headers.host ||
    request.info.host
  const scheme = proto === 'https' ? 'https' : 'http'
  return `${scheme}://${host}${path}`
}

/**
 * @param {string} pathOrUrl - path (e.g. `/signed-out`) or absolute URL
 */
function normalizeLogoutPathOrUrl(pathOrUrl) {
  const raw = (pathOrUrl || '/signed-out').trim() || '/signed-out'
  if (/^https?:\/\//i.test(raw)) {
    return { kind: 'absolute', value: raw }
  }
  const path = raw.startsWith('/') ? raw : `/${raw}`
  return { kind: 'path', value: path }
}

/**
 * Absolute URL for `post_logout_redirect_uri`, aligned with Bell redirect_uri base
 * (`AZURE_AD_B2C_REDIRECT_URI` origin when set, else forwarded host/proto, else request URL).
 *
 * @param {import('@hapi/hapi').Request} request
 * @param {string} pathOrUrl - path (e.g. `/signed-out`) or absolute URL
 * @param {object} azureConfig - `config.get('auth.azureAdB2c')`
 */
export function resolvePostLogoutAbsoluteUri(request, pathOrUrl, azureConfig) {
  const normalized = normalizeLogoutPathOrUrl(pathOrUrl)
  if (normalized.kind === 'absolute') {
    return upgradeToHttpsIfNeeded(request, new URL(normalized.value))
  }

  const redirectUri = azureConfig?.redirectUri || ''
  if (/^https?:\/\//i.test(redirectUri)) {
    return resolveAbsoluteUrlFromConfiguredRedirect(
      request,
      normalized.value,
      redirectUri
    )
  }

  return resolveAbsoluteUrlFromRequestHost(request, normalized.value)
}
