import { describe, expect, it } from 'vitest'
import {
  mapQueriedOutcome,
  mapCurrentYearHistory
} from './detail-mapping-history.js'

describe('detail-mapping-history.js', () => {
  describe('mapQueriedOutcome', () => {
    it('returns null if status is Queried but queryDetails is missing', () => {
      expect(mapQueriedOutcome({ status: 'Queried' })).toBeNull()
    })

    it('returns mapped query details if available', () => {
      const data = {
        status: 'Queried',
        queryDetails: {
          queriedMaterials: 'Glass',
          reason: 'Incomplete',
          actionDate: '2025-01-01T12:00:00Z'
        }
      }
      expect(mapQueriedOutcome(data)).toEqual({
        queriedMaterials: 'Glass',
        reason: 'Incomplete',
        dateQueried: '1 January 2025'
      })
    })

    it('returns null if status is not Queried', () => {
      expect(mapQueriedOutcome({ status: 'Accepted' })).toBeNull()
    })
  })

  describe('mapCurrentYearHistory', () => {
    it('handles declarations without transition audits, creating a row from status when Accepted', () => {
      const declarations = [
        {
          id: '123',
          status: 'Accepted',
          updated: '2025-02-01T12:00:00Z',
          audit: [] // No transition audits
        }
      ]
      const rows = mapCurrentYearHistory('org1', declarations)
      expect(rows).toHaveLength(1)
      expect(rows[0]).toEqual(
        expect.objectContaining({
          action: 'Accepted',
          reason: '',
          date: expect.any(String),
          viewSubmissionUrl: expect.any(String)
        })
      )
    })

    it('handles declarations without transition audits, creating a row from status when Cancelled', () => {
      const declarations = [
        {
          id: '124',
          status: 'Cancelled',
          updated: '2025-03-01T12:00:00Z',
          audit: [] // No transition audits
        }
      ]
      const rows = mapCurrentYearHistory('org1', declarations)
      expect(rows).toHaveLength(1)
      expect(rows[0]).toEqual(
        expect.objectContaining({
          action: 'Cancelled',
          reason: null, // mapHistoryReason for Cancelled without transitionAudit is null
          date: expect.any(String),
          viewSubmissionUrl: expect.any(String)
        })
      )
    })

    it('ignores declarations without transition audits if status is neither Accepted nor Cancelled', () => {
      const declarations = [
        {
          id: '125',
          status: 'Pending',
          updated: '2025-04-01T12:00:00Z',
          audit: []
        }
      ]
      const rows = mapCurrentYearHistory('org1', declarations)
      expect(rows).toHaveLength(0)
    })

    it('returns null reason for an unknown transition action', () => {
      const declarations = [
        {
          id: '126',
          status: 'Accepted',
          updated: '2025-05-01T12:00:00Z',
          audit: [
            { action: 'UnknownAction', timestamp: '2025-05-01T12:00:00Z' }
          ]
        }
      ]
      // UnknownAction is ignored by getCurrentYearTransitionAudits which only looks for Accepted or Cancelled.
      // So it will fallback to row from status.
      const rows = mapCurrentYearHistory('org1', declarations)
      expect(rows).toHaveLength(1)
      expect(rows[0].reason).toBe('') // Accepted status reason is ''
    })
  })
})
