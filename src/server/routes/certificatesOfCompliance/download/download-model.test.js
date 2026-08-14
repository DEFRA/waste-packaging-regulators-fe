import { describe, expect, test } from 'vitest'
import {
  buildComplianceCsv,
  buildDownloadFilename,
  buildDownloadTitle
} from './download-model.js'

const NOW = new Date(2026, 6, 30, 14, 30, 5)

describe('#buildDownloadTitle', () => {
  test('includes the submission status, document noun, full date and time', () => {
    expect(buildDownloadTitle('direct-producers', 'pending', NOW)).toBe(
      'Pending certificate of compliance submissions, Thursday 30 July 2026, 14:30:05'
    )
  })

  test('uses "statement of compliance" for compliance schemes', () => {
    expect(buildDownloadTitle('compliance-schemes', 'accepted', NOW)).toContain(
      'Accepted statement of compliance submissions'
    )
  })
})

describe('#buildDownloadFilename', () => {
  test('follows the year-noun-status-timestamp pattern for direct producers', () => {
    expect(buildDownloadFilename('direct-producers', 'pending', NOW)).toBe(
      '2026-certificates-of-compliance-pending-2026-07-30-14-30-05.csv'
    )
  })

  test('uses "statements" for compliance schemes and the not-submitted status', () => {
    expect(
      buildDownloadFilename('compliance-schemes', 'not-submitted', NOW)
    ).toBe(
      '2026-statements-of-compliance-not-submitted-2026-07-30-14-30-05.csv'
    )
  })
})

describe('#buildComplianceCsv', () => {
  test('title row, then header row, then one row per item', async () => {
    const items = [
      {
        organisationId: 'org-1',
        organisationName: 'Redwood Ltd',
        organisationReferenceNumber: '518293',
        recyclingObligationsMet: true,
        obligationCoveragePercentage: 97,
        dateSubmitted: '2027-01-31'
      }
    ]

    const { csv } = buildComplianceCsv({
      organisationType: 'direct-producers',
      submissionStatus: 'pending',
      items,
      now: NOW
    })

    const { loadCsv } = await import('./download.page-object.js')
    const { title, rows } = loadCsv(csv)

    expect(title).toBe(
      'Pending certificate of compliance submissions, Thursday 30 July 2026, 14:30:05'
    )

    expect(rows).toHaveLength(1)
    expect(rows[0]['Organisation name']).toBe('Redwood Ltd')
    expect(rows[0]['Percentage met']).toBe('97%')
    expect(rows[0]['Date submitted']).toBe('31 January 2027')
  })

  test('empty list yields title and header rows only', async () => {
    const { csv } = buildComplianceCsv({
      organisationType: 'direct-producers',
      submissionStatus: 'accepted',
      items: [],
      now: NOW
    })

    const { loadCsv } = await import('./download.page-object.js')
    const { rows } = loadCsv(csv)

    expect(rows).toHaveLength(0)
  })

  test('not-submitted omits the date submitted column entirely', async () => {
    const items = [
      {
        organisationId: 'org-2',
        organisationName: 'Coastal Ltd',
        organisationReferenceNumber: '627148',
        obligationCoveragePercentage: 40
      }
    ]

    const { csv } = buildComplianceCsv({
      organisationType: 'direct-producers',
      submissionStatus: 'not-submitted',
      items,
      now: NOW
    })

    const { loadCsv } = await import('./download.page-object.js')
    const { rows } = loadCsv(csv)

    expect(rows[0]['Organisation name']).toBe('Coastal Ltd')
    expect(rows[0]['Percentage met']).toBe('40%')
    expect(rows[0]['Date submitted']).toBeUndefined()
    expect(rows[0]['Recycling obligations']).toBe('')
  })

  test('compliance schemes fill Regulation 43 and omit Percentage met', async () => {
    const items = [
      {
        organisationId: 'cs-1',
        organisationName: 'Futurepack',
        organisationReferenceNumber: 'CS100',
        recyclingObligationsMet: true,
        regulation43Met: true,
        obligationCoveragePercentage: 88,
        dateSubmitted: '2027-01-10'
      }
    ]

    const { csv } = buildComplianceCsv({
      organisationType: 'compliance-schemes',
      submissionStatus: 'pending',
      items,
      now: NOW
    })

    const { loadCsv } = await import('./download.page-object.js')
    const { rows } = loadCsv(csv)

    expect(rows[0]['Percentage met']).toBeUndefined()
    expect(rows[0]['Regulation 43']).toBe('Compliant')
    expect(rows[0]['Recycling obligations']).toBe('Met')
  })
})
