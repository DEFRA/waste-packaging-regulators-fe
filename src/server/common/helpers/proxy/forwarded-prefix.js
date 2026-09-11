/**
 * Returns the external path prefix supplied by a trusted reverse proxy.
 *
 * The proxy must remove any client-supplied X-Forwarded-Prefix header and set
 * a single value of its own. Invalid values are ignored so they cannot alter
 * a redirect target.
 *
 * @param {import('@hapi/hapi').Request} request
 * @returns {string}
 */
export function getForwardedPrefix(request) {
  const rawPrefix = request?.headers?.['x-forwarded-prefix']

  if (typeof rawPrefix !== 'string') {
    return ''
  }

  const prefix = removeTrailingSlashes(rawPrefix.trim())

  if (!prefix || prefix === '/') {
    return ''
  }

  const segments = prefix.slice(1).split('/')
  const isValid =
    prefix.startsWith('/') &&
    !prefix.startsWith('//') &&
    segments.every(
      (segment) =>
        /^[A-Za-z0-9._~-]+$/.test(segment) &&
        segment !== '.' &&
        segment !== '..'
    )

  return isValid ? prefix : ''
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

  if (
    !prefix ||
    typeof pathOrUrl !== 'string' ||
    !pathOrUrl.startsWith('/') ||
    pathOrUrl.startsWith('//')
  ) {
    return pathOrUrl
  }

  return `${prefix}${pathOrUrl}`
}
