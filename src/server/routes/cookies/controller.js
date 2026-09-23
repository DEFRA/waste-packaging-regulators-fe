import { config } from '#config/config.js'
import { createLogger } from '#server/common/helpers/logging/logger.js'
import { getLocale } from '#server/common/helpers/i18n/get-locale.js'
import { localeUrl } from '#server/common/helpers/i18n/locale-url.js'
import { pageI18n } from '#server/common/helpers/i18n/translate.js'
import { withForwardedPrefix } from '#server/common/helpers/proxy/forwarded-prefix.js'

const logger = createLogger('cookies-controller')

// 1 year in milliseconds (1000 * 60 * 60 * 24 * 365)
const ONE_YEAR_IN_MS = 31536000000

const cookieOptions = {
  ttl: ONE_YEAR_IN_MS,
  path: '/',
  isSecure: config.get('session.cookie.secure'),
  isSameSite: 'lax'
}

function redirectPreservingLang(request, h, pathname, extraParams = {}) {
  const url = new URL(pathname, request.url.origin)

  for (const [key, value] of Object.entries(extraParams)) {
    url.searchParams.set(key, value)
  }

  const lang = request.query?.lang
  if (lang) {
    url.searchParams.set('lang', lang)
  }

  return h.redirect(url.pathname + url.search)
}

export const cookiesController = {
  async getHandler(request, h) {
    const locale = getLocale(request)
    const i18n = pageI18n(locale, 'cookies')

    const policy = request.state.cookies_policy
    let cookiesPolicyUsage = null
    try {
      const parsedPolicy =
        typeof policy === 'string' ? JSON.parse(policy) : policy
      if (parsedPolicy && typeof parsedPolicy.usage === 'boolean') {
        cookiesPolicyUsage = parsedPolicy.usage ? 'yes' : 'no'
      }
    } catch (e) {
      logger.error('Failed to parse cookies_policy from request state', e)
    }

    return h.view('cookies/index', {
      pageTitle: i18n.t('pageTitle'),
      heading: i18n.t('heading'),
      cookiesPolicyUsage,
      showSuccess: request.query.success === '1',
      cookiesI18n: i18n,
      breadcrumbs: [
        {
          text: i18n.t('breadcrumbHome'),
          href: localeUrl(withForwardedPrefix(request, '/'), locale)
        },
        {
          text: i18n.t('breadcrumbCookies')
        }
      ]
    })
  },

  async postHandler(request, h) {
    const { analytics } = request.payload || {}

    if (analytics === 'yes' || analytics === 'no') {
      const usage = analytics === 'yes'
      h.state(
        'cookies_policy',
        JSON.stringify({ essential: true, usage }),
        cookieOptions
      )
    }

    return redirectPreservingLang(request, h, '/cookies', { success: '1' })
  },

  async bannerPostHandler(request, h) {
    const analytics = request.payload?.analytics

    if (analytics === 'yes' || analytics === 'no') {
      const usage = analytics === 'yes'
      h.state(
        'cookies_policy',
        JSON.stringify({ essential: true, usage }),
        cookieOptions
      )
    }

    const referer = request.headers.referer || '/'
    try {
      const url = new URL(referer, request.url.origin)
      url.searchParams.set('cookie_preference', 'set')
      if (request.query?.lang) {
        url.searchParams.set('lang', request.query.lang)
      }
      return h.redirect(url.pathname + url.search)
    } catch (e) {
      logger.error(e, 'Failed to parse referer URL')
      return redirectPreservingLang(request, h, '/', {
        cookie_preference: 'set'
      })
    }
  },

  hideBannerPostHandler(request, h) {
    const referer = request.headers.referer || '/'
    try {
      const url = new URL(referer, request.url.origin)
      url.searchParams.delete('cookie_preference')
      if (request.query?.lang) {
        url.searchParams.set('lang', request.query.lang)
      }
      return h.redirect(url.pathname + url.search)
    } catch (e) {
      logger.error(e, 'Failed to parse referer URL')
      return redirectPreservingLang(request, h, '/')
    }
  }
}
