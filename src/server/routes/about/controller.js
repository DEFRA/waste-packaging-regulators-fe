import { appendLangQuery } from '#server/common/helpers/i18n/locale-url.js'
import { getLocale } from '#server/common/helpers/i18n/get-locale.js'
import { translate } from '#server/common/helpers/i18n/translate.js'

/**
 * A GDS styled example about page controller.
 * Provided as an example, remove or modify as required.
 */
export const aboutController = {
  handler(request, h) {
    const locale = getLocale(request)
    return h.view('about/index', {
      pageTitle: translate(locale, 'about.pageTitle'),
      heading: translate(locale, 'about.heading'),
      caption: translate(locale, 'about.caption'),
      breadcrumbs: [
        {
          text: translate(locale, 'common.nav.home'),
          href: appendLangQuery('/', locale)
        },
        {
          text: translate(locale, 'about.heading')
        }
      ]
    })
  }
}
