// Regulators work on UK time, so the day in the heading, the date in the file
// name and the calendar date of every date cell are all read in Europe/London,
// whatever time zone the server runs in.
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

// The London calendar date of an instant, as a Date at UTC midnight. Excel date
// cells carry no time zone and exceljs writes a Date by its UTC value, so this
// keeps a submission made at 23:30 UTC during British Summer Time on the day
// the regulator saw it.
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
