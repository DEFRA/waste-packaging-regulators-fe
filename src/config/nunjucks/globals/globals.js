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

export { govukRebrand, pageI18n, t }
