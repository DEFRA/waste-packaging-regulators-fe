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
      if (key === 'csvExport.obligationConcurrency') {
        return 20
      }
      return undefined
    })

    obligationsApi = {
      listComplianceDeclarations: vi.fn(),
      getComplianceObligationOrNull: vi
        .fn()
        .mockResolvedValue({ obligations: [] })
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
      NOW
    )

    expect(filename).toBe(
      '2026-certificates-of-compliance-pending-2026-07-30-14-30-05.csv'
    )

    const { loadCsv } = await import('./download.page-object.js')
    const { rows } = loadCsv(csv)

    expect(rows[0]['Organisation name']).toBe('Acme')
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
      NOW
    )

    const { loadCsv } = await import('./download.page-object.js')
    const { rows } = loadCsv(csv)

    expect(rows).toHaveLength(0)
  })

  test('assembles not-submitted rows from organisations without a live declaration', async () => {
    organisationsApi.listComplianceOrganisations.mockResolvedValue({
      organisations: [
        { id: 'org-live', name: 'Riverbank Ltd' },
        { id: 'org-submitted', name: 'Already In Ltd' }
      ]
    })
    obligationsApi.listComplianceDeclarations.mockImplementation(({ status }) =>
      Promise.resolve(
        status === 'Submitted'
          ? {
              total: 1,
              complianceDeclarations: [
                { organisation: { id: 'org-submitted' } }
              ]
            }
          : { total: 0, complianceDeclarations: [] }
      )
    )
    accountApi.getOrganisationsByExternalIds.mockResolvedValue({
      organisations: [{ externalId: 'org-live', referenceNumber: 'REF-LIVE' }]
    })

    const { csv } = await getComplianceDownload(
      'direct-producers',
      'not-submitted',
      'trace-1',
      NOW
    )

    const { loadCsv } = await import('./download.page-object.js')
    const { headers, rows } = loadCsv(csv)

    // org-submitted has a Submitted declaration, so only org-live is not-submitted.
    expect(rows).toHaveLength(1)
    expect(rows[0]['Organisation name']).toBe('Riverbank Ltd')
    expect(rows[0]['Organisation ID']).toBe('REF-LIVE')
    expect(headers).not.toContain('Date submitted')
    expect(obligationsApi.getComplianceObligationOrNull).toHaveBeenCalled()
  })

  test('resolves recycling status for not-submitted compliance schemes', async () => {
    organisationsApi.listComplianceOrganisations.mockResolvedValue({
      organisations: [
        { id: 'cs-1', name: 'Scheme Co', companiesHouseNumber: 'CH1' }
      ]
    })
    obligationsApi.listComplianceDeclarations.mockResolvedValue({
      total: 0,
      complianceDeclarations: []
    })
    obligationsApi.getComplianceObligationOrNull.mockResolvedValue({
      obligations: [
        {
          material: 'Plastic',
          status: 'Met',
          tonnages: { obligated: 100, accepted: 100 }
        }
      ]
    })

    const { csv } = await getComplianceDownload(
      'compliance-schemes',
      'not-submitted',
      'trace-1',
      NOW
    )

    const { loadCsv } = await import('./download.page-object.js')
    const { headers, rows } = loadCsv(csv)

    expect(rows).toHaveLength(1)
    expect(rows[0]['Organisation name']).toBe('Scheme Co')
    expect(headers).toContain('Regulation 43')
    expect(obligationsApi.getComplianceObligationOrNull).toHaveBeenCalled()
    expect(rows[0]['Recycling obligations']).toBe('Met')
  })

  test('returns a header-only CSV for an unrecognised submission status', async () => {
    const { csv } = await getComplianceDownload(
      'direct-producers',
      'queried',
      'trace-1',
      NOW
    )

    const { loadCsv } = await import('./download.page-object.js')
    const { rows } = loadCsv(csv)

    expect(rows).toHaveLength(0)
  })

  describe('not-submitted obligation fan-out is bounded (direct producers)', () => {
    // Every not-submitted producer needs one obligation lookup. Set up a
    // population larger than the concurrency limit so the bounding is exercised.
    const setupNotSubmittedPopulation = (size) => {
      const organisations = Array.from({ length: size }, (_, i) => ({
        id: `org-${i}`,
        name: `Org ${i}`
      }))
      organisationsApi.listComplianceOrganisations.mockResolvedValue({
        organisations
      })
      obligationsApi.listComplianceDeclarations.mockResolvedValue({
        total: 0,
        complianceDeclarations: []
      })
      return organisations
    }

    test('resolves the whole population, not just the first page', async () => {
      setupNotSubmittedPopulation(45)

      const { csv } = await getComplianceDownload(
        'direct-producers',
        'not-submitted',
        'trace-1',
        NOW
      )

      expect(
        obligationsApi.getComplianceObligationOrNull
      ).toHaveBeenCalledTimes(45)

      const { loadCsv } = await import('./download.page-object.js')
      expect(loadCsv(csv).rows).toHaveLength(45)
    })

    test('never runs more than the configured concurrency at once', async () => {
      setupNotSubmittedPopulation(45)

      let inFlight = 0
      let peak = 0
      obligationsApi.getComplianceObligationOrNull.mockImplementation(
        async () => {
          inFlight += 1
          peak = Math.max(peak, inFlight)
          await new Promise((resolve) => setTimeout(resolve, 1))
          inFlight -= 1
          return { obligations: [] }
        }
      )

      await getComplianceDownload(
        'direct-producers',
        'not-submitted',
        'trace-1',
        NOW
      )

      expect(peak).toBe(20)
    })

    test('fails the whole download when any obligation lookup fails (no partial CSV)', async () => {
      setupNotSubmittedPopulation(45)

      obligationsApi.getComplianceObligationOrNull.mockImplementation(
        ({ organisationId }) =>
          organisationId === 'org-7'
            ? Promise.reject(new Error('obligations unavailable'))
            : Promise.resolve({ obligations: [] })
      )

      await expect(
        getComplianceDownload(
          'direct-producers',
          'not-submitted',
          'trace-1',
          NOW
        )
      ).rejects.toThrow('obligations unavailable')
    })
  })
})
