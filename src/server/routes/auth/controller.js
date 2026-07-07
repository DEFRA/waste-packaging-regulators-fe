import { config } from '#config/config.js'
import {
  BELL_AZURE_AD_B2C_COOKIE,
  buildB2cLogoutUrl,
  getB2cAuthorityPrefix,
  resolvePostLogoutAbsoluteUri
} from '#server/auth/azure-ad-b2c.js'
import { createAccountApiService } from '#services/account-api.service.js'

export const signinOidcController = {
  async handler(request, h) {
    if (request.auth?.credentials) {
      const apiAccount = createAccountApiService()
      //Call to account api to get user details
      const user = await apiAccount.getAccountDetailsById(
        request.auth.credentials.sub
      )
      user.id = request.auth.credentials.sub
      user.email = request.auth.credentials.email
      user.name = user.firstName + ' ' + user.lastName
      request.yar.set('user', user)
    }
    const returnTo = request.yar.get('returnTo') || '/'
    request.yar.clear('returnTo')
    return h.redirect(returnTo)
  }
}
export const signOutController = {
  async handler(request, h) {
    if (request.yar) {
      request.yar.reset()
    }
    h.unstate(BELL_AZURE_AD_B2C_COOKIE)

    const azure = config.get('auth.azureAdB2c')
    const prefix = getB2cAuthorityPrefix(azure)
    const pathOrUrl = azure.postLogoutRedirectPath || '/signed-out'
    const postLogoutUri = resolvePostLogoutAbsoluteUri(
      request,
      pathOrUrl,
      azure
    )

    const logoutUrl = azure.logoutUrl
    if (logoutUrl) {
      try {
        let currentUrl = logoutUrl
        const maxRedirects = 10
        let redirectCount = 0

        while (currentUrl && redirectCount < maxRedirects) {
          const response = await fetch(currentUrl, { redirect: 'manual' })

          const setCookie =
            response.headers.getSetCookie?.() ||
            response.headers.get('set-cookie')
          if (setCookie) {
            const cookies = Array.isArray(setCookie) ? setCookie : [setCookie]
            cookies.forEach((cookieStr) => {
              const name = cookieStr.split('=')[0].trim()
              if (name) {
                h.unstate(name)
              }
            })
          }

          if (response.status >= 300 && response.status < 400) {
            currentUrl = response.headers.get('location')
            redirectCount++
          } else {
            currentUrl = null
          }
        }
      } catch (error) {
        request.log(
          'error',
          `Failed to call external logout URL: ${error.message}`
        )
      }
    }

    if (!prefix) {
      return h.redirect('/signed-out')
    }

    return h.redirect(buildB2cLogoutUrl(prefix, postLogoutUri))
  }
}

export const signedOutController = {
  handler(_request, h) {
    return h.view('auth/signed-out', {
      pageTitle: 'Signed out',
      heading: 'Signed out',
      message: 'You have been signed out.'
    })
  }
}
