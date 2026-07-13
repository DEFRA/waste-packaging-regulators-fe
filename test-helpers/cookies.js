/**
 * Helpers for carrying cookies between injected requests in tests.
 *
 * Two cookies matter once CSRF protection is enabled: the yar `session`
 * cookie and the `CSRFToken` crumb cookie. Selecting them by name (rather
 * than by Set-Cookie index) keeps tests robust to cookie ordering.
 */

/** Return the `name=value` pair for a named cookie from a Set-Cookie header. */
function pickCookie(setCookie, name) {
  return (setCookie ?? [])
    .find((cookie) => cookie.startsWith(`${name}=`))
    ?.split(';')[0]
}

/** The yar session cookie (`session=...`) from a response. */
export function sessionCookieFromResponse(response) {
  return pickCookie(response.headers['set-cookie'], 'session')
}

/** The crumb cookie (`CSRFToken=...`) from a response. */
export function csrfTokenCookieFromResponse(response) {
  return pickCookie(response.headers['set-cookie'], 'CSRFToken')
}

/** Combined `session; CSRFToken` cookie header for authenticated POSTs. */
export function authCookiesFromResponse(response) {
  return [
    sessionCookieFromResponse(response),
    csrfTokenCookieFromResponse(response)
  ]
    .filter(Boolean)
    .join('; ')
}

/** The crumb token value from a cookie header (for the hidden form field). */
export function crumbTokenFromCookie(cookieHeader) {
  return (cookieHeader ?? '')
    .split('; ')
    .find((cookie) => cookie.startsWith('CSRFToken='))
    ?.slice('CSRFToken='.length)
}

/**
 * Merge a cookie header with any Set-Cookie from a response, so a chain of
 * requests keeps its cookies. yar rotates the `session` cookie as the session
 * changes and crumb keeps a stable `CSRFToken`; when both name the same cookie,
 * the response's newer value wins.
 */
export function mergeCookiesFromResponse(previous, response) {
  const previousPairs = (previous ?? '').split('; ').filter(Boolean)
  const responsePairs = (response.headers['set-cookie'] ?? []).map(
    (setCookie) => setCookie.split(';')[0]
  )

  // Keyed by cookie name so a later pair replaces an earlier one of the same
  // name; response pairs come last, so they win.
  const valueByName = new Map()
  for (const pair of [...previousPairs, ...responsePairs]) {
    const [name] = pair.split('=')
    valueByName.set(name, pair)
  }

  return [...valueByName.values()].join('; ')
}
