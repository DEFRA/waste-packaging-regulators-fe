import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  wasteOrganisationsRegistrationStatus,
  wasteOrganisationsRegistrationType
} from '../common/constants.js'
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

    it('matches Account organisation by external id when multiple are returned', async () => {
      const obligationsApi = {
        getComplianceObligation: vi.fn().mockResolvedValue({ some: 'data' }),
        listOrganisationComplianceDeclarations: vi
          .fn()
          .mockResolvedValue({ complianceDeclarations: [] })
      }
      const organisationsApi = {
        getOrganisation: vi.fn().mockResolvedValue({
          registrationType: 'DirectProducer',
          name: 'BRIDGE LTD',
          registrations: [
            {
              type: wasteOrganisationsRegistrationType.LARGE_PRODUCER,
              status: wasteOrganisationsRegistrationStatus.REGISTERED,
              registrationYear: 2026
            }
          ]
        })
      }
      const accountApi = {
        getOrganisationsByExternalIds: vi.fn().mockResolvedValue({
          organisations: [
            {
              externalId: '497f6eca-6276-4993-bfeb-53cbbbba6f08',
              name: 'Howco Group plc',
              referenceNumber: '101411'
            },
            {
              externalId: 'd1e2f3a4-b5c6-7890-abcd-ef1234567890',
              name: 'BRIDGE LTD',
              referenceNumber: '155796'
            }
          ],
          notFoundExternalIds: []
        }),
        getOrganisationWithPersonsOrNull: vi.fn().mockResolvedValue(null)
      }

      await getDeclarationDetail(
        obligationsApi,
        organisationsApi,
        accountApi,
        'd1e2f3a4-b5c6-7890-abcd-ef1234567890',
        null,
        { traceId: 'trace1', obligationYear: 2026 }
      )

      expect(detailMapping.mapObligationToDetail).toHaveBeenCalledWith(
        { some: 'data' },
        expect.objectContaining({
          accountOrganisationName: 'BRIDGE LTD',
          accountOrganisationReferenceNumber: '155796'
        })
      )
    })

    it('fetches scheme operator account details for not submitted compliance schemes', async () => {
      const obligationsApi = {
        getComplianceObligation: vi.fn().mockResolvedValue({ some: 'data' }),
        listOrganisationComplianceDeclarations: vi
          .fn()
          .mockResolvedValue({ complianceDeclarations: [] })
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

    describe('not submitted current year history', () => {
      const organisationsApi = {
        getOrganisation: vi.fn().mockResolvedValue({
          registrationType: 'DirectProducer'
        })
      }
      const accountApi = {
        getOrganisationsByExternalIds: vi
          .fn()
          .mockResolvedValue({ organisations: [] })
      }

      it('passes the declarations for the obligation year and route prefix to the mapper', async () => {
        const declarations = [{ id: 'decl-cancelled', status: 'Cancelled' }]
        const obligationsApi = {
          getComplianceObligation: vi.fn().mockResolvedValue({ some: 'data' }),
          listOrganisationComplianceDeclarations: vi
            .fn()
            .mockResolvedValue({ complianceDeclarations: declarations })
        }

        await getDeclarationDetail(
          obligationsApi,
          organisationsApi,
          accountApi,
          'org1',
          null,
          {
            traceId: 'trace1',
            obligationYear: 2026,
            routePrefix: '/certificates-of-compliance'
          }
        )

        expect(
          obligationsApi.listOrganisationComplianceDeclarations
        ).toHaveBeenCalledWith(
          { organisationId: 'org1', obligationYear: 2026 },
          'trace1'
        )
        expect(detailMapping.mapObligationToDetail).toHaveBeenCalledWith(
          { some: 'data' },
          expect.objectContaining({
            organisationId: 'org1',
            declarationsForYear: declarations,
            routePrefix: '/certificates-of-compliance'
          })
        )
      })

      it('skips the declarations lookup when the obligation year is missing', async () => {
        const obligationsApi = {
          getComplianceObligation: vi.fn().mockResolvedValue({ some: 'data' }),
          listOrganisationComplianceDeclarations: vi.fn()
        }

        await getDeclarationDetail(
          obligationsApi,
          organisationsApi,
          accountApi,
          'org1',
          null,
          { traceId: 'trace1' }
        )

        expect(
          obligationsApi.listOrganisationComplianceDeclarations
        ).not.toHaveBeenCalled()
        expect(detailMapping.mapObligationToDetail).toHaveBeenCalledWith(
          { some: 'data' },
          expect.objectContaining({ declarationsForYear: [] })
        )
      })
    })
  })
})
