import {
  persistAuthLocale,
  redirectWithLocale
} from '#server/common/helpers/i18n/locale-url.js'
import { getLocale } from '#server/common/helpers/i18n/get-locale.js'
import { withForwardedPrefix } from '#server/common/helpers/proxy/forwarded-prefix.js'

export function redirectToSignIn(request, h) {
  const locale = getLocale(request)
  persistAuthLocale(request, locale)
  const localPath = request.url.pathname + request.url.search
  request.yar.set('returnTo', withForwardedPrefix(request, localPath))
  return redirectWithLocale(
    h,
    request,
    withForwardedPrefix(request, '/signin-oidc')
  )
}
