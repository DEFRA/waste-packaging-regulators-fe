// The GET /compliance-declarations query semantics — status filtering, search,
// sort and paging — as pure functions over a record set. The store applies them
// after overlaying any approve/cancel transitions.

import { listOrganisationName } from './declaration.js'

export const SUBMISSION_STATUS_BY_DECLARATION_STATUS = {
  Submitted: 'pending',
  Accepted: 'accepted'
}

// The submission-status listings matching a `status` query param, which may be a
// single declaration status or a comma-separated list (e.g. "Submitted,Accepted").
export function submissionStatusesForQuery(statusParam) {
  if (!statusParam) {
    return []
  }
  return statusParam
    .split(',')
    .map((status) => SUBMISSION_STATUS_BY_DECLARATION_STATUS[status.trim()])
    .filter(Boolean)
}

export function recordSearchText(record) {
  return [
    listOrganisationName(record),
    record.organisationReferenceNumber,
    record.complianceSchemeName,
    record.organisationName
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function sortFieldFor(column, record) {
  switch (column) {
    case 'DateSubmitted':
      return record.dateSubmitted
    case 'OrganisationName':
      return listOrganisationName(record)
    case 'OrganisationId':
      return record.organisationReferenceNumber
    case 'RecyclingObligations':
      return record.obligationStatus?.toLowerCase() === 'met'
    case 'PercentageMet':
      return record.obligationCoveragePercentage
    case 'Regulation43':
      return record.isRegulation43Compliant
    default:
      return record.dateSubmitted
  }
}

function compareValues(a, b) {
  if (a == null && b == null) {
    return 0
  }
  if (a == null) {
    return 1
  }
  if (b == null) {
    return -1
  }
  if (typeof a === 'boolean') {
    return a === b ? 0 : a ? 1 : -1
  }
  if (typeof a === 'number') {
    return a - b
  }
  return String(a).localeCompare(String(b))
}

// Sort param arrives as e.g. "DateSubmitted[desc],OrganisationName[asc]"; the
// primary column governs, organisation name breaks ties.
export function sortRecords(records, sortParam) {
  if (!sortParam) {
    return records
  }
  const [, column, direction] = /^([^[]+)\[(asc|desc)\]/.exec(sortParam) ?? []
  if (!column) {
    return records
  }
  const factor = direction === 'asc' ? 1 : -1
  return [...records].sort((a, b) => {
    const primary =
      compareValues(sortFieldFor(column, a), sortFieldFor(column, b)) * factor
    if (primary !== 0) {
      return primary
    }
    return compareValues(listOrganisationName(a), listOrganisationName(b))
  })
}

export function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}
