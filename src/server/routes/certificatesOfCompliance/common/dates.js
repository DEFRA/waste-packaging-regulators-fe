import { format, isDate, parseISO } from 'date-fns'

export function formatSubmissionDate(isoString) {
  if (!isoString) {
    return null
  }
  const date = isDate(isoString) ? isoString : parseISO(isoString)
  return format(date, "d MMMM yyyy 'at' HH:mm")
}

export function formatDate(isoString) {
  if (!isoString) {
    return null
  }
  return new Date(isoString).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

export function formatHistoryDate(isoString) {
  if (!isoString) {
    return null
  }
  const d = new Date(isoString)
  const datePart = d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  })
  const timePart = d.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC'
  })
  return `${datePart} at ${timePart}`
}
