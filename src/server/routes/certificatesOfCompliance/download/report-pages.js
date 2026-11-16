import pMap from 'p-map'
import {
  DECLARATIONS_BATCH_SIZE,
  DOWNLOAD_PAGE_CONCURRENCY
} from '../common/constants.js'

// Thrown when a result set's total changes between pages: a row may have been skipped.
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

// Every page of matching declarations, at most DOWNLOAD_PAGE_CONCURRENCY at a time.
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

// Every page of unsubmitted organisations, at most DOWNLOAD_PAGE_CONCURRENCY at
// a time. A failed page fails the whole report rather than leaving it short.
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
