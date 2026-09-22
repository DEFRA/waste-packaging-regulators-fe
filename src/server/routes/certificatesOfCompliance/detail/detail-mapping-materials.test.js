import { describe, expect, it } from 'vitest'
import {
  deriveRecyclingObligationsMet,
  mapRecyclingObligationsMet
} from './detail-mapping-materials.js'

describe('detail-mapping-materials.js', () => {
  describe('mapRecyclingObligationsMet', () => {
    it('returns null if obligationStatus is null or undefined', () => {
      expect(mapRecyclingObligationsMet(null)).toBeNull()
      expect(mapRecyclingObligationsMet(undefined)).toBeNull()
    })

    it('returns true if obligationStatus is Met', () => {
      expect(mapRecyclingObligationsMet('Met')).toBe(true)
      expect(mapRecyclingObligationsMet('met')).toBe(true)
    })

    it('returns false if obligationStatus is anything else', () => {
      expect(mapRecyclingObligationsMet('NotMet')).toBe(false)
    })
  })

  describe('deriveRecyclingObligationsMet', () => {
    it('returns null if hasObligations is false', () => {
      expect(deriveRecyclingObligationsMet([])).toBeNull()
    })

    it('returns true if derived status is met', () => {
      const obligations = [{ material: 'Glass', tonnages: {}, status: 'Met' }]
      expect(deriveRecyclingObligationsMet(obligations)).toBe(true)
    })

    it('returns false if derived status is not-met', () => {
      const obligations = [
        { material: 'Glass', tonnages: {}, status: 'NotMet' }
      ]
      expect(deriveRecyclingObligationsMet(obligations)).toBe(false)
    })

    it('returns null if derived status is no-data', () => {
      const obligations = [
        { material: 'Glass', tonnages: {}, status: 'NoDataYet' }
      ]
      expect(deriveRecyclingObligationsMet(obligations)).toBeNull()
    })

    it('throws an error for an unknown status', () => {
      const obligations = [
        { material: 'Glass', tonnages: {}, status: 'UnknownStatus' }
      ]
      expect(() => deriveRecyclingObligationsMet(obligations)).toThrow(
        'Unexpected obligation status: UnknownStatus'
      )
    })
  })
})
