import { describe, expect, test, vi, beforeEach } from 'vitest'

vi.mock('#config/config.js', () => ({
  config: { get: vi.fn() }
}))

vi.mock('#server/common/helpers/logging/logger.js', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  })
}))

vi.mock('#services/waste-obligations-api.service.js', () => ({
  createWasteObligationsApiService: vi.fn()
}))

import { createWasteObligationsApiService } from '#services/waste-obligations-api.service.js'
import { getComplianceReport } from './report.service.js'
import { loadReport } from './report.page-object.js'

const NOW = new Date('2026-10-19T09:00:00Z')

function declaration(id, organisationId, name, status, extra = {}) {
  return {
    id,
    created: '2026-12-19T10:42:07Z',
    status,
    organisation: {
      id: organisationId,
      registrationType: 'ComplianceScheme',
      name: null,
      complianceSchemeName: name,
      schemeOperatorName: `${name} Operator`,
      referenceNumber: '100234'
    },
    obligations: [{ material: 'Plastic', tonnages: { obligated: 10 } }],
    obligationStatus: 'Met',
    isRegulation43Compliant: true,
    obligationCoveragePercentage: 100,
    audit: [],
    ...extra
  }
}

// A fake GET /compliance-declarations that serves `byStatus[status]` in pages.
function pagedDeclarations(byStatus) {
  return vi.fn(async ({ status, page, pageSize }) => {
    const all = byStatus[status] ?? []
    const start = (page - 1) * pageSize
    return {
      complianceDeclarations: all.slice(start, start + pageSize),
      total: all.length,
      page,
      pageSize
    }
  })
}

function pagedUnsubmitted(all) {
  return vi.fn(async ({ page, pageSize }) => {
    const start = (page - 1) * pageSize
    return {
      unsubmittedOrganisations: all.slice(start, start + pageSize),
      total: all.length,
      page,
      pageSize
    }
  })
}

describe('#getComplianceReport', () => {
  let obligationsApi

  beforeEach(() => {
    vi.clearAllMocks()
    obligationsApi = {
      listComplianceDeclarations: pagedDeclarations({}),
      listUnsubmittedComplianceDeclarations: pagedUnsubmitted([])
    }
    createWasteObligationsApiService.mockImplementation(() => obligationsApi)
  })

  test('scopes every call to the compliance year, producer type and regulator country', async () => {
    await getComplianceReport('compliance-schemes', 'trace-1', 'GB-SCT', NOW)

    const declarationCalls =
      obligationsApi.listComplianceDeclarations.mock.calls
    expect(declarationCalls.map(([params]) => params)).toEqual(
      expect.arrayContaining([
        {
          obligationYear: 2026,
          registrationType: 'ComplianceScheme',
          country: 'GB-SCT',
          status: 'Submitted,Accepted',
          sortColumn: 'DateSubmitted',
          sortDirection: 'asc',
          page: 1,
          pageSize: 100
        },
        {
          obligationYear: 2026,
          registrationType: 'ComplianceScheme',
          country: 'GB-SCT',
          status: 'Cancelled',
          sortColumn: 'DateSubmitted',
          sortDirection: 'asc',
          page: 1,
          pageSize: 100
        }
      ])
    )
    expect(declarationCalls.every(([, traceId]) => traceId === 'trace-1')).toBe(
      true
    )
    expect(
      obligationsApi.listUnsubmittedComplianceDeclarations
    ).toHaveBeenCalledWith(
      {
        obligationYear: 2026,
        registrationType: 'ComplianceScheme',
        country: 'GB-SCT',
        sort: 'Name[asc]',
        page: 1,
        pageSize: 100
      },
      'trace-1'
    )
  })

  test('reads every page of each result set', async () => {
    const pending = Array.from({ length: 150 }, (_, i) =>
      declaration(`d${i}`, `org-${i}`, `Scheme ${i}`, 'Submitted')
    )
    const notSubmitted = Array.from({ length: 120 }, (_, i) => ({
      organisationId: `uns-${i}`,
      name: `Unsubmitted ${i}`,
      referenceNumber: String(200000 + i),
      recyclingObligationsMet: null,
      obligationCoveragePercentage: null
    }))
    obligationsApi.listComplianceDeclarations = pagedDeclarations({
      'Submitted,Accepted': pending
    })
    obligationsApi.listUnsubmittedComplianceDeclarations =
      pagedUnsubmitted(notSubmitted)

    const { buffer } = await getComplianceReport(
      'compliance-schemes',
      undefined,
      'GB-ENG',
      NOW
    )
    const { rows } = await loadReport(buffer)

    expect(rows).toHaveLength(270)
    expect(
      obligationsApi.listUnsubmittedComplianceDeclarations
    ).toHaveBeenCalledWith(expect.objectContaining({ page: 2 }), undefined)
  })

  test('builds one row per organisation with its cancellation count', async () => {
    obligationsApi.listComplianceDeclarations = pagedDeclarations({
      'Submitted,Accepted': [
        declaration('d1', 'org-1', 'Bravo Scheme', 'Submitted')
      ],
      Cancelled: [
        declaration('c1', 'org-1', 'Bravo Scheme', 'Cancelled'),
        declaration('c2', 'org-2', 'Alpha Scheme', 'Cancelled'),
        declaration('c3', 'org-2', 'Alpha Scheme', 'Cancelled')
      ]
    })
    obligationsApi.listUnsubmittedComplianceDeclarations = pagedUnsubmitted([
      {
        organisationId: 'org-2',
        name: 'Alpha Scheme',
        referenceNumber: '100100',
        recyclingObligationsMet: true,
        obligationCoveragePercentage: 100
      }
    ])

    const { filename, buffer } = await getComplianceReport(
      'compliance-schemes',
      undefined,
      'GB-ENG',
      NOW
    )
    const { heading, rows } = await loadReport(buffer)

    expect(filename).toBe('2026-statements-of-compliance-all-19-10-2026.xlsx')
    expect(heading).toBe(
      'All statement of compliance submissions, Monday 19 October'
    )
    expect(
      rows.map((row) => [
        row['Organisation name'],
        row.Status,
        row['Regulation 43'],
        row.Cancellations
      ])
    ).toEqual([
      ['Alpha Scheme', 'Not submitted', null, 2],
      ['Bravo Scheme', 'Pending', 'Compliant', 1]
    ])
  })

  test('fails the report rather than writing a partial file when a page fails', async () => {
    obligationsApi.listComplianceDeclarations = vi
      .fn()
      .mockRejectedValue(new Error('backend down'))

    await expect(
      getComplianceReport('direct-producers', undefined, 'GB-ENG', NOW)
    ).rejects.toThrow('backend down')
  })
})
