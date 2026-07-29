import { describe, expect, test } from 'vitest'
import { calculateObligationCoveragePercentage } from './obligation-coverage.js'

function makeObligation(accepted, obligated) {
  return { tonnages: { accepted, obligated } }
}

describe('calculateObligationCoveragePercentage', () => {
  test('returns 0 when total obligated is zero', () => {
    expect(calculateObligationCoveragePercentage([])).toBe(0)
    expect(calculateObligationCoveragePercentage([makeObligation(10, 0)])).toBe(
      0
    )
  })

  describe('Jira AC scenarios', () => {
    test('scenario 2: 850 accepted / 925 obligated → 92%', () => {
      expect(
        calculateObligationCoveragePercentage([makeObligation(850, 925)])
      ).toBe(92)
    })

    test('scenario 3: 0 accepted → 0%', () => {
      expect(
        calculateObligationCoveragePercentage([makeObligation(0, 925)])
      ).toBe(0)
    })

    test('scenario 4: equal accepted and obligated → 100%', () => {
      expect(
        calculateObligationCoveragePercentage([makeObligation(500, 500)])
      ).toBe(100)
    })

    test('scenario 5: accepted exceeds obligated → capped at 100%', () => {
      expect(
        calculateObligationCoveragePercentage([makeObligation(1150, 925)])
      ).toBe(100)
    })

    test('scenario 6: 53.5% raw → 54%', () => {
      expect(
        calculateObligationCoveragePercentage([makeObligation(107, 200)])
      ).toBe(54)
    })

    test('scenario 7: null tonnages treated as zero', () => {
      expect(
        calculateObligationCoveragePercentage([
          { tonnages: { accepted: null, obligated: 425 } },
          { tonnages: { accepted: 850, obligated: 500 } }
        ])
      ).toBe(92)
    })
  })

  describe('PR #152 parity with ObligationCoveragePercentageCalculatorTests', () => {
    test.each([
      [850, 925, 92],
      [500, 500, 100],
      [1150, 925, 100],
      [107, 200, 54],
      [0, 925, 0]
    ])('%i / %i → %i', (accepted, obligated, expected) => {
      expect(
        calculateObligationCoveragePercentage([
          makeObligation(accepted, obligated)
        ])
      ).toBe(expected)
    })

    test('multi-material cap: 100+0 accepted / 50+50 obligated → 100%', () => {
      expect(
        calculateObligationCoveragePercentage([
          makeObligation(100, 50),
          makeObligation(0, 50)
        ])
      ).toBe(100)
    })

    test.each([
      [1, 200, 1],
      [1, 201, 0],
      [1, 199, 1]
    ])('near 0.5%% midpoint: %i / %i → %i', (accepted, obligated, expected) => {
      expect(
        calculateObligationCoveragePercentage([
          makeObligation(accepted, obligated)
        ])
      ).toBe(expected)
    })

    test.each([
      [67, 200, 34],
      [167, 500, 33],
      [168, 500, 34]
    ])(
      'near 33.5%% midpoint: %i / %i → %i',
      (accepted, obligated, expected) => {
        expect(
          calculateObligationCoveragePercentage([
            makeObligation(accepted, obligated)
          ])
        ).toBe(expected)
      }
    )

    test.each([
      [101, 200, 51],
      [100, 201, 50],
      [101, 199, 51]
    ])(
      'near 50.5%% midpoint: %i / %i → %i',
      (accepted, obligated, expected) => {
        expect(
          calculateObligationCoveragePercentage([
            makeObligation(accepted, obligated)
          ])
        ).toBe(expected)
      }
    )
  })
})
