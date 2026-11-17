import {
  cancelledAt,
  groupCancellationsByOrganisation
} from './cancellations.js'

function cancelled(id, organisationId, timestamp, extraAudit = []) {
  return {
    id,
    status: 'Cancelled',
    updated: timestamp,
    organisation: { id: organisationId },
    audit: [
      { action: 'Submitted', timestamp: '2026-11-01T09:00:00Z' },
      ...extraAudit,
      { action: 'Cancelled', timestamp }
    ]
  }
}

describe('#cancellations', () => {
  test('cancelledAt reads the Cancelled audit entry', () => {
    expect(cancelledAt(cancelled('d1', 'org-1', '2026-11-20T11:30:45Z'))).toBe(
      '2026-11-20T11:30:45Z'
    )
  })

  test('cancelledAt falls back to updated when there is no audit trail', () => {
    expect(
      cancelledAt({ updated: '2026-11-21T08:00:00Z', organisation: {} })
    ).toBe('2026-11-21T08:00:00Z')
  })

  test('cancelledAt falls back to updated when the Cancelled timestamp cannot be read', () => {
    expect(
      cancelledAt({
        updated: '2026-11-21T08:00:00Z',
        organisation: {},
        audit: [{ action: 'Cancelled', timestamp: 'not a date' }]
      })
    ).toBe('2026-11-21T08:00:00Z')
  })

  test('groups by organisation, oldest cancellation first by full timestamp', () => {
    const groups = groupCancellationsByOrganisation([
      cancelled('late', 'org-1', '2026-11-20T15:00:00Z'),
      cancelled('other', 'org-2', '2026-11-05T10:00:00Z'),
      cancelled('early', 'org-1', '2026-11-20T09:00:00Z')
    ])

    expect([...groups.keys()]).toEqual(['org-1', 'org-2'])
    expect(groups.get('org-1').map((d) => d.id)).toEqual(['early', 'late'])
    expect(groups.get('org-2')).toHaveLength(1)
  })

  test('skips declarations with no organisation id', () => {
    const groups = groupCancellationsByOrganisation([
      { id: 'orphan', organisation: null, audit: [] }
    ])
    expect(groups.size).toBe(0)
  })

  test('returns an empty map for no cancellations', () => {
    expect(groupCancellationsByOrganisation().size).toBe(0)
  })
})
