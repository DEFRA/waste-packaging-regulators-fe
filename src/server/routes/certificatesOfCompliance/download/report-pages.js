import pMap from 'p-map'
import {
  DECLARATIONS_BATCH_SIZE,
  DOWNLOAD_PAGE_CONCURRENCY
} from '../common/constants.js'

// Thrown when a result set's `total` changes while its pages are being read.
// Rows that leave the set (an organisation submits, a declaration is cancelled)
// shift every later row up a page, so a row on a page boundary may have been
// skipped. A change that adds and removes the same number of rows keeps the
// total and goes unnoticed; that window is accepted.
export class ResultSetChangedError extends Error {
  constructor(message) {
    super(message)
    this.name = 'ResultSetChangedError'
  }
}

function assertSameTotal(first, pages, endpoint) {
  const changed = pages.find((page) => page.total !== first.total)
  if (changed) {
    throw new ResultSetChangedError(
      `${endpoint} total changed from ${first.total} to ${changed.total} while its pages were read`
    )
  }
}

// Every declaration matching `params`, for the Excel report, drained page by
// page. Pages after the first are bounded the same way, and for the same
// reasons, as fetchAllUnsubmittedOrganisations below.
export async function fetchAllDeclarations(api, params, traceId) {
  const first = await api.listComplianceDeclarations(
    { ...params, page: 1, pageSize: DECLARATIONS_BATCH_SIZE },
    traceId
  )
  const totalPages = Math.ceil(first.total / DECLARATIONS_BATCH_SIZE)

  if (totalPages <= 1) {
    return first.complianceDeclarations
  }

  const remaining = await pMap(
    Array.from({ length: totalPages - 1 }, (_, i) => i + 2),
    (page) =>
      api.listComplianceDeclarations(
        { ...params, page, pageSize: DECLARATIONS_BATCH_SIZE },
        traceId
      ),
    { concurrency: DOWNLOAD_PAGE_CONCURRENCY }
  )
  assertSameTotal(first, remaining, 'compliance-declarations')

  return [
    ...first.complianceDeclarations,
    ...remaining.flatMap((r) => r.complianceDeclarations)
  ]
}

// Every unsubmitted row for the year, for the Excel report. The endpoint caps a
// page at 100, so the whole population is drained page by page.
//
// Pages after the first are bounded rather than fired at once: at 100 rows a
// page a large population would otherwise open hundreds of simultaneous
// requests, which is the same failure mode as the per-organisation fan-out this
// change removes, one level up. p-map's default stopOnError is kept so a failed
// page fails the report outright rather than writing a short file that looks
// complete.
export async function fetchAllUnsubmittedOrganisations(api, params, traceId) {
  const first = await api.listUnsubmittedComplianceDeclarations(
    { ...params, page: 1, pageSize: DECLARATIONS_BATCH_SIZE },
    traceId
  )
  const totalPages = Math.ceil(first.total / DECLARATIONS_BATCH_SIZE)

  if (totalPages <= 1) {
    return first.unsubmittedOrganisations
  }

  const remaining = await pMap(
    Array.from({ length: totalPages - 1 }, (_, i) => i + 2),
    (page) =>
      api.listUnsubmittedComplianceDeclarations(
        { ...params, page, pageSize: DECLARATIONS_BATCH_SIZE },
        traceId
      ),
    { concurrency: DOWNLOAD_PAGE_CONCURRENCY }
  )
  assertSameTotal(first, remaining, 'compliance-declarations/unsubmitted')

  return [
    ...first.unsubmittedOrganisations,
    ...remaining.flatMap((r) => r.unsubmittedOrganisations)
  ]
}
