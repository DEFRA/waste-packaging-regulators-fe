// The GET /compliance-declarations query semantics — status filtering, search,
// sort and paging — as pure functions over a record set. The store applies them
// after overlaying any approve/cancel transitions.

import { listOrganisationName } from './declaration.js'

// Builds the predicate for a `status` query param, which may be a single
// declaration status or a comma-separated list (e.g. "Submitted,Accepted"). It
// matches a declaration's own status, exactly as the real backend filters, so an
// organisation gets every declaration it holds — a superseded submission that no
// tab lists is still returned, and a search finds a row per submission.
export function statusMatcherForQuery(statusParam) {
  const requested = (statusParam ?? '')
    .split(',')
    .map((status) => status.trim())
    .filter(Boolean)

  return (record) => requested.includes(record.declarationStatus)
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

// DateSubmitted sorts on the declaration's created timestamp, which is what the
// real backend orders by (and the only date toDeclaration projects), so every
// declaration sorts — including one recorded without a dateSubmitted of its own.
function sortFieldFor(column, record) {
  switch (column) {
    case 'DateSubmitted':
      return record.created
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
      return record.created
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
