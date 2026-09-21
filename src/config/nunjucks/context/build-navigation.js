import { getSessionUser } from '#server/common/helpers/get-session-user.js'
import { localeUrl } from '#server/common/helpers/i18n/locale-url.js'
import { translate } from '#server/common/helpers/i18n/translate.js'
import { withForwardedPrefix } from '#server/common/helpers/proxy/forwarded-prefix.js'

export function buildAccountNavigation(request) {
  const user = getSessionUser(request)
  const accountDetails = request.app?.accountDetails

  if (accountDetails?.organisationName) {
    return [{ text: accountDetails.organisationName }]
  } else if (user?.organisationName) {
    return [{ text: user.organisationName }]
  } else {
    return []
  }
}

export function buildNavigation() {
  return []
}

export function buildRegulatorContext(request, locale = 'en') {
  const user = getSessionUser(request)
  const accountDetails = request.app?.accountDetails

  if (user) {
    let html = '<div class="defra-internal-service-navigation__context">'
    if (accountDetails?.firstName && accountDetails?.lastName) {
      html += `${accountDetails.firstName} ${accountDetails.lastName} &nbsp;|&nbsp; `
    } else if (user.name) {
      html += `${user.name} &nbsp;|&nbsp; `
    } else {
      html += ''
    }
    html += `<a class="govuk-service-navigation__link" href="${localeUrl(withForwardedPrefix(request, '/logout'), locale)}">${translate(locale, 'common.nav.signOut')}</a></div>`
    return html
  }

  return `<div class="defra-internal-service-navigation__context">
    <a class="govuk-service-navigation__link" href="${localeUrl(withForwardedPrefix(request, '/signin-oidc'), locale)}">${translate(locale, 'common.nav.signIn')}</a>
  </div>`
}
