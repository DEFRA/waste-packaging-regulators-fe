import { localeToBcp47 } from '#server/common/helpers/i18n/locales.js'
import { isDate, parseISO } from 'date-fns'

export function formatSubmissionDate(isoString, locale = 'en') {
  if (!isoString) {
    return null
  }
  const bcp47 = localeToBcp47(locale)
  const d = isDate(isoString) ? isoString : parseISO(isoString)
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
  const atWord = locale === 'cy' ? 'am' : 'at'
  return `${datePart} ${atWord} ${timePart}`
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
  if (!isoString) {
    return null
  }
  const bcp47 = localeToBcp47(locale)
  const d = new Date(isoString)
  const datePart = d.toLocaleDateString(bcp47, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  })
  const timePart = d.toLocaleTimeString(bcp47, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC'
  })
  const atWord = locale === 'cy' ? 'am' : 'at'
  return `${datePart} ${atWord} ${timePart}`
}
