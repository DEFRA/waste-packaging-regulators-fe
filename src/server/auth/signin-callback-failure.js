/**
 * Why a B2C sign-in callback failed, worked out from what Bell hands the
 * `/signin-oidc` handler when the route runs in `try` mode.
 *
 * Bell reports every failure as a Boom 500 whose message names the cause; the
 * reasons here are those causes. Only the reason and B2C's own error codes are
 * ever logged — never the Boom itself, whose `data` can carry the token
 * endpoint's response, nor the query string, which carries the auth code.
 */

export const signinFailureReasons = {
  accessDenied: 'access_denied',
  stateMismatch: 'state_mismatch',
  missingStateCookie: 'missing_state_cookie',
  tokenExchangeFailed: 'token_exchange_failed',
  unknown: 'unknown'
}

// OAuth error values are lower snake case (RFC 6749 §4.1.2.1); anything else
// is not a value B2C sent, so it is left out of the log.
const OAUTH_ERROR_PATTERN = /^[a-z_]{1,64}$/
const B2C_ERROR_CODE_PATTERN = /\bAADB2C\d{5,6}\b/

/**
 * @param {import('@hapi/hapi').Request} request
 * @returns {string} one of {@link signinFailureReasons}
 */
export function classifySigninFailure(request) {
  const message = request.auth?.error?.message ?? ''

  // Bell's message when B2C answers with error=access_denied.
  if (message.startsWith('App rejected')) {
    return signinFailureReasons.accessDenied
  }
  if (message.includes('state parameter')) {
    return signinFailureReasons.stateMismatch
  }
  if (message.includes('request token cookie')) {
    return signinFailureReasons.missingStateCookie
  }
  if (message.includes('access token')) {
    return signinFailureReasons.tokenExchangeFailed
  }
  return signinFailureReasons.unknown
}

/**
 * B2C's `error` value and `AADB2C…` code, when present, for diagnosing a
 * failure without logging the free-text description around them.
 *
 * @param {import('@hapi/hapi').Request} request
 * @returns {{ b2cError?: string, b2cErrorCode?: string }}
 */
export function b2cErrorDetails(request) {
  const details = {}
  const error = request.query?.error
  if (typeof error === 'string' && OAUTH_ERROR_PATTERN.test(error)) {
    details.b2cError = error
  }

  const description = request.query?.error_description
  const code =
    typeof description === 'string'
      ? B2C_ERROR_CODE_PATTERN.exec(description)?.[0]
      : undefined
  if (code) {
    details.b2cErrorCode = code
  }

  return details
}
