import { getLocale } from '#server/common/helpers/i18n/get-locale.js'
import { translate } from '#server/common/helpers/i18n/translate.js'

/**
 * A GDS styled example home page controller.
 * Provided as an example, remove or modify as required.
 */
export const homeController = {
  handler(request, h) {
    const locale = getLocale(request)
    return h.view('home/index', {
      pageTitle: translate(locale, 'home.pageTitle'),
      heading: translate(locale, 'home.heading'),
      caption: translate(locale, 'home.caption')
    })
  }
}
