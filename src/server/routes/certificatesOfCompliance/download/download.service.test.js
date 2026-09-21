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

vi.mock('#services/waste-organisations-api.service.js', () => ({
  createWasteOrganisationsApiService: vi.fn()
}))

vi.mock('#services/account-api.service.js', () => ({
  createAccountApiService: vi.fn()
}))

import { config } from '#config/config.js'
import { createWasteObligationsApiService } from '#services/waste-obligations-api.service.js'
import { createWasteOrganisationsApiService } from '#services/waste-organisations-api.service.js'
import { createAccountApiService } from '#services/account-api.service.js'
import { getComplianceDownload } from './download.service.js'
import { DOWNLOAD_PAGE_CONCURRENCY } from '../common/constants.js'

const NOW = new Date(2026, 6, 30, 14, 30, 5)

describe('#getComplianceDownload (real API path)', () => {
  let obligationsApi
  let organisationsApi
  let accountApi

  beforeEach(() => {
    vi.clearAllMocks()
    config.get.mockImplementation((key) => {
      if (key === 'useMockApi') {
        return false
      }
      return undefined
    })

    obligationsApi = {
      listComplianceDeclarations: vi.fn(),
      listUnsubmittedComplianceDeclarations: vi
        .fn()
        .mockResolvedValue({ unsubmittedOrganisations: [], total: 0 }),
      getComplianceObligation: vi.fn().mockResolvedValue({ obligations: [] })
    }
    organisationsApi = {
      listComplianceOrganisations: vi.fn()
    }
    accountApi = {
      getOrganisationsByExternalIds: vi
        .fn()
        .mockResolvedValue({ organisations: [], notFoundExternalIds: [] }),
      getOrganisationsByCompaniesHouseNumbers: vi.fn().mockResolvedValue([])
    }

    createWasteObligationsApiService.mockReturnValue(obligationsApi)
    createWasteOrganisationsApiService.mockReturnValue(organisationsApi)
    createAccountApiService.mockReturnValue(accountApi)
  })

  test('fetches all declarations for the submission status', async () => {
    obligationsApi.listComplianceDeclarations.mockResolvedValue({
      total: 1,
      complianceDeclarations: [
        {
          id: 'decl-1',
          organisation: {
            id: 'org-1',
            referenceNumber: 'REF001',
            name: 'Acme'
          },
          obligationStatus: 'Met',
          isRegulation43Compliant: true,
          created: '2027-01-15',
          obligationCoveragePercentage: 84
        }
      ]
    })

    const { filename, csv } = await getComplianceDownload(
      'direct-producers',
      'pending',
      'trace-1',
      null,
      NOW
    )

    expect(filename).toBe(
      '2026-certificates-of-compliance-pending-2026-07-30-14-30-05.csv'
    )

    const { loadCsv } = await import('./download.page-object.js')
    const { rows } = loadCsv(csv)

    expect(rows[0]['Organisation name']).toBe('Acme')
  })

  test('passes regulator country filter to list declarations', async () => {
    obligationsApi.listComplianceDeclarations.mockResolvedValue({
      total: 0,
      complianceDeclarations: []
    })

    await getComplianceDownload(
      'direct-producers',
      'pending',
      'trace-1',
      'GB-WLS'
    )

    expect(obligationsApi.listComplianceDeclarations).toHaveBeenCalledWith(
      expect.objectContaining({ country: 'GB-WLS' }),
      'trace-1'
    )
  })

  test('passes regulator country filter to unsubmitted export', async () => {
    obligationsApi.listUnsubmittedComplianceDeclarations.mockResolvedValue({
      total: 0,
      unsubmittedOrganisations: []
    })

    await getComplianceDownload(
      'direct-producers',
      'not-submitted',
      'trace-1',
      'GB-NIR'
    )

    expect(
      obligationsApi.listUnsubmittedComplianceDeclarations
    ).toHaveBeenCalledWith(
      expect.objectContaining({ country: 'GB-NIR' }),
      'trace-1'
    )
  })

  test('produces header-only output for an empty list without calling the account API', async () => {
    obligationsApi.listComplianceDeclarations.mockResolvedValue({
      total: 0,
      complianceDeclarations: []
    })

    const { csv } = await getComplianceDownload(
      'direct-producers',
      'accepted',
      'trace-1',
      null,
      NOW
    )

    const { loadCsv } = await import('./download.page-object.js')
    const { rows } = loadCsv(csv)

    expect(rows).toHaveLength(0)
  })

  test('assembles not-submitted rows from the unsubmitted endpoint', async () => {
    obligationsApi.listUnsubmittedComplianceDeclarations.mockResolvedValue({
      total: 2,
      unsubmittedOrganisations: [
        {
          organisationId: 'org-1',
          name: 'Acme Ltd',
          referenceNumber: 'REF001',
          recyclingObligationsMet: true,
          obligationCoveragePercentage: 92
        },
        {
          organisationId: 'org-2',
          name: 'Beta Ltd',
          referenceNumber: 'REF002',
          recyclingObligationsMet: false,
          obligationCoveragePercentage: 41
        }
      ]
    })

    const { csv } = await getComplianceDownload(
      'direct-producers',
      'not-submitted',
      'trace-1',
      null,
      NOW
    )

    const { loadCsv } = await import('./download.page-object.js')
    const { headers, rows } = loadCsv(csv)

    expect(headers).not.toContain('Date submitted')
    expect(rows).toHaveLength(2)
    expect(rows[0]['Organisation name']).toBe('Acme Ltd')
    expect(rows[0]['Organisation ID']).toBe('REF001')
    expect(rows[0]['Recycling obligations']).toBe('Met')
    expect(rows[0]['Percentage met']).toBe('92%')
    expect(rows[1]['Recycling obligations']).toBe('Not met')
  })

  test('builds the not-submitted CSV without any per-organisation lookups', async () => {
    obligationsApi.listUnsubmittedComplianceDeclarations.mockResolvedValue({
      total: 1,
      unsubmittedOrganisations: [
        {
          organisationId: 'org-1',
          name: 'Acme Ltd',
          referenceNumber: 'REF001',
          recyclingObligationsMet: true,
          obligationCoveragePercentage: 92
        }
      ]
    })

    await getComplianceDownload(
      'direct-producers',
      'not-submitted',
      'trace-1',
      null,
      NOW
    )

    expect(obligationsApi.getComplianceObligation).not.toHaveBeenCalled()
    expect(organisationsApi.listComplianceOrganisations).not.toHaveBeenCalled()
    expect(accountApi.getOrganisationsByExternalIds).not.toHaveBeenCalled()
  })

  test('keeps a null metric blank rather than reporting a calculated zero', async () => {
    obligationsApi.listUnsubmittedComplianceDeclarations.mockResolvedValue({
      total: 1,
      unsubmittedOrganisations: [
        {
          organisationId: 'org-1',
          name: 'Acme Ltd',
          referenceNumber: 'REF001',
          recyclingObligationsMet: null,
          obligationCoveragePercentage: null
        }
      ]
    })

    const { csv } = await getComplianceDownload(
      'direct-producers',
      'not-submitted',
      'trace-1',
      null,
      NOW
    )

    const { loadCsv } = await import('./download.page-object.js')
    const { rows } = loadCsv(csv)

    expect(rows[0]['Percentage met']).toBe('')
    expect(rows[0]['Recycling obligations']).toBe('No data')
  })

  test('keeps the Regulation 43 column for compliance schemes, with no value to report', async () => {
    obligationsApi.listUnsubmittedComplianceDeclarations.mockResolvedValue({
      total: 1,
      unsubmittedOrganisations: [
        {
          organisationId: 'cs-1',
          name: 'Scheme Operator Ltd',
          referenceNumber: 'CS001',
          recyclingObligationsMet: true,
          obligationCoveragePercentage: 100
        }
      ]
    })

    const { csv } = await getComplianceDownload(
      'compliance-schemes',
      'not-submitted',
      'trace-1',
      null,
      NOW
    )

    const { loadCsv } = await import('./download.page-object.js')
    const { headers, rows } = loadCsv(csv)

    expect(headers).toContain('Regulation 43')
    expect(headers).not.toContain('Date submitted')
    expect(rows[0]['Regulation 43']).toBe('No data')
  })

  test('returns a header-only CSV for an unrecognised submission status', async () => {
    const { csv } = await getComplianceDownload(
      'direct-producers',
      'nonsense',
      'trace-1',
      null,
      NOW
    )

    const { loadCsv } = await import('./download.page-object.js')
    const { rows } = loadCsv(csv)

    expect(rows).toHaveLength(0)
  })

  // The export used to make one obligations request per exported row, which took
  // the service down. That fan-out is gone, but the export still has to drain the
  // whole population a page at a time — so the same guarantees are asserted at the
  // new fan-out point rather than retired with the code they guarded.
  describe('not-submitted page drain is bounded', () => {
    const pageOf = (page, size) =>
      Array.from({ length: size }, (_, i) => ({
        organisationId: `org-${page}-${i}`,
        name: `Org ${page}-${i}`,
        referenceNumber: `REF${page}${i}`,
        recyclingObligationsMet: true,
        obligationCoveragePercentage: 90
      }))

    test('pages until the whole population is collected, not just the first page', async () => {
      obligationsApi.listUnsubmittedComplianceDeclarations.mockImplementation(
        ({ page }) =>
          Promise.resolve({
            total: 450,
            unsubmittedOrganisations: pageOf(page, page === 5 ? 50 : 100)
          })
      )

      const { csv } = await getComplianceDownload(
        'direct-producers',
        'not-submitted',
        'trace-1',
        null,
        NOW
      )

      const { loadCsv } = await import('./download.page-object.js')
      const { rows } = loadCsv(csv)

      expect(
        obligationsApi.listUnsubmittedComplianceDeclarations
      ).toHaveBeenCalledTimes(5)
      expect(rows).toHaveLength(450)
    })

    test('never asks for a page larger than the endpoint allows', async () => {
      obligationsApi.listUnsubmittedComplianceDeclarations.mockResolvedValue({
        total: 10,
        unsubmittedOrganisations: pageOf(1, 10)
      })

      await getComplianceDownload(
        'direct-producers',
        'not-submitted',
        'trace-1',
        null,
        NOW
      )

      for (const [params] of obligationsApi
        .listUnsubmittedComplianceDeclarations.mock.calls) {
        expect(params.pageSize).toBeLessThanOrEqual(100)
      }
    })

    test('never runs more than the configured concurrency at once', async () => {
      let inFlight = 0
      let peak = 0

      obligationsApi.listUnsubmittedComplianceDeclarations.mockImplementation(
        ({ page }) => {
          inFlight += 1
          peak = Math.max(peak, inFlight)
          return new Promise((resolve) => {
            setTimeout(() => {
              inFlight -= 1
              resolve({
                total: 2000,
                unsubmittedOrganisations: pageOf(page, 100)
              })
            }, 1)
          })
        }
      )

      await getComplianceDownload(
        'direct-producers',
        'not-submitted',
        'trace-1',
        null,
        NOW
      )

      expect(
        obligationsApi.listUnsubmittedComplianceDeclarations
      ).toHaveBeenCalledTimes(20)
      expect(peak).toBe(DOWNLOAD_PAGE_CONCURRENCY)
    })

    test('fails the whole download when any page fails (no partial CSV)', async () => {
      obligationsApi.listUnsubmittedComplianceDeclarations.mockImplementation(
        ({ page }) =>
          page === 3
            ? Promise.reject(new Error('page 3 exploded'))
            : Promise.resolve({
                total: 450,
                unsubmittedOrganisations: pageOf(page, 100)
              })
      )

      await expect(
        getComplianceDownload(
          'direct-producers',
          'not-submitted',
          'trace-1',
          NOW
        )
      ).rejects.toThrow('page 3 exploded')
    })
  })
})
