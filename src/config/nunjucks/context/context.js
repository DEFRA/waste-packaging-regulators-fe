import path from 'node:path'
import { readFileSync } from 'node:fs'

import { config } from '#config/config.js'
import { buildLanguageSwitcherUrls } from './build-language-switcher.js'
import { buildNavigation } from './build-navigation.js'
import { createLogger } from '#server/common/helpers/logging/logger.js'
import { getLocale } from '#server/common/helpers/i18n/get-locale.js'
import { translate } from '#server/common/helpers/i18n/translate.js'

const logger = createLogger()
const assetPath = config.get('assetPath')
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

  return {
    assetPath: `${assetPath}/assets`,
    locale,
    serviceName: translate(locale, 'common.serviceName'),
    serviceUrl: '/',
    helpDeskEmail: config.get('helpDeskEmail'),
    breadcrumbs: [],
    backlinkText: translate(locale, 'common.nav.back'),
    languageSwitcher: buildLanguageSwitcherUrls(request),
    navigation: buildNavigation(request, locale),
    getAssetPath(asset) {
      if (!config.get('isProduction')) {
        return `${assetPath}/${asset}`
      }

      const viteAssetPath = viteManifest?.[asset]?.file
      return `${assetPath}/${viteAssetPath ?? asset}`
    }
  }
}
