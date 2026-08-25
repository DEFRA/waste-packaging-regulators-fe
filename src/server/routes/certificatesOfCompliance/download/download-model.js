import { format, parseISO, isDate } from 'date-fns'
import { createArrayCsvStringifier } from 'csv-writer'
import { COMPLIANCE_YEAR, COMPLIANCE_SCHEMES } from '../common/constants.js'

function formatCsvDate(isoString) {
  if (!isoString) {
    return ''
  }
  const date = isDate(isoString) ? isoString : parseISO(isoString)
  return format(date, 'd MMMM yyyy')
}

function percentageText(value) {
  return value != null ? `${value}%` : ''
}

function optionalBoolText(value, trueText, falseText) {
  if (value == null) {
    return 'No data'
  }
  return value ? trueText : falseText
}

// Both the header and the cell for each optional column are pushed under the
// same condition (see buildComplianceCsv), keeping the two in step:
//   - the metric column is Regulation 43 (schemes) or Percentage met (producers)
//   - Date submitted is dropped for the not-submitted status
function dataRow(item, isComplianceScheme, includeDateSubmitted) {
  const row = [
    item.organisationName ?? '',
    item.organisationReferenceNumber ?? '',
    optionalBoolText(item.recyclingObligationsMet, 'Met', 'Not met')
  ]

  if (isComplianceScheme) {
    row.push(
      optionalBoolText(item.regulation43Met, 'Compliant', 'Not compliant')
    )
  } else {
    row.push(percentageText(item.obligationCoveragePercentage))
  }

  if (includeDateSubmitted) {
    row.push(formatCsvDate(item.dateSubmitted))
  }

  return row
}

function documentNounSingular(organisationType) {
  return organisationType === COMPLIANCE_SCHEMES
    ? 'statement of compliance'
    : 'certificate of compliance'
}

function documentNounPlural(organisationType) {
  return organisationType === COMPLIANCE_SCHEMES ? 'statements' : 'certificates'
}

export function buildDownloadTitle(organisationType, submissionStatus, now) {
  const status =
    {
      pending: 'Pending',
      accepted: 'Accepted',
      'not-submitted': 'Not submitted'
    }[submissionStatus] ?? ''
  return `${status} ${documentNounSingular(organisationType)} submissions, ${format(now, 'EEEE d MMMM yyyy, HH:mm:ss')}`
}

export function buildDownloadFilename(organisationType, submissionStatus, now) {
  return `${COMPLIANCE_YEAR}-${documentNounPlural(organisationType)}-of-compliance-${submissionStatus}-${format(now, 'yyyy-MM-dd-HH-mm-ss')}.csv`
}

export function buildComplianceCsv({
  organisationType,
  submissionStatus,
  items = [],
  now
}) {
  const isComplianceScheme = organisationType === COMPLIANCE_SCHEMES

  // The not-submitted status has no submission date, so its column is dropped
  // entirely (matching the on-screen table), not left blank.
  const includeDateSubmitted = submissionStatus !== 'not-submitted'

  const headers = [
    'Organisation name',
    'Organisation ID',
    'Recycling obligations'
  ]

  if (isComplianceScheme) {
    headers.push('Regulation 43')
  } else {
    headers.push('Percentage met')
  }

  if (includeDateSubmitted) {
    headers.push('Date submitted')
  }

  const stringifier = createArrayCsvStringifier({
    header: headers
  })

  // Title stringifier without header
  const titleStringifier = createArrayCsvStringifier({
    header: []
  })

  const titleRow = [
    [buildDownloadTitle(organisationType, submissionStatus, now)]
  ]

  const rows = items.map((item) =>
    dataRow(item, isComplianceScheme, includeDateSubmitted)
  )

  const csv =
    titleStringifier.stringifyRecords(titleRow) +
    stringifier.getHeaderString() +
    stringifier.stringifyRecords(rows)

  return {
    filename: buildDownloadFilename(organisationType, submissionStatus, now),
    csv
  }
}
