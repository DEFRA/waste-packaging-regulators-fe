import { config } from '#config/config.js'
import {
  BELL_AZURE_AD_B2C_COOKIE,
  buildB2cLogoutUrl,
  getB2cAuthorityPrefix,
  resolvePostLogoutAbsoluteUri
} from '#server/auth/azure-ad-b2c.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { createAccountApiService } from '#services/account-api.service.js'
import { getLocale } from '#server/common/helpers/i18n/get-locale.js'
import {
  appendLangQuery,
  clearAuthLocale
} from '#server/common/helpers/i18n/locale-url.js'
import { translate } from '#server/common/helpers/i18n/translate.js'

const MAX_LOGOUT_REDIRECTS = 10

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
  h.unstate(BELL_AZURE_AD_B2C_COOKIE)
}

function buildSignOutRedirect(h, azure, request) {
  const locale = getLocale(request)
  const prefix = getB2cAuthorityPrefix(azure)
  if (!prefix) {
    return h.redirect(appendLangQuery('/signed-out', locale))
  }

  const pathOrUrl = azure.postLogoutRedirectPath || '/signed-out'
  const postLogoutUri = resolvePostLogoutAbsoluteUri(request, pathOrUrl, azure)
  return h.redirect(buildB2cLogoutUrl(prefix, postLogoutUri))
}

export const signinOidcController = {
  async handler(request, h) {
    const locale = getLocale(request)

    if (request.auth?.credentials) {
      const apiAccount = createAccountApiService()
      const user = await apiAccount.getAccountDetailsById(
        request.auth.credentials.profile.oid
      )
      user.id = request.auth.credentials.profile.oid
      user.email = request.auth.credentials.profile.email
      user.name = `${user.firstName} ${user.lastName}`
      request.yar.set('user', user)
    }
    const returnTo = request.yar.get('returnTo') || '/'
    request.yar.clear('returnTo')
    clearAuthLocale(request)
    return h.redirect(appendLangQuery(returnTo, locale))
  }
}
export const signOutController = {
  async handler(request, h) {
    resetAuthSession(request, h)

    const azure = config.get('auth.azureAdB2c')
    const logoutUrl = azure.logoutUrl
    if (logoutUrl) {
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
