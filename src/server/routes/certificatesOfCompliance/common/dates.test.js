import { translate } from '#server/common/helpers/i18n/translate.js'
import { formatDate, formatHistoryDate, formatSubmissionDate } from './dates.js'

describe('dates', () => {
  test('formatDate returns null for empty input', () => {
    expect(formatDate(null, 'en')).toBeNull()
  })

  test('formatDate formats English dates', () => {
    expect(formatDate('2026-01-15T00:00:00.000Z', 'en')).toContain('2026')
  })

  test('formatDate formats Welsh month names', () => {
    expect(formatDate('2026-01-15T00:00:00.000Z', 'cy')).toMatch(/Ionawr|2026/)
  })

  test('formatDate with format string produces English ordinal date', () => {
    expect(formatDate('2026-01-15T00:00:00.000Z', 'en', 'do MMMM yyyy')).toBe(
      '15th January 2026'
    )
  })

  test('formatDate with format string produces Welsh ordinal date', () => {
    expect(formatDate('2026-01-15T00:00:00.000Z', 'cy', 'do MMMM yyyy')).toBe(
      '15fed Ionawr 2026'
    )
  })

  test('formatSubmissionDate returns null for empty input', () => {
    expect(formatSubmissionDate(null, 'en')).toBeNull()
  })

  test('formatSubmissionDate accepts a Date object', () => {
    const date = new Date('2026-01-15T14:30:00.000Z')
    const result = formatSubmissionDate(date, 'en')
    expect(result).toContain('2026')
  })

  test('formatSubmissionDate uses locale dateTime connector for English and Welsh', () => {
    const english = formatSubmissionDate('2026-01-15T14:30:00.000Z', 'en')
    const welsh = formatSubmissionDate('2026-01-15T14:30:00.000Z', 'cy')

    expect(english).toContain(` ${translate('en', 'common.dateTime.at')} `)
    expect(welsh).toContain(` ${translate('cy', 'common.dateTime.at')} `)
  })

  test('formatHistoryDate returns null for empty input', () => {
    expect(formatHistoryDate(null, 'en')).toBeNull()
  })

  test('formatHistoryDate uses locale dateTime connector for English and Welsh', () => {
    const english = formatHistoryDate('2026-01-15T14:30:00.000Z', 'en')
    const welsh = formatHistoryDate('2026-01-15T14:30:00.000Z', 'cy')

    expect(english).toContain(` ${translate('en', 'common.dateTime.at')} `)
    expect(welsh).toContain(` ${translate('cy', 'common.dateTime.at')} `)
  })

  // Production runs with TZ=Europe/London (see Dockerfile); the test script
  // forces TZ=UTC, so these tests switch to the production zone.
  describe('in the production time zone', () => {
    const originalTz = process.env.TZ
    const at = (locale) => translate(locale, 'common.dateTime.at')

    beforeAll(() => {
      process.env.TZ = 'Europe/London'
    })

    afterAll(() => {
      process.env.TZ = originalTz
    })

    test.each([
      ['GMT (winter)', '2026-01-15T14:30:00.000Z', '15 January 2026', '14:30'],
      [
        'BST (summer)',
        '2026-10-01T15:41:45.686+00:00',
        '1 October 2026',
        '16:41'
      ],
      [
        'BST past UTC midnight',
        '2026-06-30T23:30:00.000Z',
        '1 July 2026',
        '00:30'
      ],
      [
        'BST before clocks go back',
        '2026-10-25T00:30:00.000Z',
        '25 October 2026',
        '01:30'
      ],
      [
        'GMT after clocks go back',
        '2026-10-25T01:30:00.000Z',
        '25 October 2026',
        '01:30'
      ],
      [
        'BST after clocks go forward',
        '2026-03-29T01:30:00.000Z',
        '29 March 2026',
        '02:30'
      ]
    ])(
      'history and submission dates show the same UK time: %s',
      (_, isoString, date, time) => {
        const expected = `${date} ${at('en')} ${time}`

        expect(formatHistoryDate(isoString, 'en')).toBe(expected)
        expect(formatSubmissionDate(isoString, 'en')).toBe(expected)
      }
    )

    test('Welsh history and submission dates show the same UK time', () => {
      const isoString = '2026-06-30T23:30:00.000Z'
      const expected = `1 Gorffennaf 2026 ${at('cy')} 00:30`

      expect(formatHistoryDate(isoString, 'cy')).toBe(expected)
      expect(formatSubmissionDate(isoString, 'cy')).toBe(expected)
    })
  })
})
