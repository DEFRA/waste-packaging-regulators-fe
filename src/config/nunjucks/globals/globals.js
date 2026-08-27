import { appendLangQuery } from '#server/common/helpers/i18n/locale-url.js'
import {
  pageI18n as createPageI18n,
  translate
} from '#server/common/helpers/i18n/translate.js'

const govukRebrand = true

function t(locale, key, params = {}) {
  return translate(locale, key, params)
}

function pageI18n(locale, pageLocaleBase) {
  return createPageI18n(locale, pageLocaleBase)
}

function localeUrl(href, locale) {
  return appendLangQuery(href, locale)
}

export { govukRebrand, localeUrl, pageI18n, t }
