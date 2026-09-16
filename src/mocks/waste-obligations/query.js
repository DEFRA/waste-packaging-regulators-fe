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

export function compareValues(a, b) {
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

// GET /compliance-declarations/unsubmitted has its own field vocabulary and,
// unlike the declaration search, accepts a genuine priority-ordered list rather
// than one column plus a fixed tiebreak — so it cannot reuse sortRecords.
export const UNSUBMITTED_SORT_FIELDS = [
  'Name',
  'ReferenceNumber',
  'RecyclingObligationsMet',
  'ObligationCoveragePercentage'
]

function unsubmittedSortFieldFor(field, row) {
  switch (field) {
    case 'ReferenceNumber':
      return row.referenceNumber
    case 'RecyclingObligationsMet':
      return row.recyclingObligationsMet
    case 'ObligationCoveragePercentage':
      return row.obligationCoveragePercentage
    default:
      return row.name
  }
}

export function parseUnsubmittedSort(sortParam) {
  if (!sortParam) {
    return [{ field: 'Name', direction: 'asc' }]
  }

  return sortParam
    .split(',')
    .map((term) => term.trim())
    .filter(Boolean)
    .map((term) => {
      const [, field, direction] = /^([^[]+)\[(asc|desc)\]$/.exec(term) ?? []
      return field ? { field, direction } : null
    })
}

// Terms apply in priority order; organisationId is the final tiebreaker, as the
// real endpoint guarantees a deterministic order across pages.
export function sortUnsubmitted(rows, terms) {
  return [...rows].sort((a, b) => {
    for (const { field, direction } of terms) {
      const factor = direction === 'asc' ? 1 : -1
      const result =
        compareValues(
          unsubmittedSortFieldFor(field, a),
          unsubmittedSortFieldFor(field, b)
        ) * factor
      if (result !== 0) {
        return result
      }
    }
    return compareValues(a.organisationId, b.organisationId)
  })
}
