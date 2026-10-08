import { describe, expect, it } from 'vitest'
import { getCancelReasonLabel } from '../cancel/reasons.js'
import { NO_DATA, NOT_APPLICABLE } from '../common/constants.js'
import {
  mapAcceptedOutcomeFields,
  mapCancelledOutcomeFields,
  mapQueriedOutcome,
  mapCurrentYearHistory
} from './detail-mapping-history.js'

const WELSH_PRODUCER_REQUEST_REASON = getCancelReasonLabel(
  'DirectProducer',
  'producer-request',
  'cy'
)

describe('detail-mapping-history.js', () => {
  describe('mapAcceptedOutcomeFields', () => {
    it('returns default null fields if status is not Accepted', () => {
      expect(mapAcceptedOutcomeFields({ status: 'Pending' })).toEqual({
        showAcceptedOutcome: false,
        acceptedBy: null,
        acceptedDate: null
      })
    })

    it('returns mapped accepted details if status is Accepted', () => {
      const data = {
        status: 'Accepted',
        updated: '2025-02-01T12:00:00Z',
        audit: [
          {
            action: 'Accepted',
            user: { name: 'John Doe' },
            timestamp: '2025-01-01T12:00:00Z'
          }
        ]
      }
      expect(mapAcceptedOutcomeFields(data)).toEqual({
        showAcceptedOutcome: true,
        acceptedBy: 'John Doe',
        acceptedDate: expect.any(String)
      })
    })
  })

  describe('mapCancelledOutcomeFields', () => {
    it('returns default null fields if status is not Cancelled', () => {
      expect(mapCancelledOutcomeFields({ status: 'Pending' })).toEqual({
        showCancelledOutcome: false,
        cancelledBy: null,
        cancelledDate: null,
        cancellationReason: null
      })
    })

    it('returns mapped cancelled details if status is Cancelled', () => {
      const data = {
        status: 'Cancelled',
        updated: '2025-02-01T12:00:00Z',
        audit: [
          {
            action: 'Cancelled',
            user: { name: 'Jane Smith' },
            timestamp: '2025-01-01T12:00:00Z',
            reason: 'Requested by user'
          }
        ]
      }
      expect(mapCancelledOutcomeFields(data)).toEqual({
        showCancelledOutcome: true,
        cancelledBy: 'Jane Smith',
        cancelledDate: expect.any(String),
        cancellationReason: 'Requested by user'
      })
    })

    it('localises a Welsh stored reason to English on the summary', () => {
      const data = {
        status: 'Cancelled',
        updated: '2025-02-01T12:00:00Z',
        organisation: { registrationType: 'DirectProducer' },
        audit: [
          {
            action: 'Cancelled',
            user: { name: 'Jane Smith' },
            timestamp: '2025-01-01T12:00:00Z',
            reason: WELSH_PRODUCER_REQUEST_REASON
          }
        ]
      }

      expect(mapCancelledOutcomeFields(data, 'en').cancellationReason).toBe(
        'Producer requested to cancel'
      )
    })
  })

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
          reason: NOT_APPLICABLE,
          by: NO_DATA,
          date: expect.any(String)
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
          by: NO_DATA,
          date: expect.any(String),
          viewSubmissionUrl: expect.any(String)
        })
      )
    })

    it('maps by to No data when the audit user has no name', () => {
      const declarations = [
        {
          id: '127',
          status: 'Accepted',
          updated: '2025-06-01T12:00:00Z',
          audit: [
            {
              action: 'Accepted',
              timestamp: '2025-06-01T12:00:00Z',
              user: { id: 'regulator-1', email: 'regulator@example.test' }
            }
          ]
        }
      ]
      const rows = mapCurrentYearHistory('org1', declarations)
      expect(rows).toHaveLength(1)
      expect(rows[0].by).toBe(NO_DATA)
      expect(rows[0].reason).toBe(NOT_APPLICABLE)
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
      expect(rows[0].reason).toBe(NOT_APPLICABLE)
    })

    it('handles declarations with Accepted transition audits', () => {
      const declarations = [
        {
          id: '127',
          status: 'Accepted',
          updated: '2025-06-01T12:00:00Z',
          audit: [
            {
              action: 'Accepted',
              timestamp: '2025-06-01T12:00:00Z',
              user: { name: 'Bob' }
            }
          ]
        }
      ]
      const rows = mapCurrentYearHistory('org1', declarations)
      expect(rows).toHaveLength(1)
      expect(rows[0]).toEqual(
        expect.objectContaining({
          action: 'Accepted',
          by: 'Bob',
          date: expect.any(String)
        })
      )
      expect(rows[0].viewSubmissionUrl).toBeUndefined()
    })

    it('handles declarations with Cancelled transition audits', () => {
      const declarations = [
        {
          id: '128',
          status: 'Cancelled',
          updated: '2025-07-01T12:00:00Z',
          audit: [
            {
              action: 'Cancelled',
              timestamp: '2025-07-01T12:00:00Z',
              user: { name: 'Alice' },
              reason: 'Oops'
            }
          ]
        }
      ]
      const rows = mapCurrentYearHistory('org1', declarations)
      expect(rows).toHaveLength(1)
      expect(rows[0]).toEqual(
        expect.objectContaining({
          action: 'Cancelled',
          by: 'Alice',
          reason: 'Oops',
          date: expect.any(String),
          viewSubmissionUrl: expect.any(String)
        })
      )
    })

    it('localises a Welsh stored reason to English in the current year table', () => {
      const declarations = [
        {
          id: '129',
          status: 'Cancelled',
          updated: '2025-08-01T12:00:00Z',
          organisation: { registrationType: 'DirectProducer' },
          audit: [
            {
              action: 'Cancelled',
              timestamp: '2025-08-01T12:00:00Z',
              user: { name: 'Alice' },
              reason: WELSH_PRODUCER_REQUEST_REASON
            }
          ]
        }
      ]

      const rows = mapCurrentYearHistory('org1', declarations, 'en')
      expect(rows[0].reason).toBe('Producer requested to cancel')
    })
  })
})
