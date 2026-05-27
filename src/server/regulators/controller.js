import { config } from '../../config/config.js'
import {
  BELL_AZURE_AD_B2C_COOKIE,
  buildB2cLogoutUrl,
  getB2cAuthorityPrefix,
  resolvePostLogoutAbsoluteUri
} from '../auth/azure-ad-b2c.js'

export const signinOidcController = {
  handler(request, h) {
    if (request.auth?.credentials) {
      request.yar.set('user', request.auth.credentials)
    }
    return h.redirect('/')
  }
}

export const signOutController = {
  handler(request, h) {
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

    if (!prefix) {
      return h.redirect('/signed-out')
    }
    return h.redirect(buildB2cLogoutUrl(prefix, postLogoutUri))
  }
}

export const signedOutController = {
  handler(request, h) {
    return h.view('regulators/signed-out', {
      pageTitle: 'Signed out',
      heading: 'Signed out',
      message: 'You have signed out of the Regulator service.'
    })
  }
}
