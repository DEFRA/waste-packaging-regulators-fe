import { cancellationToReportEntry } from './report-rows.js'

const regulator = (name) => ({ id: 'reg', email: 'r@example.gov.uk', name })

function cancelledSubmission({
  created = '2026-10-31T09:00:00Z',
  registrationType = 'DirectProducer',
  acceptedAt = null,
  cancelled = {
    timestamp: '2026-11-10T14:30:00Z',
    user: regulator('Test User'),
    reason: 'Not signed by correct person'
  }
} = {}) {
  return {
    id: 'decl-cancelled',
    created,
    updated: '2026-11-12T08:00:00Z',
    status: 'Cancelled',
    organisation: { id: 'org-1', registrationType },
    audit: [
      {
        action: 'Submitted',
        timestamp: created,
        user: regulator('Jane Smith')
      },
      ...(acceptedAt
        ? [
            {
              action: 'Accepted',
              timestamp: acceptedAt,
              user: regulator('John Doe')
            }
          ]
        : []),
      ...(cancelled ? [{ action: 'Cancelled', ...cancelled }] : [])
    ]
  }
}

describe('#cancellationToReportEntry', () => {
  test('maps a submission cancelled while pending', () => {
    expect(cancellationToReportEntry(cancelledSubmission())).toEqual({
      dateSubmitted: new Date('2026-10-31T00:00:00Z'),
      dateCancelled: new Date('2026-11-10T00:00:00Z'),
      cancelledBy: 'Test User',
      reason: 'Not signed by correct person',
      statusWhenCancelled: 'Pending'
    })
  })

  test('shows Accepted for a submission accepted and then cancelled', () => {
    const entry = cancellationToReportEntry(
      cancelledSubmission({ acceptedAt: '2026-11-02T10:00:00Z' })
    )

    expect(entry.statusWhenCancelled).toBe('Accepted')
  })

  test.each([
    ['DirectProducer', 'Producer requested to cancel'],
    ['ComplianceScheme', 'Compliance scheme requested to cancel']
  ])(
    'words the reason for the organisation type: %s',
    (registrationType, expected) => {
      const cancelled = {
        timestamp: '2026-11-10T14:30:00Z',
        user: regulator('Test User'),
        reason: 'RequestedToCancel'
      }

      expect(
        cancellationToReportEntry(
          cancelledSubmission({ registrationType, cancelled })
        ).reason
      ).toBe(expected)
    }
  )

  test('keeps a reason it does not recognise as stored', () => {
    const cancelled = {
      timestamp: '2026-11-10T14:30:00Z',
      user: regulator('Test User'),
      reason: 'Submitted after the deadline.'
    }

    expect(
      cancellationToReportEntry(cancelledSubmission({ cancelled })).reason
    ).toBe('Submitted after the deadline.')
  })

  test('reads the dates in UK time', () => {
    const entry = cancellationToReportEntry(
      cancelledSubmission({
        created: '2026-06-30T23:30:00Z',
        cancelled: {
          timestamp: '2026-07-31T23:30:00Z',
          user: regulator('Test User'),
          reason: 'Recycling obligations changed'
        }
      })
    )

    expect(entry.dateSubmitted).toEqual(new Date('2026-07-01T00:00:00Z'))
    expect(entry.dateCancelled).toEqual(new Date('2026-08-01T00:00:00Z'))
  })

  test('leaves the cancellation details blank without a Cancelled audit entry', () => {
    expect(
      cancellationToReportEntry(cancelledSubmission({ cancelled: null }))
    ).toMatchObject({
      dateCancelled: null,
      cancelledBy: null,
      reason: null,
      statusWhenCancelled: null
    })
  })

  test('still shows Accepted from the Accepted audit entry without a Cancelled one', () => {
    const entry = cancellationToReportEntry(
      cancelledSubmission({
        acceptedAt: '2026-11-02T10:00:00Z',
        cancelled: null
      })
    )

    expect(entry.statusWhenCancelled).toBe('Accepted')
  })
})
