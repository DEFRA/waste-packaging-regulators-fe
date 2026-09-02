import {
  persistAuthLocale,
  redirectWithLocale
} from '#server/common/helpers/i18n/locale-url.js'
import { getLocale } from '#server/common/helpers/i18n/get-locale.js'

export function redirectToSignIn(request, h) {
  const locale = getLocale(request)
  persistAuthLocale(request, locale)
  request.yar.set('returnTo', request.url.pathname + request.url.search)
  return redirectWithLocale(h, request, '/signin-oidc')
}
