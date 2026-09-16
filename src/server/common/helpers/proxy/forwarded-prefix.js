function isEmptyOrRootPrefix(prefix) {
  return !prefix || prefix === '/'
}

function isValidPrefixFormat(prefix) {
  const segments = prefix.slice(1).split('/')
  return (
    prefix.startsWith('/') &&
    !prefix.startsWith('//') &&
    segments.every(
      (segment) =>
        /^[A-Za-z0-9._~-]+$/.test(segment) &&
        segment !== '.' &&
        segment !== '..'
    )
  )
}

function validatePrefix(raw) {
  const prefix = removeTrailingSlashes(raw.trim())

  if (isEmptyOrRootPrefix(prefix)) {
    return ''
  }

  return isValidPrefixFormat(prefix) ? prefix : ''
}

function hasForwardedPrefixHeader(request) {
  return typeof request?.headers?.['x-forwarded-prefix'] === 'string'
}

function isCertificatesOfCompliancePath(path) {
  return (
    path === '/certificates-of-compliance' ||
    path.startsWith('/certificates-of-compliance/')
  )
}

/**
 * Returns the external path prefix, either from the X-Forwarded-Prefix header
 * set by a trusted reverse proxy, or inferred from the request path when the
 * app is accessed directly without a proxy.
 *
 * The proxy must remove any client-supplied X-Forwarded-Prefix header and set
 * a single value of its own. Invalid values are ignored so they cannot alter
 * a redirect target.
 *
 * @param {import('@hapi/hapi').Request} request
 * @returns {string}
 */
export function getForwardedPrefix(request) {
  if (hasForwardedPrefixHeader(request)) {
    return validatePrefix(request.headers['x-forwarded-prefix'])
  }

  // No proxy header — the app is being accessed directly without a YARP proxy
  // in front. Infer the prefix from the request path so URL generation stays
  // correct whether tests run against the app directly or through the proxy.
  if (isCertificatesOfCompliancePath(request?.path ?? '')) {
    return '/certificates-of-compliance'
  }

  return ''
}

/**
 * Returns the prefix from the X-Forwarded-Prefix header only, with no path
 * inference fallback. Use this when the prefix must only be applied for
 * requests that genuinely passed through the reverse proxy — for example,
 * auth redirect URLs that are only reachable via the proxied path and have no
 * alias under the prefix when the app is accessed directly.
 *
 * @param {import('@hapi/hapi').Request} request
 * @returns {string}
 */
export function getProxyPrefix(request) {
  if (hasForwardedPrefixHeader(request)) {
    return validatePrefix(request.headers['x-forwarded-prefix'])
  }
  return ''
}

/**
 * Removes trailing slashes without a regular expression so a long invalid
 * header cannot trigger backtracking while it is being validated.
 *
 * @param {string} path
 * @returns {string}
 */
function removeTrailingSlashes(path) {
  let end = path.length

  while (path[end - 1] === '/') {
    end -= 1
  }

  return path.slice(0, end)
}

function shouldSkipPrefix(prefix, pathOrUrl) {
  return (
    !prefix ||
    typeof pathOrUrl !== 'string' ||
    !pathOrUrl.startsWith('/') ||
    pathOrUrl.startsWith('//')
  )
}

function alreadyHasPrefix(pathOrUrl, prefix) {
  return (
    pathOrUrl === prefix ||
    pathOrUrl.startsWith(`${prefix}/`) ||
    pathOrUrl.startsWith(`${prefix}?`) ||
    pathOrUrl.startsWith(`${prefix}#`)
  )
}

function isRootPath(pathOrUrl) {
  return (
    pathOrUrl === '/' ||
    pathOrUrl.startsWith('/?') ||
    pathOrUrl.startsWith('/#')
  )
}

/**
 * Scopes a Hapi cookie definition to the external path prefix supplied by a
 * trusted reverse proxy. When the service is called directly, the cookie's
 * existing path is preserved.
 *
 * Uses getProxyPrefix (header-only) rather than getForwardedPrefix so that
 * direct access to /certificates-of-compliance/... does not incorrectly scope
 * cookies to the prefix.
 *
 * @param {{ path?: string | null }} definition
 * @param {import('@hapi/hapi').Request} request
 */
export function applyForwardedPrefixToCookiePath(definition, request) {
  const prefix = getProxyPrefix(request)

  if (prefix) {
    definition.path = prefix
  }
}

/**
 * Adds the proxy's external path prefix to an application-local rooted URL.
 * Absolute and protocol-relative URLs are deliberately left unchanged.
 *
 * @param {import('@hapi/hapi').Request} request
 * @param {string} pathOrUrl
 * @returns {string}
 */
export function withForwardedPrefix(request, pathOrUrl) {
  const prefix = getForwardedPrefix(request)

  if (shouldSkipPrefix(prefix, pathOrUrl)) {
    return pathOrUrl
  }

  // Idempotency: path already carries the prefix (direct-access scenario where
  // the full prefixed path is the request path). Return unchanged to avoid a
  // double-prefix such as /certificates-of-compliance/certificates-of-compliance.
  if (alreadyHasPrefix(pathOrUrl, prefix)) {
    return pathOrUrl
  }

  // Root path (optionally with query/hash): collapse /prefix/ → /prefix.
  if (isRootPath(pathOrUrl)) {
    return prefix + pathOrUrl.slice(1)
  }

  return `${prefix}${pathOrUrl}`
}
