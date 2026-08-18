import { describe, expect, test } from 'vitest'
import { resolveSortForSubmissionStatus } from './controller.js'

function createMockRequest(query = {}, yarData = {}) {
  const store = { ...yarData }
  return {
    query,
    yar: {
      get(key) {
        return store[key]
      },
      set(key, value) {
        store[key] = value
      },
      _store: store
    }
  }
}

describe('resolveSortForSubmissionStatus', () => {
  test('persists sort from query params for the active tab', () => {
    const request = createMockRequest({
      sort: 'DateSubmitted[desc]'
    })

    const result = resolveSortForSubmissionStatus(
      request,
      'pending',
      'direct-producers'
    )

    expect(result).toEqual({
      sortColumn: 'DateSubmitted',
      sortDirection: 'desc'
    })
    expect(request.yar._store['complianceListSort:direct-producers']).toEqual({
      pending: { column: 'DateSubmitted', direction: 'desc' }
    })
  })

  test('restores stored sort when tab link omits sort query params', () => {
    const request = createMockRequest(
      { tab: 'pending' },
      {
        'complianceListSort:direct-producers': {
          pending: { column: 'DateSubmitted', direction: 'desc' },
          accepted: { column: 'RecyclingObligations', direction: 'asc' }
        }
      }
    )

    const result = resolveSortForSubmissionStatus(
      request,
      'pending',
      'direct-producers'
    )

    expect(result).toEqual({
      sortColumn: 'DateSubmitted',
      sortDirection: 'desc'
    })
  })

  test('uses tab defaults when no stored sort exists', () => {
    const request = createMockRequest({ tab: 'not-submitted' })

    const result = resolveSortForSubmissionStatus(
      request,
      'not-submitted',
      'direct-producers'
    )

    expect(result).toEqual({
      sortColumn: 'OrganisationName',
      sortDirection: 'asc'
    })
  })
})
