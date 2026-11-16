import { toLondonCalendarDate } from './report-dates.js'

describe('#report-dates', () => {
  describe('toLondonCalendarDate', () => {
    test('returns the London calendar date at UTC midnight', () => {
      expect(toLondonCalendarDate('2026-12-19T10:42:07+00:00')).toEqual(
        new Date('2026-12-19T00:00:00Z')
      )
    })

    test('moves a late-evening BST instant to the next London day', () => {
      expect(toLondonCalendarDate('2026-06-01T23:30:00Z')).toEqual(
        new Date('2026-06-02T00:00:00Z')
      )
    })

    test('keeps a late-evening GMT instant on the same day', () => {
      expect(toLondonCalendarDate('2026-12-01T23:30:00Z')).toEqual(
        new Date('2026-12-01T00:00:00Z')
      )
    })

    test.each([null, undefined, '', 'not a date'])(
      'returns null for %p',
      (value) => {
        expect(toLondonCalendarDate(value)).toBeNull()
      }
    )
  })
})
