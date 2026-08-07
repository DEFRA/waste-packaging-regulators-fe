import { describe, expect, test } from 'vitest'
import { resolveSortForTab } from './controller.js'

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

describe('resolveSortForTab', () => {
  test('persists sort from query params for the active tab', () => {
    const request = createMockRequest({
      sortColumn: 'dateSubmitted',
      sortDirection: 'desc'
    })

    const result = resolveSortForTab(request, 'pending', 'direct-producers')

    expect(result).toEqual({
      sortColumn: 'dateSubmitted',
      sortDirection: 'desc'
    })
    expect(request.yar._store['complianceListSort:direct-producers']).toEqual({
      pending: { column: 'dateSubmitted', direction: 'desc' }
    })
  })

  test('restores stored sort when tab link omits sort query params', () => {
    const request = createMockRequest(
      { tab: 'pending' },
      {
        'complianceListSort:direct-producers': {
          pending: { column: 'dateSubmitted', direction: 'desc' },
          accepted: { column: 'recyclingObligationsMet', direction: 'asc' }
        }
      }
    )

    const result = resolveSortForTab(request, 'pending', 'direct-producers')

    expect(result).toEqual({
      sortColumn: 'dateSubmitted',
      sortDirection: 'desc'
    })
  })

  test('uses tab defaults when no stored sort exists', () => {
    const request = createMockRequest({ tab: 'not-submitted' })

    const result = resolveSortForTab(
      request,
      'not-submitted',
      'direct-producers'
    )

    expect(result).toEqual({
      sortColumn: 'obligationCoveragePercentage',
      sortDirection: 'asc'
    })
  })
})
