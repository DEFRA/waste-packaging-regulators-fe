import { localeToBcp47 } from '#server/common/helpers/i18n/locales.js'
import { translate } from '#server/common/helpers/i18n/translate.js'
import { format, isDate, parseISO } from 'date-fns'
import { cy, enGB } from 'date-fns/locale'

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

function formatDateTime(isoString, locale, { useParseIso = false } = {}) {
  if (!isoString) {
    return null
  }

  const bcp47 = localeToBcp47(locale)
  const d = parseDateTimeInput(isoString, useParseIso)
  const datePart = d.toLocaleDateString(bcp47, {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
  const timePart = d.toLocaleTimeString(bcp47, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
  const atWord = translate(locale, DATE_TIME_AT_KEY)

  return `${datePart} ${atWord} ${timePart}`
}

export function formatSubmissionDate(isoString, locale = 'en') {
  return formatDateTime(isoString, locale, { useParseIso: true })
}

export function formatDate(isoString, locale = 'en', formatStr = null) {
  if (!isoString) {
    return null
  }

  if (formatStr) {
    const dateFnsLocale = locale === 'cy' ? cy : enGB
    return format(new Date(isoString), formatStr, { locale: dateFnsLocale })
  }

  return new Date(isoString).toLocaleDateString(localeToBcp47(locale), {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

export function formatHistoryDate(isoString, locale = 'en') {
  return formatDateTime(isoString, locale)
}
