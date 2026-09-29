import Boom from '@hapi/boom'
import { config } from '#config/config.js'
import {
  BELL_AZURE_AD_B2C_COOKIE,
  buildB2cLogoutUrl,
  getB2cAuthorityPrefix,
  resolvePostLogoutAbsoluteUri
} from '#server/auth/azure-ad-b2c.js'
import { isRegulator } from '#server/auth/regulator-access.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { createAccountApiService } from '#services/account-api.service.js'
import { getLocale } from '#server/common/helpers/i18n/get-locale.js'
import {
  clearAuthLocale,
  redirectWithLocale
} from '#server/common/helpers/i18n/locale-url.js'
import { translate } from '#server/common/helpers/i18n/translate.js'

const MAX_LOGOUT_REDIRECTS = 10
const DEFAULT_SESSION_COOKIE_NAME = 'session'
const DEFAULT_COOKIE_PATHS = ['/', '/certificates-of-compliance', '/dashboard']
const SIGNED_OUT_PATH = '/signed-out'

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

export const signinOidcController = {
  async handler(request, h) {
    if (request.auth?.credentials) {
      const apiAccount = createAccountApiService()
      const user = await apiAccount.getAccountDetailsById(
        request.auth.credentials.profile.oid
      )
      if (!isRegulator(user)) {
        request.yar.clear('returnTo')
        clearAuthLocale(request)
        return Boom.forbidden('User does not hold a regulator service role')
      }
      user.id = request.auth.credentials.profile.oid
      user.email = request.auth.credentials.profile.email
      user.name = `${user.firstName} ${user.lastName}`
      request.yar.set('user', user)
    }
    const returnTo = request.yar.get('returnTo') || '/'
    request.yar.clear('returnTo')
    const response = redirectWithLocale(h, request, returnTo)
    clearAuthLocale(request)
    return response
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
