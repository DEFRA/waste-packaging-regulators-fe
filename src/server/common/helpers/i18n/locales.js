export const SUPPORTED_LOCALES = Object.freeze(['en', 'cy'])
export const DEFAULT_LOCALE = 'en'

export function normaliseLocale(rawLocale) {
  return String(rawLocale ?? '')
    .trim()
    .toLowerCase()
    .split('-')[0]
}

/**
 * @param {string} locale
 * @returns {locale is 'en' | 'cy'}
 */
export function isSupportedLocale(locale) {
  const normalised = normaliseLocale(locale)
  return SUPPORTED_LOCALES.includes(normalised)
}

export function localeToBcp47(locale) {
  return normaliseLocale(locale) === 'cy' ? 'cy-GB' : 'en-GB'
}
