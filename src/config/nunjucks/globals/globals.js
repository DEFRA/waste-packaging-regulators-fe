import { translate } from '#server/common/helpers/i18n/translate.js'

const govukRebrand = true

function t(locale, key, params = {}) {
  return translate(locale, key, params)
}

export { govukRebrand, t }
