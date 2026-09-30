import { describe, expect, it } from 'vitest'
import {
  deriveRecyclingObligationsMet,
  mapDeclarationMaterialGroups,
  mapRecyclingObligationsMet
} from './detail-mapping-materials.js'

const obligation = (material, obligated, accepted, status) => ({
  material,
  tonnages: {
    obligated,
    accepted,
    awaitingAcceptance: 0,
    outstanding: Math.max(obligated - accepted, 0)
  },
  status
})

describe('detail-mapping-materials.js', () => {
  describe('mapDeclarationMaterialGroups', () => {
    it('inserts a synthetic Glass total row computed from GlassRemelt + Glass breakdown', () => {
      const obligations = [
        obligation('GlassRemelt', 420, 380, 'NotMet'),
        // NoDataYet rows have null tonnages from the API — outstanding maps to 0
        {
          material: 'Glass',
          tonnages: {
            obligated: 220,
            accepted: null,
            awaitingAcceptance: null,
            outstanding: null
          },
          status: 'NoDataYet'
        }
      ]
      const { materials, glassBreakdownTotals } =
        mapDeclarationMaterialGroups(obligations)
      const glass = materials.find((m) => m.name === 'Glass')

      // Synthetic Glass = GlassRemelt(380) + Glass/remaining(0)
      expect(glass.obligationToMeet).toBe(640)
      expect(glass.accepted).toBe(380)
      expect(glass.outstanding).toBe(40)
      expect(glass.status).toBe('not-met')

      // Synthetic Glass row and breakdown totals must be identical
      expect(glass.obligationToMeet).toBe(glassBreakdownTotals.obligationToMeet)
      expect(glass.accepted).toBe(glassBreakdownTotals.accepted)
      expect(glass.awaitingAcceptance).toBe(
        glassBreakdownTotals.awaitingAcceptance
      )
      expect(glass.outstanding).toBe(glassBreakdownTotals.outstanding)
      expect(glass.status).toBe(glassBreakdownTotals.status)
    })

    it('returns materials and glass breakdown rows in alphabetical order', () => {
      const obligations = [
        obligation('Wood', 80, 80, 'Met'),
        obligation('Aluminium', 215, 215, 'Met'),
        obligation('Glass', 220, 220, 'Met'),
        obligation('GlassRemelt', 420, 420, 'Met'),
        obligation('Steel', 365, 365, 'Met'),
        obligation('Plastic', 1740, 1740, 'Met'),
        obligation('PaperBoardFibre', 870, 870, 'Met')
      ]
      const { materials, glassBreakdown } =
        mapDeclarationMaterialGroups(obligations)

      expect(materials.map((m) => m.name)).toEqual([
        'Aluminium',
        'Glass', // synthetic total
        'PaperBoardFibre',
        'Plastic',
        'Steel',
        'Wood'
      ])
      expect(glassBreakdown.map((r) => r.name)).toEqual([
        'Glass',
        'GlassRemelt'
      ])
    })

    it('uses the single glass breakdown material as the synthetic Glass total when only one is present', () => {
      const obligations = [obligation('GlassRemelt', 640, 500, 'NotMet')]
      const { materials } = mapDeclarationMaterialGroups(obligations)
      const glass = materials.find((m) => m.name === 'Glass')

      expect(glass.accepted).toBe(500)
    })
  })

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
