import path from 'node:path'
import { readFileSync } from 'node:fs'

import { config } from '#config/config.js'
import { buildLanguageSwitcherUrls } from './build-language-switcher.js'
import {
  buildNavigation,
  buildAccountNavigation,
  buildRegulatorContext
} from './build-navigation.js'
import { createLogger } from '#server/common/helpers/logging/logger.js'
import { bindLocaleUrl } from '#server/common/helpers/i18n/locale-url.js'
import { getLocale } from '#server/common/helpers/i18n/get-locale.js'
import { translate } from '#server/common/helpers/i18n/translate.js'
import {
  getExternalPublicPath,
  getForwardedPrefix,
  withForwardedPrefix
} from '#server/common/helpers/proxy/forwarded-prefix.js'

const logger = createLogger()
const manifestPath = path.join(
  config.get('root'),
  '.public/.vite/manifest.json'
)

let viteManifest

export function context(request) {
  if (config.get('isProduction') && !viteManifest) {
    try {
      viteManifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
    } catch (error) {
      logger.error(error, `Vite ${path.basename(manifestPath)} not found`)
    }
  }

  const locale = getLocale(request)
  const externalAssetPath = getExternalPublicPath(request)

  let allowGoogleAnalytics = false
  try {
    const policy = request?.state?.cookies_policy
    if (policy) {
      const parsedPolicy =
        typeof policy === 'string' ? JSON.parse(policy) : policy
      allowGoogleAnalytics = parsedPolicy?.usage === true
    }
  } catch (e) {
    logger.error(e, 'Failed to parse cookies_policy from request state')
  }

  return {
    cspNonce: request?.plugins?.blankie?.nonces?.script,
    assetPath: `${externalAssetPath}/assets`,
    routePrefix: getForwardedPrefix(request),
    locale,
    localeUrl: bindLocaleUrl(locale),
    serviceName: translate(locale, 'common.serviceName'),
    serviceUrl: withForwardedPrefix(request, '/'),
    helpDeskEmail: config.get('helpDeskEmail'),
    breadcrumbs: [],
    backlinkText: translate(locale, 'common.nav.back'),
    languageSwitcher: buildLanguageSwitcherUrls(request),
    navigation: buildNavigation(),
    accountNavigation: buildAccountNavigation(request),
    regulatorContext: buildRegulatorContext(request, locale),
    hasCookiePolicy: Boolean(request?.state?.cookies_policy),
    cookiePreferenceSet: request?.query?.cookie_preference === 'set',
    allowGoogleAnalytics,
    ga4: config.get('GA4'),
    gtm: config.get('GTM'),
    getAssetPath(asset) {
      if (!config.get('isProduction')) {
        return `${externalAssetPath}/${asset}`
      }

      const viteAssetPath = viteManifest?.[asset]?.file
      return `${externalAssetPath}/${viteAssetPath ?? asset}`
    }
  }
}
