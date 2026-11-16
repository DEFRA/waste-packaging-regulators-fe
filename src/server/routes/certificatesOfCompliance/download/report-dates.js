// Report dates are read in UK time, whatever the server's time zone.
export const REPORT_TIME_ZONE = 'Europe/London'

const calendarDateFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: REPORT_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
})

export function partsOf(format, date) {
  return Object.fromEntries(
    format.formatToParts(date).map(({ type, value }) => [type, value])
  )
}

export function londonCalendarParts(date) {
  const { year, month, day } = partsOf(calendarDateFormat, date)
  return { year, month, day }
}

// The London date at UTC midnight, because exceljs writes dates in UTC.
export function toLondonCalendarDate(value) {
  if (value == null || value === '') {
    return null
  }

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return null
  }

  const { year, month, day } = londonCalendarParts(date)
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
}
