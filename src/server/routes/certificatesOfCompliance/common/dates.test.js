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

  test('formatSubmissionDate returns null for empty input', () => {
    expect(formatSubmissionDate(null, 'en')).toBeNull()
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
})
