import { localeToBcp47 } from '#server/common/helpers/i18n/locales.js'
import { translate } from '#server/common/helpers/i18n/translate.js'
import { isDate, parseISO } from 'date-fns'

const DATE_TIME_AT_KEY = 'common.dateTime.at'

function parseDateTimeInput(isoString, useParseIso) {
  if (useParseIso && isDate(isoString)) {
    return isoString
  }

  if (useParseIso) {
    return parseISO(isoString)
  }

  return new Date(isoString)
}

function formatDateTime(
  isoString,
  locale,
  { timeZone, useParseIso = false } = {}
) {
  if (!isoString) {
    return null
  }

  const bcp47 = localeToBcp47(locale)
  const d = parseDateTimeInput(isoString, useParseIso)
  const localeOptions = timeZone ? { timeZone } : {}
  const datePart = d.toLocaleDateString(bcp47, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...localeOptions
  })
  const timePart = d.toLocaleTimeString(bcp47, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    ...localeOptions
  })
  const atWord = translate(locale, DATE_TIME_AT_KEY)

  return `${datePart} ${atWord} ${timePart}`
}

export function formatSubmissionDate(isoString, locale = 'en') {
  return formatDateTime(isoString, locale, { useParseIso: true })
}

export function formatDate(isoString, locale = 'en') {
  if (!isoString) {
    return null
  }

  return new Date(isoString).toLocaleDateString(localeToBcp47(locale), {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

export function formatHistoryDate(isoString, locale = 'en') {
  return formatDateTime(isoString, locale, { timeZone: 'UTC' })
}
