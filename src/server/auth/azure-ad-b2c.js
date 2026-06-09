/**
 * Azure AD B2C OpenID Connect helpers (authority URL and end-session / logout).
 */

/** Bell registers the OAuth state cookie as `bell-${provider.name}`. */
export const BELL_AZURE_AD_B2C_COOKIE = 'bell-azure-ad-b2c'

/**
 * Policy-scoped authority prefix used for B2C logout:
 * `{instance}/{domain}/{userFlow}` or `https://{tenant}.b2clogin.com/...`
 */
export function getB2cAuthorityPrefix(cfg) {
  if (!cfg) return null
  if (cfg.instance && cfg.domain && cfg.userFlow) {
    const inst = String(cfg.instance).replace(/\/$/, '')
    return `${inst}/${cfg.domain}/${cfg.userFlow}`
  }
  if (cfg.tenantName && cfg.userFlow) {
    return `https://${cfg.tenantName}.b2clogin.com/${cfg.tenantName}.onmicrosoft.com/${cfg.userFlow}`
  }
  return null
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
  if (!value || typeof value !== 'string') return undefined
  return value.split(',')[0].trim()
}

function isRequestHttps(request) {
  const proto = firstForwarded(request.headers['x-forwarded-proto'])
  if (proto === 'https') return true
  return request.server.info.protocol === 'https'
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
  const raw = (pathOrUrl || '/signed-out').trim() || '/signed-out'
  if (/^https?:\/\//i.test(raw)) {
    const u = new URL(raw)
    if (isRequestHttps(request) && u.protocol === 'http:') {
      u.protocol = 'https:'
    }
    return u.href
  }
  const path = raw.startsWith('/') ? raw : `/${raw}`
  const redirectUri = azureConfig?.redirectUri || ''
  if (/^https?:\/\//i.test(redirectUri)) {
    const u = new URL(redirectUri)
    if (isRequestHttps(request) && u.protocol === 'http:') {
      u.protocol = 'https:'
    }
    return new URL(path, u.origin).href
  }
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
