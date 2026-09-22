import { describe, expect, it, vi, beforeEach } from 'vitest'
import { getDeclarationDetail } from './detail-fetch.service.js'
import * as detailMapping from './detail-mapping.js'

vi.mock('./detail-mapping.js', () => ({
  mapDeclarationToDetail: vi.fn(),
  mapObligationToDetail: vi.fn()
}))

describe('detail-fetch.service.js', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getDeclarationDetail', () => {
    it('calls mapObligationToDetail if declaration is not found', async () => {
      const obligationsApi = {
        getComplianceDeclarationOrNull: vi.fn().mockResolvedValue(null),
        getComplianceObligation: vi.fn().mockResolvedValue({ some: 'data' })
      }
      const organisationsApi = {}
      const accountApi = {}

      await getDeclarationDetail(
        obligationsApi,
        organisationsApi,
        accountApi,
        'org1',
        'decl1',
        { traceId: 'trace1', obligationYear: 2025 }
      )

      expect(
        obligationsApi.getComplianceDeclarationOrNull
      ).toHaveBeenCalledWith({ id: 'decl1', organisationId: 'org1' }, 'trace1')
      expect(obligationsApi.getComplianceObligation).toHaveBeenCalledWith(
        { organisationId: 'org1', obligationYear: 2025 },
        'trace1'
      )
      expect(detailMapping.mapObligationToDetail).toHaveBeenCalledWith(
        { some: 'data' },
        { organisationId: 'org1', obligationYear: 2025, locale: 'en' }
      )
    })

    it('fetches scheme operator account details for not submitted compliance schemes', async () => {
      const obligationsApi = {
        getComplianceObligation: vi.fn().mockResolvedValue({ some: 'data' })
      }
      const organisationsApi = {
        getOrganisation: vi.fn().mockResolvedValue({
          registrationType: 'ComplianceScheme',
          companiesHouseNumber: 'CS123'
        })
      }
      const accountApi = {
        getOrganisationWithPersonsOrNull: vi.fn().mockResolvedValue({}),
        getOrganisationsByCompaniesHouseNumbers: vi.fn().mockResolvedValue([
          {
            companiesHouseNumber: 'CS123',
            name: 'Scheme Org',
            isComplianceScheme: true
          }
        ])
      }

      await getDeclarationDetail(
        obligationsApi,
        organisationsApi,
        accountApi,
        'org1',
        null, // id is null for not submitted
        { traceId: 'trace1', obligationYear: 2025 }
      )

      expect(
        accountApi.getOrganisationsByCompaniesHouseNumbers
      ).toHaveBeenCalledWith(['CS123'], 'trace1')
      expect(detailMapping.mapObligationToDetail).toHaveBeenCalled()
    })
  })
})
