import {
  clearLocaleCacheForTests,
  seedLocaleDictionaryForTests
} from '#server/common/helpers/i18n/translate.js'
import { reportLabels, reportLocale } from './report-labels.js'
import { buildReportHeading } from './report-naming.js'

const NOW = new Date('2026-10-19T09:00:00Z')

// Placeholder strings, not real Welsh: they only show where each label comes from.
const completeWelshReport = {
  sheetName: 'CY Report',
  heading: {
    certificates: 'CY certificates heading, {{day}}',
    statements: 'CY statements heading, {{day}}'
  },
  columns: Object.fromEntries(
    [
      'organisationName',
      'organisationReference',
      'status',
      'regulation43',
      'recyclingObligations',
      'percentageMet',
      'totalObligationTonnes',
      'dateSubmitted',
      'dateAccepted',
      'acceptedBy',
      'cancellations'
    ].map((key) => [key, `CY ${key}`])
  ),
  cancellation: {
    heading: 'CY Cancellation {{number}}',
    columns: Object.fromEntries(
      [
        'dateSubmitted',
        'dateCancelled',
        'cancelledBy',
        'reason',
        'statusWhenCancelled'
      ].map((key) => [key, `CY ${key}`])
    )
  },
  status: {
    pending: 'CY Pending',
    accepted: 'CY Accepted',
    notSubmitted: 'CY Not submitted'
  },
  recyclingObligations: { met: 'CY Met', notMet: 'CY Not met' },
  regulation43: { compliant: 'CY Compliant', notCompliant: 'CY Not compliant' }
}

const seedWelshReport = (report) =>
  seedLocaleDictionaryForTests('cy', { certificatesOfCompliance: { report } })

describe('#report-labels', () => {
  afterEach(() => {
    clearLocaleCacheForTests()
  })

  test('uses the English strings by default', () => {
    const labels = reportLabels()

    expect(labels.bcp47).toBe('en-GB')
    expect(labels.sheetName).toBe('Report')
    expect(labels.columns.totalObligationTonnes).toBe(
      'Total obligation (tonnes)'
    )
    expect(labels.status.notSubmitted).toBe('Not submitted')
    expect(labels.recyclingObligations.notMet).toBe('Not met')
    expect(labels.regulation43.notCompliant).toBe('Not compliant')
    expect(labels.cancellation.heading(2)).toBe('Cancellation 2')
    expect(labels.cancellation.columns.statusWhenCancelled).toBe(
      'Status when cancelled'
    )
  })

  test('keeps a Welsh report in English while cy.json has no report strings', () => {
    expect(reportLocale('cy')).toBe('en')
    expect(reportLabels('cy').status.pending).toBe('Pending')
    expect(
      buildReportHeading('direct-producers', NOW, reportLabels('cy'))
    ).toBe('All certificate of compliance submissions, Monday 19 October')
  })

  test('every English label is a real string, not a missing key', () => {
    const labels = reportLabels()
    const values = [
      labels.sheetName,
      labels.heading.certificates('day'),
      labels.heading.statements('day'),
      ...Object.values(labels.columns),
      labels.cancellation.heading(1),
      ...Object.values(labels.cancellation.columns),
      ...Object.values(labels.status),
      ...Object.values(labels.recyclingObligations),
      ...Object.values(labels.regulation43)
    ]

    expect(values).toHaveLength(27)
    values.forEach((value) =>
      expect(value).not.toMatch(/^certificatesOfCompliance\./)
    )
  })

  test('switches to Welsh, including the day in the heading, once every report string is translated', () => {
    seedWelshReport(completeWelshReport)

    const labels = reportLabels('cy')

    expect(reportLocale('cy')).toBe('cy')
    expect(labels.bcp47).toBe('cy-GB')
    expect(labels.sheetName).toBe('CY Report')
    expect(labels.columns.organisationName).toBe('CY organisationName')
    expect(labels.status.pending).toBe('CY Pending')
    expect(labels.cancellation.heading(1)).toBe('CY Cancellation 1')
    expect(labels.cancellation.columns.reason).toBe('CY reason')
    expect(buildReportHeading('compliance-schemes', NOW, labels)).toBe(
      'CY statements heading, Dydd Llun 19 Hydref'
    )
  })

  test('keeps the whole report in English while the Welsh report section is incomplete', () => {
    const { status, ...withoutStatus } = completeWelshReport
    seedWelshReport({ ...withoutStatus, status: { pending: 'CY Pending' } })

    const labels = reportLabels('cy')

    expect(reportLocale('cy')).toBe('en')
    expect(labels.columns.organisationName).toBe('Organisation name')
    expect(labels.status.pending).toBe('Pending')
    expect(buildReportHeading('direct-producers', NOW, labels)).toBe(
      'All certificate of compliance submissions, Monday 19 October'
    )
  })

  test('keeps the report in English for an empty Welsh report section', () => {
    seedWelshReport({})

    expect(reportLocale('cy')).toBe('en')
  })
})
