import { COMPLIANCE_SCHEMES, COMPLIANCE_YEAR } from '../common/constants.js'
import {
  REPORT_TIME_ZONE,
  londonCalendarParts,
  partsOf
} from './report-dates.js'

const headingDayFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: REPORT_TIME_ZONE,
  weekday: 'long',
  day: 'numeric',
  month: 'long'
})

function documentNounSingular(organisationType) {
  return organisationType === COMPLIANCE_SCHEMES
    ? 'statement of compliance'
    : 'certificate of compliance'
}

function documentNounPlural(organisationType) {
  return organisationType === COMPLIANCE_SCHEMES ? 'statements' : 'certificates'
}

// e.g. 2026-certificates-of-compliance-all-19-10-2026.xlsx
export function buildReportFilename(organisationType, now) {
  const { year, month, day } = londonCalendarParts(now)
  return `${COMPLIANCE_YEAR}-${documentNounPlural(organisationType)}-of-compliance-all-${day}-${month}-${year}.xlsx`
}

// e.g. All certificate of compliance submissions, Monday 19 October
export function buildReportHeading(organisationType, now) {
  const { weekday, day, month } = partsOf(headingDayFormat, now)
  return `All ${documentNounSingular(organisationType)} submissions, ${weekday} ${day} ${month}`
}
