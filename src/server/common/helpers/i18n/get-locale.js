import {
  DEFAULT_LOCALE,
  isSupportedLocale,
  normaliseLocale
} from './locales.js'

export function getLocale(request) {
  const queryLocale = normaliseLocale(request?.query?.lang)

  if (isSupportedLocale(queryLocale)) {
    return queryLocale
  }

  try {
    const sessionLocale = normaliseLocale(request?.yar?.get('authLocale'))

    if (isSupportedLocale(sessionLocale)) {
      return sessionLocale
    }
  } catch {
    // Session may be unavailable during error handling
  }

  const headerLocale = normaliseLocale(
    request?.headers?.['accept-language']?.split(',')[0]
  )

  if (isSupportedLocale(headerLocale)) {
    return headerLocale
  }

  return DEFAULT_LOCALE
}
