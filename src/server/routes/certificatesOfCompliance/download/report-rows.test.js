import {
  buildReportRows,
  cancellationToReportEntry,
  declarationToReportRow,
  reportReferenceNumber,
  totalObligatedTonnes,
  unsubmittedToReportRow
} from './report-rows.js'
import { groupCancellationsByOrganisation } from './cancellations.js'

const regulator = (name) => ({ id: 'reg', email: 'r@example.gov.uk', name })

function declaration(overrides = {}) {
  const { organisation, ...rest } = overrides
  return {
    id: 'decl-1',
    created: '2026-12-19T10:42:07+00:00',
    status: 'Submitted',
    organisation: {
      id: 'org-1',
      registrationType: 'DirectProducer',
      name: 'ABC Limited',
      complianceSchemeName: null,
      schemeOperatorName: null,
      referenceNumber: '100234',
      ...organisation
    },
    obligations: [
      { material: 'Glass', tonnages: { obligated: 1500 } },
      { material: 'GlassRemelt', tonnages: { obligated: 1035 } },
      { material: 'Plastic', tonnages: { obligated: 1515.5 } }
    ],
    obligationStatus: 'Met',
    isRegulation43Compliant: false,
    obligationCoveragePercentage: 100,
    audit: [
      {
        action: 'Submitted',
        timestamp: '2026-12-19T10:42:07+00:00',
        user: regulator('Jane Smith')
      }
    ],
    ...rest
  }
}

function accepted(overrides = {}) {
  return declaration({
    status: 'Accepted',
    audit: [
      {
        action: 'Submitted',
        timestamp: '2026-12-19T10:42:07+00:00',
        user: regulator('Jane Smith')
      },
      {
        action: 'Accepted',
        timestamp: '2027-01-02T09:15:31+00:00',
        user: regulator('John Doe')
      }
    ],
    ...overrides
  })
}

function unsubmitted(overrides = {}) {
  return {
    organisationId: 'org-9',
    registrationType: 'DirectProducer',
    name: 'XYZ Packaging Limited',
    referenceNumber: '100512',
    schemeOperatorName: null,
    recyclingObligationsMet: false,
    obligationCoveragePercentage: 62,
    ...overrides
  }
}

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

function cancelledFor(organisationId, timestamp) {
  return {
    id: `c-${organisationId}-${timestamp}`,
    status: 'Cancelled',
    organisation: { id: organisationId },
    audit: [{ action: 'Cancelled', timestamp }]
  }
}

describe('#report-rows', () => {
  describe('declarationToReportRow', () => {
    test('maps a pending declaration with blank acceptance fields', () => {
      expect(declarationToReportRow(declaration())).toEqual({
        organisationId: 'org-1',
        organisationName: 'ABC Limited',
        organisationReference: 100234,
        status: 'Pending',
        regulation43: 'Not compliant',
        recyclingObligations: 'Met',
        percentageMet: 100,
        totalObligationTonnes: 4050.5,
        dateSubmitted: new Date('2026-12-19T00:00:00Z'),
        dateAccepted: null,
        acceptedBy: null,
        cancellations: 0,
        cancellationHistory: []
      })
    })

    test('reads the date accepted and accepted by from the Accepted audit entry', () => {
      const row = declarationToReportRow(accepted())

      expect(row.status).toBe('Accepted')
      expect(row.dateAccepted).toEqual(new Date('2027-01-02T00:00:00Z'))
      expect(row.acceptedBy).toBe('John Doe')
    })

    test('names a compliance scheme by its scheme name, not the operator', () => {
      const row = declarationToReportRow(
        declaration({
          organisation: {
            registrationType: 'ComplianceScheme',
            name: null,
            complianceSchemeName: 'Example Compliance Scheme',
            schemeOperatorName: 'Example Scheme Operator Ltd'
          }
        })
      )

      expect(row.organisationName).toBe('Example Compliance Scheme')
    })

    test.each([
      [true, 'Compliant'],
      [false, 'Not compliant'],
      [null, 'Not compliant'],
      [undefined, 'Not compliant']
    ])('maps Regulation 43 %p to %p', (value, expected) => {
      expect(
        declarationToReportRow(declaration({ isRegulation43Compliant: value }))
          .regulation43
      ).toBe(expected)
    })

    test.each([
      ['Met', 'Met'],
      ['NotMet', 'Not met'],
      ['NoDataYet', null],
      [null, null]
    ])('maps obligation status %p to %p', (value, expected) => {
      expect(
        declarationToReportRow(declaration({ obligationStatus: value }))
          .recyclingObligations
      ).toBe(expected)
    })

    test('calculates percentage met from the obligations when the declaration has none', () => {
      const row = declarationToReportRow(
        declaration({
          obligationCoveragePercentage: null,
          obligations: [
            {
              material: 'Plastic',
              tonnages: { obligated: 100, accepted: 50, awaitingAcceptance: 0 }
            }
          ]
        })
      )

      expect(typeof row.percentageMet).toBe('number')
    })

    test('counts the organisation cancellations', () => {
      const groups = groupCancellationsByOrganisation([
        cancelledFor('org-1', '2026-11-03T10:00:00Z'),
        cancelledFor('org-1', '2026-11-10T10:00:00Z'),
        cancelledFor('org-2', '2026-11-10T10:00:00Z')
      ])

      expect(declarationToReportRow(declaration(), groups).cancellations).toBe(
        2
      )
    })

    test('lists the organisation cancellations oldest first', () => {
      const groups = groupCancellationsByOrganisation([
        cancelledFor('org-1', '2026-11-20T10:00:00Z'),
        cancelledFor('org-1', '2026-11-03T10:00:00Z'),
        cancelledFor('org-1', '2026-11-10T10:00:00Z')
      ])

      expect(
        declarationToReportRow(declaration(), groups).cancellationHistory.map(
          (entry) => entry.dateCancelled
        )
      ).toEqual([
        new Date('2026-11-03T00:00:00Z'),
        new Date('2026-11-10T00:00:00Z'),
        new Date('2026-11-20T00:00:00Z')
      ])
    })
  })

  describe('cancellationToReportEntry', () => {
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

  describe('unsubmittedToReportRow', () => {
    test('maps a not submitted organisation with blank submission fields', () => {
      expect(unsubmittedToReportRow(unsubmitted())).toEqual({
        organisationId: 'org-9',
        organisationName: 'XYZ Packaging Limited',
        organisationReference: 100512,
        status: 'Not submitted',
        regulation43: null,
        recyclingObligations: 'Not met',
        percentageMet: 62,
        totalObligationTonnes: null,
        dateSubmitted: null,
        dateAccepted: null,
        acceptedBy: null,
        cancellations: 0,
        cancellationHistory: []
      })
    })

    test('uses name for a compliance scheme, not the scheme operator name', () => {
      const row = unsubmittedToReportRow(
        unsubmitted({
          registrationType: 'ComplianceScheme',
          name: 'Example Compliance Scheme',
          schemeOperatorName: 'Example Scheme Operator Ltd'
        })
      )

      expect(row.organisationName).toBe('Example Compliance Scheme')
    })

    test('leaves recycling obligations and percentage met blank when there is no data', () => {
      const row = unsubmittedToReportRow(
        unsubmitted({
          recyclingObligationsMet: null,
          obligationCoveragePercentage: null
        })
      )

      expect(row.recyclingObligations).toBeNull()
      expect(row.percentageMet).toBeNull()
    })

    test('counts the cancellations of an organisation whose only declaration was cancelled', () => {
      const groups = groupCancellationsByOrganisation([
        cancelledFor('org-9', '2026-11-03T10:00:00Z')
      ])

      const row = unsubmittedToReportRow(unsubmitted(), groups)

      expect(row.cancellations).toBe(1)
      expect(row.cancellationHistory).toHaveLength(1)
    })
  })

  describe('reportReferenceNumber', () => {
    test.each([
      ['100234', 100234],
      [' 100234 ', 100234],
      ['012345', '012345'],
      ['SCN0001', 'SCN0001'],
      ['', null],
      [null, null]
    ])('maps %p to %p', (value, expected) => {
      expect(reportReferenceNumber(value)).toBe(expected)
    })
  })

  describe('totalObligatedTonnes', () => {
    test('sums obligated tonnes across every material', () => {
      expect(
        totalObligatedTonnes([
          { tonnages: { obligated: 1500 } },
          { tonnages: { obligated: 1035 } },
          { tonnages: {} }
        ])
      ).toBe(2535)
    })

    test('rounds away floating-point noise to the thousandths', () => {
      expect(
        totalObligatedTonnes(
          [0.001, 1.001, 0.998, 0.1, 0.9].map((obligated) => ({
            tonnages: { obligated }
          }))
        )
      ).toBe(3)
    })

    test('keeps real decimals', () => {
      expect(
        totalObligatedTonnes([
          { tonnages: { obligated: 215.5 } },
          { tonnages: { obligated: 870.125 } }
        ])
      ).toBe(1085.625)
    })

    test.each([[null], [[]]])('is blank for %p', (obligations) => {
      expect(totalObligatedTonnes(obligations)).toBeNull()
    })
  })

  describe('buildReportRows', () => {
    test('lists every organisation once, sorted A to Z by name', () => {
      const rows = buildReportRows({
        declarations: [
          declaration({
            organisation: { id: 'org-d', name: 'delta Ltd' }
          }),
          accepted({ organisation: { id: 'org-b', name: 'Bravo Ltd' } })
        ],
        unsubmittedOrganisations: [
          unsubmitted({ organisationId: 'org-c', name: 'Charlie Ltd' }),
          unsubmitted({ organisationId: 'org-a', name: 'Alpha Ltd' })
        ]
      })

      expect(rows.map((row) => [row.organisationName, row.status])).toEqual([
        ['Alpha Ltd', 'Not submitted'],
        ['Bravo Ltd', 'Accepted'],
        ['Charlie Ltd', 'Not submitted'],
        ['delta Ltd', 'Pending']
      ])
    })

    test('breaks a name tie by organisation ID', () => {
      const rows = buildReportRows({
        unsubmittedOrganisations: [
          unsubmitted({
            organisationId: 'o2',
            name: 'Same Ltd',
            referenceNumber: '200'
          }),
          unsubmitted({
            organisationId: 'o1',
            name: 'Same Ltd',
            referenceNumber: '30'
          })
        ]
      })

      expect(rows.map((row) => row.organisationReference)).toEqual([30, 200])
    })

    test('keeps the most recently created declaration when an organisation has two', () => {
      const rows = buildReportRows({
        declarations: [
          accepted({ id: 'older', created: '2026-11-01T09:00:00Z' }),
          declaration({ id: 'newer', created: '2026-12-01T09:00:00Z' })
        ]
      })

      expect(rows).toHaveLength(1)
      expect(rows[0].status).toBe('Pending')
    })

    test('drops a not submitted row for an organisation that has a declaration', () => {
      const rows = buildReportRows({
        declarations: [declaration()],
        unsubmittedOrganisations: [unsubmitted({ organisationId: 'org-1' })]
      })

      expect(rows).toHaveLength(1)
      expect(rows[0].status).toBe('Pending')
    })

    test('attaches cancellations to both declaration and not submitted rows', () => {
      const rows = buildReportRows({
        declarations: [declaration()],
        unsubmittedOrganisations: [unsubmitted()],
        cancellationsByOrganisation: groupCancellationsByOrganisation([
          cancelledFor('org-1', '2026-11-03T10:00:00Z'),
          cancelledFor('org-9', '2026-11-03T10:00:00Z'),
          cancelledFor('org-9', '2026-11-04T10:00:00Z')
        ])
      })

      expect(
        Object.fromEntries(
          rows.map((row) => [row.organisationId, row.cancellations])
        )
      ).toEqual({ 'org-1': 1, 'org-9': 2 })
    })

    test('leaves out cancellations for an organisation that is not in the report', () => {
      const rows = buildReportRows({
        declarations: [declaration()],
        cancellationsByOrganisation: groupCancellationsByOrganisation([
          cancelledFor('org-elsewhere', '2026-11-03T10:00:00Z')
        ])
      })

      expect(rows.map((row) => row.organisationId)).toEqual(['org-1'])
      expect(rows[0].cancellationHistory).toEqual([])
    })

    test('returns no rows when there are no organisations', () => {
      expect(buildReportRows({})).toEqual([])
    })
  })
})
