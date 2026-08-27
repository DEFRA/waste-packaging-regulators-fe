import { appendLangQuery } from '#server/common/helpers/i18n/locale-url.js'
import { translate } from '#server/common/helpers/i18n/translate.js'

export function buildNavigation(request, locale = 'en') {
  const path = request?.path ?? ''

  return [
    {
      text: translate(locale, 'common.nav.home'),
      href: appendLangQuery('/', locale),
      current: path === '/'
    },
    {
      text: translate(locale, 'common.nav.about'),
      href: appendLangQuery('/about', locale),
      current: path === '/about'
    }
  ]
}
