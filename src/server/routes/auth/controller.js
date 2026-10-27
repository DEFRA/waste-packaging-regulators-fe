import Boom from '@hapi/boom'
import { config } from '#config/config.js'
import {
  BELL_AZURE_AD_B2C_COOKIE,
  buildB2cLogoutUrl,
  getB2cAuthorityPrefix,
  resolvePostLogoutAbsoluteUri
} from '#server/auth/azure-ad-b2c.js'
import { isRegulator } from '#server/auth/regulator-access.js'
import {
  b2cErrorDetails,
  classifySigninFailure
} from '#server/auth/signin-callback-failure.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { renderErrorPage } from '#server/common/helpers/errors.js'
import {
  getDeniedSessionUser,
  getSessionUser
} from '#server/common/helpers/get-session-user.js'
import { createAccountApiService } from '#services/account-api.service.js'
import { getLocale } from '#server/common/helpers/i18n/get-locale.js'
import {
  clearAuthLocale,
  localeUrl,
  redirectWithLocale
} from '#server/common/helpers/i18n/locale-url.js'
import { translate } from '#server/common/helpers/i18n/translate.js'
import { withForwardedPrefix } from '#server/common/helpers/proxy/forwarded-prefix.js'

const MAX_LOGOUT_REDIRECTS = 10
const DEFAULT_SESSION_COOKIE_NAME = 'session'
const DEFAULT_COOKIE_PATHS = ['/', '/certificates-of-compliance', '/dashboard']
const SIGNED_OUT_PATH = '/signed-out'
const SIGN_IN_FAILED_PATH = '/sign-in-failed'

function isRedirectStatus(status) {
  return (
    status >= statusCodes.multipleChoices && status < statusCodes.badRequest
  )
}

function clearCookiesFromResponseHeaders(h, response) {
  const setCookie =
    response.headers.getSetCookie?.() || response.headers.get('set-cookie')
  if (!setCookie) {
    return
  }

  const cookies = Array.isArray(setCookie) ? setCookie : [setCookie]
  for (const cookieStr of cookies) {
    const name = cookieStr.split('=')[0].trim()
    if (name) {
      h.unstate(name)
    }
  }
}

async function callExternalLogout(request, h, logoutUrl) {
  try {
    await followLogoutRedirects(h, logoutUrl)
  } catch (error) {
    request.log('error', `Failed to call external logout URL: ${error.message}`)
  }
}

async function followLogoutRedirects(h, logoutUrl) {
  let currentUrl = logoutUrl
  let redirectCount = 0

  while (currentUrl && redirectCount < MAX_LOGOUT_REDIRECTS) {
    const response = await fetch(currentUrl, { redirect: 'manual' })
    clearCookiesFromResponseHeaders(h, response)

    if (isRedirectStatus(response.status)) {
      currentUrl = response.headers.get('location')
      redirectCount++
    } else {
      currentUrl = null
    }
  }
}

function resetAuthSession(request, h) {
  if (request.yar) {
    request.yar.reset()
  }
  clearAuthCookies(request, h)
}

function normaliseCookiePath(path) {
  if (!path || typeof path !== 'string') {
    return null
  }

  const trimmed = path.trim()
  if (!trimmed) {
    return null
  }

  if (trimmed === '/') {
    return '/'
  }

  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  let end = withLeadingSlash.length
  while (end > 1 && withLeadingSlash[end - 1] === '/') {
    end -= 1
  }
  return withLeadingSlash.slice(0, end)
}

function getCookiePathsToClear(request) {
  const paths = new Set(
    DEFAULT_COOKIE_PATHS.map((path) => normaliseCookiePath(path))
  )

  const forwardedPrefix = request.headers?.['x-forwarded-prefix']
  if (typeof forwardedPrefix === 'string') {
    const firstPrefix = forwardedPrefix.split(',')[0]
    paths.add(normaliseCookiePath(firstPrefix))
  }

  return [...paths].filter(Boolean)
}

function clearAuthCookies(request, h) {
  const sessionCookieName =
    config.get('session.cache.name') || DEFAULT_SESSION_COOKIE_NAME
  const cookiePaths = getCookiePathsToClear(request)

  for (const path of cookiePaths) {
    h.unstate(sessionCookieName, { path })
    h.unstate(BELL_AZURE_AD_B2C_COOKIE, { path })
  }
}

function resolveChainedLogoutReturnTo(request) {
  const returnTo = request.query?.returnTo
  if (typeof returnTo === 'string' && /^https?:\/\//i.test(returnTo)) {
    return returnTo
  }
  return null
}

function isBackgroundLogoutRequest(request) {
  return request.query?.background === 'true'
}

function isBroadcastLogoutRequest(request) {
  return request.query?.broadcast === 'true'
}

function buildSignOutRedirect(h, azure, request) {
  if (isBackgroundLogoutRequest(request)) {
    return h.response().code(statusCodes.noContent)
  }

  if (config.get('useMockAuth')) {
    const chainedReturnTo = resolveChainedLogoutReturnTo(request)
    if (chainedReturnTo) {
      if (isBroadcastLogoutRequest(request)) {
        const encodedReturnTo = encodeURIComponent(chainedReturnTo)
        return redirectWithLocale(
          h,
          request,
          `${SIGNED_OUT_PATH}?returnTo=${encodedReturnTo}`
        )
      }
      return h.redirect(chainedReturnTo)
    }
    return redirectWithLocale(h, request, SIGNED_OUT_PATH)
  }

  const prefix = getB2cAuthorityPrefix(azure)
  if (!prefix) {
    return redirectWithLocale(h, request, SIGNED_OUT_PATH)
  }

  const pathOrUrl = azure.postLogoutRedirectPath || SIGNED_OUT_PATH
  const postLogoutUri = resolvePostLogoutAbsoluteUri(request, pathOrUrl, azure)
  return h.redirect(buildB2cLogoutUrl(prefix, postLogoutUri))
}

function redirectToReturnTo(request, h) {
  const returnTo = request.yar.get('returnTo') || '/'
  request.yar.clear('returnTo')
  const response = redirectWithLocale(h, request, returnTo)
  clearAuthLocale(request)
  return response
}

/**
 * `/signin-oidc` runs Bell in `try` mode, so a callback Bell cannot complete —
 * cancelled at B2C, a stale or replayed `state`, an expired state cookie, a
 * failed code-for-token exchange — reaches this handler as `request.auth.error`.
 * Reloading the callback URL is one of these: Bell spent its state cookie the
 * first time.
 *
 * The person is redirected to the sign-in-failed page (Post/Redirect/Get), so
 * the code and state leave the address bar and reloading that page does not
 * replay the callback. Nothing here sends them back into sign-in by itself,
 * so a failure that repeats on every attempt cannot loop; they retry from the
 * page. `returnTo` and `authLocale` are kept so that retry lands where they
 * were going, in their language.
 */
function handleFailedSignin(request, h) {
  const reason = classifySigninFailure(request)
  request.logger.warn(
    { signIn: { reason, ...b2cErrorDetails(request) } },
    `Sign-in callback failed: ${reason}`
  )

  if (getSessionUser(request)) {
    return redirectToReturnTo(request, h)
  }
  // Someone refused at sign-in reloading that page: show it again. Rendered
  // rather than a Boom, so the warning above is the only log line for it.
  if (getDeniedSessionUser(request)) {
    return renderErrorPage(h, statusCodes.forbidden)
  }
  return redirectWithLocale(h, request, SIGN_IN_FAILED_PATH)
}

export const signInFailedController = {
  handler(request, h) {
    const locale = getLocale(request)
    return h.view('auth/sign-in-failed', {
      pageTitle: translate(locale, 'auth.signInFailed.pageTitle'),
      heading: translate(locale, 'auth.signInFailed.heading'),
      tryAgainPrefix: translate(locale, 'auth.signInFailed.tryAgainPrefix'),
      tryAgainLinkText: translate(locale, 'auth.signInFailed.tryAgainLinkText'),
      tryAgainSuffix: translate(locale, 'auth.signInFailed.tryAgainSuffix'),
      tryAgainUrl: localeUrl(
        withForwardedPrefix(request, '/signin-oidc'),
        locale
      )
    })
  }
}

export const signinOidcController = {
  async handler(request, h) {
    if (!request.auth?.isAuthenticated) {
      return handleFailedSignin(request, h)
    }

    // OpenID Connect requires an id_token in this token response, and the
    // profile is read from it. Without one, B2C or our configuration is at
    // fault, not the person, so this is a 500 rather than a sign-in to retry.
    const profile = request.auth.credentials.profile
    if (!profile?.oid) {
      return Boom.internal('B2C sign-in returned no id_token with an oid claim')
    }

    const apiAccount = createAccountApiService()
    const user = await apiAccount.getAccountDetailsById(profile.oid)
    if (!isRegulator(user)) {
      request.yar.clear('returnTo')
      clearAuthLocale(request)
      // A refused sign-in leaves the service signed in as nobody, not as
      // whoever this browser signed in as before.
      request.yar.clear('user')
      // Still signed in at B2C, so the 403 page must offer "Sign out":
      // "Sign in" would only sign the same account straight back in. Only
      // the display name is kept, and it grants no access.
      request.yar.set('deniedUser', {
        name: [user?.firstName, user?.lastName].filter(Boolean).join(' ')
      })
      return Boom.forbidden('User does not hold a regulator service role')
    }
    user.id = profile.oid
    user.email = profile.email
    user.name = `${user.firstName} ${user.lastName}`
    request.yar.clear('deniedUser')
    request.yar.set('user', user)

    return redirectToReturnTo(request, h)
  }
}
export const signOutController = {
  async handler(request, h) {
    resetAuthSession(request, h)

    const azure = config.get('auth.azureAdB2c')
    const logoutUrl = azure.logoutUrl
    if (!config.get('useMockAuth') && logoutUrl) {
      await callExternalLogout(request, h, logoutUrl)
    }

    return buildSignOutRedirect(h, azure, request)
  }
}

export const signedOutController = {
  handler(request, h) {
    const locale = getLocale(request)
    return h.view('auth/signed-out', {
      pageTitle: translate(locale, 'auth.signedOut.pageTitle'),
      heading: translate(locale, 'auth.signedOut.heading'),
      message: translate(locale, 'auth.signedOut.message')
    })
  }
}
