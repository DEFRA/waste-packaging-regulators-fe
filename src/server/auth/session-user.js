import { getSessionUser } from '#server/common/helpers/get-session-user.js'
import { getLocale } from '#server/common/helpers/i18n/get-locale.js'
import {
  persistAuthLocale,
  redirectWithLocale
} from '#server/common/helpers/i18n/locale-url.js'
import {
  getProxyPrefix,
  withForwardedPrefix
} from '#server/common/helpers/proxy/forwarded-prefix.js'

export const SESSION_USER_STRATEGY = 'session-user'

/**
 * Sends someone without a session to B2C, remembering where they were going
 * and in which language so the callback can bring them back there.
 *
 * @param {import('@hapi/hapi').Request} request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 */
export function redirectToSignIn(request, h) {
  persistAuthLocale(request, getLocale(request))
  const localPath = request.url.pathname + request.url.search
  request.yar.set('returnTo', withForwardedPrefix(request, localPath))
  return redirectWithLocale(
    h,
    request,
    getProxyPrefix(request)
      ? withForwardedPrefix(request, '/signin-oidc')
      : '/signin-oidc'
  )
}

/**
 * Authenticates from the user Yar holds after a successful `/signin-oidc`.
 * Yar loads the session in `onPreAuth`, so it is ready by the time this runs.
 * No user is a redirect to sign in, not a 401: these are pages, not an API.
 */
export const sessionUserScheme = () => ({
  authenticate(request, h) {
    const user = getSessionUser(request)
    return user
      ? h.authenticated({ credentials: { user } })
      : redirectToSignIn(request, h).takeover()
  }
})

/**
 * @param {import('@hapi/hapi').Server} server
 */
export function registerSessionUserStrategy(server) {
  server.auth.scheme(SESSION_USER_STRATEGY, sessionUserScheme)
  server.auth.strategy(SESSION_USER_STRATEGY, SESSION_USER_STRATEGY)
}
