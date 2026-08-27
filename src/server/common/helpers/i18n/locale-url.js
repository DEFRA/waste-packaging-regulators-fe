import { isSupportedLocale, normaliseLocale } from './locales.js'

function pathHasLangQuery(pathOrUrl) {
  const queryIndex = pathOrUrl.indexOf('?')

  if (queryIndex === -1) {
    return false
  }

  const lang = normaliseLocale(
    new URLSearchParams(pathOrUrl.slice(queryIndex + 1)).get('lang')
  )

  return isSupportedLocale(lang)
}

/**
 * Appends `lang` when the locale is not English and the path has no lang query yet.
 *
 * @param {string} pathOrUrl
 * @param {string} locale
 * @returns {string}
 */
export function appendLangQuery(pathOrUrl, locale) {
  const normalised = normaliseLocale(locale)

  if (
    !isSupportedLocale(normalised) ||
    normalised === 'en' ||
    pathHasLangQuery(pathOrUrl)
  ) {
    return pathOrUrl
  }

  const separator = pathOrUrl.includes('?') ? '&' : '?'
  return `${pathOrUrl}${separator}lang=${normalised}`
}

/**
 * Persists the resolved locale for the OAuth round trip.
 *
 * @param {import('@hapi/hapi').Request} request
 * @param {string} locale
 */
export function persistAuthLocale(request, locale) {
  if (normaliseLocale(locale) === 'en') {
    return
  }

  request.yar?.set('authLocale', normaliseLocale(locale))
}

/**
 * @param {import('@hapi/hapi').Request} request
 */
export function clearAuthLocale(request) {
  request.yar?.clear('authLocale')
}
