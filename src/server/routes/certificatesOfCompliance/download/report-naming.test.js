import { buildReportFilename, buildReportHeading } from './report-naming.js'

describe('#report-naming', () => {
  describe('buildReportFilename', () => {
    test('names a direct producer report after certificates', () => {
      expect(
        buildReportFilename(
          'direct-producers',
          new Date('2026-10-19T09:00:00Z')
        )
      ).toBe('2026-certificates-of-compliance-all-19-10-2026.xlsx')
    })

    test('names a compliance scheme report after statements', () => {
      expect(
        buildReportFilename(
          'compliance-schemes',
          new Date('2026-10-19T09:00:00Z')
        )
      ).toBe('2026-statements-of-compliance-all-19-10-2026.xlsx')
    })

    test('uses the London date late in the evening during British Summer Time', () => {
      expect(
        buildReportFilename(
          'direct-producers',
          new Date('2026-06-30T23:30:00Z')
        )
      ).toBe('2026-certificates-of-compliance-all-01-07-2026.xlsx')
    })
  })

  describe('buildReportHeading', () => {
    test('matches the ticket example for direct producers', () => {
      expect(
        buildReportHeading('direct-producers', new Date('2026-10-19T09:00:00Z'))
      ).toBe('All certificate of compliance submissions, Monday 19 October')
    })

    test('uses statement for compliance schemes', () => {
      expect(
        buildReportHeading(
          'compliance-schemes',
          new Date('2026-10-19T09:00:00Z')
        )
      ).toBe('All statement of compliance submissions, Monday 19 October')
    })

    test('uses the London day during British Summer Time', () => {
      expect(
        buildReportHeading('direct-producers', new Date('2026-06-30T23:30:00Z'))
      ).toBe('All certificate of compliance submissions, Wednesday 1 July')
    })
  })
})
