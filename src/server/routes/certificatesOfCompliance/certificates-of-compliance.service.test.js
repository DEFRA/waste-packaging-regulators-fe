import { describe, expect, test, vi, beforeEach } from 'vitest'

vi.mock('#/config/config.js', () => ({
  config: { get: vi.fn() }
}))

vi.mock('#/services/waste-obligations-api.service.js', () => ({
  createWasteObligationsApiService: vi.fn()
}))

vi.mock('#/services/waste-organisations-api.service.js', () => ({
  createWasteOrganisationsApiService: vi.fn()
}))

vi.mock('#/services/account-api.service.js', () => ({
  createAccountApiService: vi.fn()
}))

import { config } from '#/config/config.js'
import { createWasteObligationsApiService } from '#/services/waste-obligations-api.service.js'
import { createWasteOrganisationsApiService } from '#/services/waste-organisations-api.service.js'
import { createAccountApiService } from '#/services/account-api.service.js'
import {
  getCertificatesOfComplianceViewModel,
  getCertificateOfComplianceDetailViewModel,
  mockSummary,
  mockPendingItems,
  mockAcceptedItems,
  mockNotSubmittedItems,
  mockDetailData
} from './certificates-of-compliance.service.js'

const makeDeclaration = ({
  organisation: orgOverrides = {},
  ...rest
} = {}) => ({
  organisation: {
    id: 'org-1',
    referenceNumber: 'REF001',
    name: 'Test Org',
    complianceSchemeName: null,
    schemeOperatorName: null,
    ...orgOverrides
  },
  obligationStatus: 'Met',
  isRegulation43Compliant: true,
  created: '2027-01-15',
  percentageMet: 105,
  ...rest
})

describe('getCertificatesOfComplianceViewModel', () => {
  describe('with mock API (useMockApi=true)', () => {
    beforeEach(() => {
      config.get.mockReturnValue(true)
    })

    test('returns correct view model shape', async () => {
      const vm = await getCertificatesOfComplianceViewModel(
        'compliance-schemes',
        'pending',
        2
      )
      expect(vm).toMatchObject({
        heading: 'View certificates and statements of compliance',
        backlink: './',
        organisationType: 'compliance-schemes',
        activeTab: 'pending',
        pagination: {
          currentPage: 2,
          baseUrl:
            '/certificates-of-compliance?type=compliance-schemes&tab=pending'
        }
      })
    })

    test('returns mock summary data', async () => {
      const vm = await getCertificatesOfComplianceViewModel(
        'direct-producers',
        'pending',
        1
      )
      expect(vm.complianceYear).toBe(mockSummary.complianceYear)
      expect(vm.totalPending).toBe(mockSummary.totalPending)
      expect(vm.totalAccepted).toBe(mockSummary.totalAccepted)
      expect(vm.totalNotSubmitted).toBe(mockSummary.totalNotSubmitted)
    })

    test('returns mock pending items for pending tab', async () => {
      const vm = await getCertificatesOfComplianceViewModel(
        'direct-producers',
        'pending',
        1
      )
      expect(vm.items).toEqual(mockPendingItems)
    })

    test('returns mock accepted items for accepted tab', async () => {
      const vm = await getCertificatesOfComplianceViewModel(
        'direct-producers',
        'accepted',
        1
      )
      expect(vm.items).toEqual(mockAcceptedItems)
    })

    test('returns mock not-submitted items for not-submitted tab', async () => {
      const vm = await getCertificatesOfComplianceViewModel(
        'direct-producers',
        'not-submitted',
        1
      )
      expect(vm.items).toEqual(mockNotSubmittedItems)
    })

    test('returns empty array for unknown tab', async () => {
      const vm = await getCertificatesOfComplianceViewModel(
        'direct-producers',
        'unknown-tab',
        1
      )
      expect(vm.items).toEqual([])
    })

    test('getCertificateOfComplianceDetailViewModel returns mapped mock detail', async () => {
      const vm = await getCertificateOfComplianceDetailViewModel(
        'org-abc',
        'decl-1'
      )
      expect(vm.complianceYear).toBe(String(mockDetailData.obligationYear))
      expect(vm.companyName).toBe(mockDetailData.organisation.name)
      expect(vm.declarationSignedBy).toBe(mockDetailData.submitterName)
      expect(vm.heading).toBe('Certificate of compliance')
      expect(vm.backlink).toBe('/certificates-of-compliance')
    })
  })

  describe('with real API (useMockApi=false)', () => {
    let mockObligationsApi
    let mockOrganisationsApi
    let mockAccountApi

    beforeEach(() => {
      config.get.mockReturnValue(false)
      mockObligationsApi = { listComplianceDeclarations: vi.fn() }
      mockOrganisationsApi = { listComplianceOrganisations: vi.fn() }
      mockAccountApi = {
        getOrganisationsByExternalIds: vi
          .fn()
          .mockResolvedValue({ organisations: [], notFoundExternalIds: [] })
      }
      createWasteObligationsApiService.mockReturnValue(mockObligationsApi)
      createWasteOrganisationsApiService.mockReturnValue(mockOrganisationsApi)
      createAccountApiService.mockReturnValue(mockAccountApi)
    })

    describe('getComplianceSummary', () => {
      test('builds summary from API results', async () => {
        // pending=10, accepted=5, orgs=20 → notSubmitted=5
        mockObligationsApi.listComplianceDeclarations.mockImplementation(
          ({ status, pageSize }) => {
            if (pageSize === 1 && status === 'Submitted') {
              return Promise.resolve({ total: 10, complianceDeclarations: [] })
            }
            if (pageSize === 1 && status === 'Accepted') {
              return Promise.resolve({ total: 5, complianceDeclarations: [] })
            }
            return Promise.resolve({ total: 0, complianceDeclarations: [] })
          }
        )
        mockOrganisationsApi.listComplianceOrganisations.mockResolvedValue({
          organisations: Array.from({ length: 20 }, (_, i) => ({
            id: `org-${i}`
          }))
        })

        const vm = await getCertificatesOfComplianceViewModel(
          'compliance-schemes',
          'pending',
          1
        )
        expect(vm.totalPending).toBe(10)
        expect(vm.totalAccepted).toBe(5)
        expect(vm.totalNotSubmitted).toBe(5)
      })

      test('maps compliance-schemes to ComplianceScheme registrationType', async () => {
        mockObligationsApi.listComplianceDeclarations.mockResolvedValue({
          total: 0,
          complianceDeclarations: []
        })
        mockOrganisationsApi.listComplianceOrganisations.mockResolvedValue({
          organisations: []
        })

        await getCertificatesOfComplianceViewModel(
          'compliance-schemes',
          'pending',
          1
        )

        expect(
          mockObligationsApi.listComplianceDeclarations
        ).toHaveBeenCalledWith(
          expect.objectContaining({ registrationType: 'ComplianceScheme' }),
          undefined
        )
      })

      test('maps direct-producers to DirectProducer registrationType', async () => {
        mockObligationsApi.listComplianceDeclarations.mockResolvedValue({
          total: 0,
          complianceDeclarations: []
        })
        mockOrganisationsApi.listComplianceOrganisations.mockResolvedValue({
          organisations: []
        })

        await getCertificatesOfComplianceViewModel(
          'direct-producers',
          'pending',
          1
        )

        expect(
          mockObligationsApi.listComplianceDeclarations
        ).toHaveBeenCalledWith(
          expect.objectContaining({ registrationType: 'DirectProducer' }),
          undefined
        )
      })

      test('forwards traceId to API calls', async () => {
        mockObligationsApi.listComplianceDeclarations.mockResolvedValue({
          total: 0,
          complianceDeclarations: []
        })
        mockOrganisationsApi.listComplianceOrganisations.mockResolvedValue({
          organisations: []
        })

        await getCertificatesOfComplianceViewModel(
          'direct-producers',
          'pending',
          1,
          'trace-xyz'
        )

        expect(
          mockObligationsApi.listComplianceDeclarations
        ).toHaveBeenCalledWith(expect.any(Object), 'trace-xyz')
        expect(
          mockOrganisationsApi.listComplianceOrganisations
        ).toHaveBeenCalledWith(expect.any(Object), 'trace-xyz')
      })
    })

    describe('getComplianceList — pending tab', () => {
      test('fetches and maps declarations from the API', async () => {
        const declaration = makeDeclaration()
        mockObligationsApi.listComplianceDeclarations.mockImplementation(
          ({ pageSize }) => {
            if (pageSize === 1) {
              return Promise.resolve({ total: 1, complianceDeclarations: [] })
            }
            return Promise.resolve({
              total: 1,
              complianceDeclarations: [declaration]
            })
          }
        )
        mockOrganisationsApi.listComplianceOrganisations.mockResolvedValue({
          organisations: [{ id: 'org-1' }]
        })

        const vm = await getCertificatesOfComplianceViewModel(
          'direct-producers',
          'pending',
          1
        )
        expect(vm.items).toHaveLength(1)
        expect(vm.items[0]).toMatchObject({
          organisationReferenceNumber: 'REF001',
          organisationName: 'Test Org',
          recyclingObligationsMet: true,
          regulation43Met: true,
          percentageMet: 105,
          dateSubmitted: '2027-01-15'
        })
      })

      test('calculates totalPages correctly from total count', async () => {
        mockObligationsApi.listComplianceDeclarations.mockImplementation(
          ({ pageSize }) => {
            if (pageSize === 1) {
              return Promise.resolve({ total: 0, complianceDeclarations: [] })
            }
            return Promise.resolve({ total: 45, complianceDeclarations: [] })
          }
        )
        mockOrganisationsApi.listComplianceOrganisations.mockResolvedValue({
          organisations: []
        })

        const vm = await getCertificatesOfComplianceViewModel(
          'direct-producers',
          'pending',
          1
        )
        expect(vm.pagination.totalPages).toBe(3) // ceil(45/20)
      })

      test('returns totalPages=1 when total is 0', async () => {
        mockObligationsApi.listComplianceDeclarations.mockResolvedValue({
          total: 0,
          complianceDeclarations: []
        })
        mockOrganisationsApi.listComplianceOrganisations.mockResolvedValue({
          organisations: []
        })

        const vm = await getCertificatesOfComplianceViewModel(
          'direct-producers',
          'pending',
          1
        )
        expect(vm.pagination.totalPages).toBe(1)
      })

      test('calls API with status=Submitted for pending tab', async () => {
        mockObligationsApi.listComplianceDeclarations.mockResolvedValue({
          total: 0,
          complianceDeclarations: []
        })
        mockOrganisationsApi.listComplianceOrganisations.mockResolvedValue({
          organisations: []
        })

        await getCertificatesOfComplianceViewModel(
          'direct-producers',
          'pending',
          1
        )

        expect(
          mockObligationsApi.listComplianceDeclarations
        ).toHaveBeenCalledWith(
          expect.objectContaining({ status: 'Submitted' }),
          undefined
        )
      })
    })

    describe('getComplianceList — accepted tab', () => {
      test('calls API with status=Accepted', async () => {
        mockObligationsApi.listComplianceDeclarations.mockResolvedValue({
          total: 0,
          complianceDeclarations: []
        })
        mockOrganisationsApi.listComplianceOrganisations.mockResolvedValue({
          organisations: []
        })

        await getCertificatesOfComplianceViewModel(
          'direct-producers',
          'accepted',
          1
        )

        expect(
          mockObligationsApi.listComplianceDeclarations
        ).toHaveBeenCalledWith(
          expect.objectContaining({ status: 'Accepted' }),
          undefined
        )
      })
    })

    describe('getComplianceList — not-submitted tab', () => {
      test('returns organisations not present in any declaration', async () => {
        const orgs = [
          {
            id: 'org-1',
            name: 'Submitted Org',
            companiesHouseNumber: 'CH001',
            registrationType: 'DirectProducer'
          },
          {
            id: 'org-2',
            name: 'Not Submitted A',
            companiesHouseNumber: 'CH002',
            registrationType: 'DirectProducer'
          },
          {
            id: 'org-3',
            name: 'Not Submitted B',
            companiesHouseNumber: 'CH003',
            registrationType: 'DirectProducer'
          }
        ]
        mockObligationsApi.listComplianceDeclarations.mockImplementation(
          ({ pageSize, status }) => {
            if (pageSize === 1) {
              return Promise.resolve({ total: 1, complianceDeclarations: [] })
            }
            if (status === 'Submitted') {
              return Promise.resolve({
                total: 1,
                complianceDeclarations: [{ organisation: { id: 'org-1' } }]
              })
            }
            return Promise.resolve({ total: 0, complianceDeclarations: [] })
          }
        )
        mockOrganisationsApi.listComplianceOrganisations.mockResolvedValue({
          organisations: orgs
        })

        const vm = await getCertificatesOfComplianceViewModel(
          'direct-producers',
          'not-submitted',
          1
        )
        expect(vm.items).toHaveLength(2)
        expect(vm.items.map((i) => i.organisationId)).toEqual(['org-2', 'org-3'])
      })

      test('excludes organisations present in accepted declarations', async () => {
        const orgs = [
          {
            id: 'org-1',
            name: 'Accepted Org',
            companiesHouseNumber: 'CH001',
            registrationType: 'DirectProducer'
          },
          {
            id: 'org-2',
            name: 'Not Submitted',
            companiesHouseNumber: 'CH002',
            registrationType: 'DirectProducer'
          }
        ]
        mockObligationsApi.listComplianceDeclarations.mockImplementation(
          ({ pageSize, status }) => {
            if (pageSize === 1) {
              return Promise.resolve({ total: 1, complianceDeclarations: [] })
            }
            if (status === 'Accepted') {
              return Promise.resolve({
                total: 1,
                complianceDeclarations: [{ organisation: { id: 'org-1' } }]
              })
            }
            return Promise.resolve({ total: 0, complianceDeclarations: [] })
          }
        )
        mockOrganisationsApi.listComplianceOrganisations.mockResolvedValue({
          organisations: orgs
        })

        const vm = await getCertificatesOfComplianceViewModel(
          'direct-producers',
          'not-submitted',
          1
        )
        expect(vm.items).toHaveLength(1)
        expect(vm.items[0].organisationId).toBe('org-2')
      })

      test('paginates not-submitted results correctly', async () => {
        const orgs = Array.from({ length: 25 }, (_, i) => ({
          id: `org-${i}`,
          name: `Org ${i}`,
          companiesHouseNumber: `CH${String(i).padStart(3, '0')}`,
          registrationType: 'DirectProducer'
        }))
        mockObligationsApi.listComplianceDeclarations.mockImplementation(
          ({ pageSize }) => {
            if (pageSize === 1) {
              return Promise.resolve({ total: 0, complianceDeclarations: [] })
            }
            return Promise.resolve({ total: 0, complianceDeclarations: [] })
          }
        )
        mockOrganisationsApi.listComplianceOrganisations.mockResolvedValue({
          organisations: orgs
        })

        const vm = await getCertificatesOfComplianceViewModel(
          'direct-producers',
          'not-submitted',
          2
        )
        expect(vm.pagination.totalPages).toBe(2) // ceil(25/20)
        expect(vm.items).toHaveLength(5) // page 2 remainder
        expect(vm.pagination.currentPage).toBe(2)
      })

      test('returns totalPages=1 when there are no not-submitted organisations', async () => {
        mockObligationsApi.listComplianceDeclarations.mockResolvedValue({
          total: 0,
          complianceDeclarations: []
        })
        mockOrganisationsApi.listComplianceOrganisations.mockResolvedValue({
          organisations: []
        })

        const vm = await getCertificatesOfComplianceViewModel(
          'direct-producers',
          'not-submitted',
          1
        )
        expect(vm.pagination.totalPages).toBe(1)
      })
    })

    describe('getComplianceList — unknown tab', () => {
      test('returns empty items and totalPages=1 without calling the list API', async () => {
        mockObligationsApi.listComplianceDeclarations.mockImplementation(
          ({ pageSize }) => {
            if (pageSize === 1) {
              return Promise.resolve({ total: 0, complianceDeclarations: [] })
            }
            throw new Error('list API should not be called for unknown tab')
          }
        )
        mockOrganisationsApi.listComplianceOrganisations.mockResolvedValue({
          organisations: []
        })

        const vm = await getCertificatesOfComplianceViewModel(
          'direct-producers',
          'unknown-tab',
          1
        )
        expect(vm.items).toEqual([])
        expect(vm.pagination.totalPages).toBe(1)
      })
    })

    describe('fetchAllDeclarations — multi-page', () => {
      test('fetches all pages when total exceeds batch size (100)', async () => {
        // 150 total → 2 pages, used by not-submitted tab
        mockObligationsApi.listComplianceDeclarations.mockImplementation(
          ({ pageSize, page, status }) => {
            if (pageSize === 1) {
              return Promise.resolve({ total: 0, complianceDeclarations: [] })
            }
            if (pageSize === 100 && status === 'Submitted') {
              if (page === 1) {
                return Promise.resolve({
                  total: 150,
                  complianceDeclarations: Array.from(
                    { length: 100 },
                    (_, i) => ({
                      organisation: { id: `sub-${i}` }
                    })
                  )
                })
              }
              return Promise.resolve({
                total: 150,
                complianceDeclarations: Array.from({ length: 50 }, (_, i) => ({
                  organisation: { id: `sub-${i + 100}` }
                }))
              })
            }
            return Promise.resolve({ total: 0, complianceDeclarations: [] })
          }
        )
        mockOrganisationsApi.listComplianceOrganisations.mockResolvedValue({
          organisations: [
            {
              id: 'sub-0',
              name: 'Already Submitted',
              companiesHouseNumber: 'CH000',
              registrationType: 'DirectProducer'
            },
            {
              id: 'not-submitted-1',
              name: 'Not Submitted',
              companiesHouseNumber: 'CH999',
              registrationType: 'DirectProducer'
            }
          ]
        })

        const vm = await getCertificatesOfComplianceViewModel(
          'direct-producers',
          'not-submitted',
          1
        )
        // sub-0 is in page 1 of submitted declarations, so only not-submitted-1 should appear
        expect(vm.items).toHaveLength(1)
        expect(vm.items[0].organisationId).toBe('not-submitted-1')
      })
    })

    describe('mapDeclarationToItem', () => {
      const setupPendingTab = (declarations) => {
        mockObligationsApi.listComplianceDeclarations.mockImplementation(
          ({ pageSize }) => {
            if (pageSize === 1) {
              return Promise.resolve({
                total: declarations.length,
                complianceDeclarations: []
              })
            }
            return Promise.resolve({
              total: declarations.length,
              complianceDeclarations: declarations
            })
          }
        )
        mockOrganisationsApi.listComplianceOrganisations.mockResolvedValue({
          organisations: declarations.map((d) => ({ id: d.organisation.id }))
        })
      }

      test('uses name when available', async () => {
        setupPendingTab([makeDeclaration()])
        const vm = await getCertificatesOfComplianceViewModel(
          'direct-producers',
          'pending',
          1
        )
        expect(vm.items[0].organisationName).toBe('Test Org')
      })

      test('falls back to complianceSchemeName when name is null', async () => {
        setupPendingTab([
          makeDeclaration({
            organisation: {
              name: null,
              complianceSchemeName: 'Scheme Name',
              schemeOperatorName: null
            }
          })
        ])
        const vm = await getCertificatesOfComplianceViewModel(
          'direct-producers',
          'pending',
          1
        )
        expect(vm.items[0].organisationName).toBe('Scheme Name')
      })

      test('falls back to schemeOperatorName when name and complianceSchemeName are null', async () => {
        setupPendingTab([
          makeDeclaration({
            organisation: {
              name: null,
              complianceSchemeName: null,
              schemeOperatorName: 'Operator Name'
            }
          })
        ])
        const vm = await getCertificatesOfComplianceViewModel(
          'direct-producers',
          'pending',
          1
        )
        expect(vm.items[0].organisationName).toBe('Operator Name')
      })

      test('falls back to "Unknown organisation" when all name fields are null', async () => {
        setupPendingTab([
          makeDeclaration({
            organisation: {
              name: null,
              complianceSchemeName: null,
              schemeOperatorName: null
            }
          })
        ])
        const vm = await getCertificatesOfComplianceViewModel(
          'direct-producers',
          'pending',
          1
        )
        expect(vm.items[0].organisationName).toBe('Unknown organisation')
      })

      test('sets percentageMet to null when not provided', async () => {
        setupPendingTab([makeDeclaration({ percentageMet: undefined })])
        const vm = await getCertificatesOfComplianceViewModel(
          'direct-producers',
          'pending',
          1
        )
        expect(vm.items[0].percentageMet).toBeNull()
      })

      test('maps obligationStatus=Met to recyclingObligationsMet=true', async () => {
        setupPendingTab([makeDeclaration({ obligationStatus: 'Met' })])
        const vm = await getCertificatesOfComplianceViewModel(
          'direct-producers',
          'pending',
          1
        )
        expect(vm.items[0].recyclingObligationsMet).toBe(true)
      })

      test('maps obligationStatus other than Met to recyclingObligationsMet=false', async () => {
        setupPendingTab([makeDeclaration({ obligationStatus: 'NotMet' })])
        const vm = await getCertificatesOfComplianceViewModel(
          'direct-producers',
          'pending',
          1
        )
        expect(vm.items[0].recyclingObligationsMet).toBe(false)
      })
    })

    describe('getCertificateOfComplianceDetailViewModel — real API', () => {
      test('calls getComplianceDeclaration with organisationId and id', async () => {
        const mockApi = {
          getComplianceDeclaration: vi.fn().mockResolvedValue(mockDetailData)
        }
        createWasteObligationsApiService.mockReturnValue(mockApi)

        await getCertificateOfComplianceDetailViewModel(
          'org-abc',
          'decl-1',
          'trace-z'
        )

        expect(mockApi.getComplianceDeclaration).toHaveBeenCalledWith(
          { organisationId: 'org-abc', id: 'decl-1' },
          'trace-z'
        )
      })

      test('maps obligationYear to complianceYear string', async () => {
        const mockApi = {
          getComplianceDeclaration: vi.fn().mockResolvedValue(mockDetailData)
        }
        createWasteObligationsApiService.mockReturnValue(mockApi)

        const vm = await getCertificateOfComplianceDetailViewModel(
          'org-abc',
          'decl-1'
        )

        expect(vm.complianceYear).toBe(String(mockDetailData.obligationYear))
      })

      test('maps organisation.name to companyName', async () => {
        const mockApi = {
          getComplianceDeclaration: vi.fn().mockResolvedValue(mockDetailData)
        }
        createWasteObligationsApiService.mockReturnValue(mockApi)

        const vm = await getCertificateOfComplianceDetailViewModel(
          'org-abc',
          'decl-1'
        )

        expect(vm.companyName).toBe(mockDetailData.organisation.name)
      })

      test('falls back to complianceSchemeName when organisation.name is null', async () => {
        const mockApi = {
          getComplianceDeclaration: vi.fn().mockResolvedValue({
            ...mockDetailData,
            organisation: {
              ...mockDetailData.organisation,
              name: null,
              complianceSchemeName: 'Scheme Co'
            }
          })
        }
        createWasteObligationsApiService.mockReturnValue(mockApi)

        const vm = await getCertificateOfComplianceDetailViewModel(
          'org-abc',
          'decl-1'
        )

        expect(vm.companyName).toBe('Scheme Co')
      })

      test('falls back to "Unknown organisation" when all name fields are null', async () => {
        const mockApi = {
          getComplianceDeclaration: vi.fn().mockResolvedValue({
            ...mockDetailData,
            organisation: {
              ...mockDetailData.organisation,
              name: null,
              complianceSchemeName: null,
              schemeOperatorName: null
            }
          })
        }
        createWasteObligationsApiService.mockReturnValue(mockApi)

        const vm = await getCertificateOfComplianceDetailViewModel(
          'org-abc',
          'decl-1'
        )

        expect(vm.companyName).toBe('Unknown organisation')
      })

      test('maps obligationStatus=Met to recyclingObligationsMet=true', async () => {
        const mockApi = {
          getComplianceDeclaration: vi
            .fn()
            .mockResolvedValue({ ...mockDetailData, obligationStatus: 'Met' })
        }
        createWasteObligationsApiService.mockReturnValue(mockApi)

        const vm = await getCertificateOfComplianceDetailViewModel(
          'org-abc',
          'decl-1'
        )

        expect(vm.recyclingObligationsMet).toBe(true)
      })

      test('maps obligationStatus other than Met to recyclingObligationsMet=false', async () => {
        const mockApi = {
          getComplianceDeclaration: vi.fn().mockResolvedValue({
            ...mockDetailData,
            obligationStatus: 'NotMet'
          })
        }
        createWasteObligationsApiService.mockReturnValue(mockApi)

        const vm = await getCertificateOfComplianceDetailViewModel(
          'org-abc',
          'decl-1'
        )

        expect(vm.recyclingObligationsMet).toBe(false)
      })

      test('formats created date as human-readable string', async () => {
        const mockApi = {
          getComplianceDeclaration: vi.fn().mockResolvedValue({
            ...mockDetailData,
            created: '2027-01-31T00:00:00Z'
          })
        }
        createWasteObligationsApiService.mockReturnValue(mockApi)

        const vm = await getCertificateOfComplianceDetailViewModel(
          'org-abc',
          'decl-1'
        )

        expect(vm.dateDeclarationSubmitted).toBe('31 January 2027')
      })

      test('maps DirectProducer registrationType to display name', async () => {
        const mockApi = {
          getComplianceDeclaration: vi.fn().mockResolvedValue(mockDetailData)
        }
        createWasteObligationsApiService.mockReturnValue(mockApi)

        const vm = await getCertificateOfComplianceDetailViewModel(
          'org-abc',
          'decl-1'
        )

        expect(vm.organisationType).toBe('Direct producer')
      })

      test('maps ComplianceScheme registrationType to display name', async () => {
        const mockApi = {
          getComplianceDeclaration: vi.fn().mockResolvedValue({
            ...mockDetailData,
            organisation: {
              ...mockDetailData.organisation,
              registrationType: 'ComplianceScheme'
            }
          })
        }
        createWasteObligationsApiService.mockReturnValue(mockApi)

        const vm = await getCertificateOfComplianceDetailViewModel(
          'org-abc',
          'decl-1'
        )

        expect(vm.organisationType).toBe('Compliance scheme')
      })

      test('maps submitterName to declarationSignedBy', async () => {
        const mockApi = {
          getComplianceDeclaration: vi.fn().mockResolvedValue(mockDetailData)
        }
        createWasteObligationsApiService.mockReturnValue(mockApi)

        const vm = await getCertificateOfComplianceDetailViewModel(
          'org-abc',
          'decl-1'
        )

        expect(vm.declarationSignedBy).toBe(mockDetailData.submitterName)
      })

      test('splits obligations into materials and glassBreakdown', async () => {
        const mockApi = {
          getComplianceDeclaration: vi.fn().mockResolvedValue(mockDetailData)
        }
        createWasteObligationsApiService.mockReturnValue(mockApi)

        const vm = await getCertificateOfComplianceDetailViewModel(
          'org-abc',
          'decl-1'
        )

        const glassBreakdownMaterials = new Set([
          'GlassRemelt',
          'RemainingGlass'
        ])
        const expectedMaterials = mockDetailData.obligations.filter(
          (o) => !glassBreakdownMaterials.has(o.material)
        )
        const expectedGlass = mockDetailData.obligations.filter((o) =>
          glassBreakdownMaterials.has(o.material)
        )

        expect(vm.materials).toHaveLength(expectedMaterials.length)
        expect(vm.glassBreakdown).toHaveLength(expectedGlass.length)
      })

      test('computes materialTotals from main obligations', async () => {
        const mockApi = {
          getComplianceDeclaration: vi.fn().mockResolvedValue(mockDetailData)
        }
        createWasteObligationsApiService.mockReturnValue(mockApi)

        const vm = await getCertificateOfComplianceDetailViewModel(
          'org-abc',
          'decl-1'
        )

        const expectedTotal = mockDetailData.obligations
          .filter(
            (o) => !['GlassRemelt', 'RemainingGlass'].includes(o.material)
          )
          .reduce((sum, o) => sum + o.tonnages.obligated, 0)

        expect(vm.materialTotals.obligationToMeet).toBe(expectedTotal)
      })

      test('materialTotals.met is false when any material is not met', async () => {
        const mockApi = {
          getComplianceDeclaration: vi.fn().mockResolvedValue({
            ...mockDetailData,
            obligations: mockDetailData.obligations.map((o, i) =>
              i === 0 ? { ...o, status: 'NotMet' } : o
            )
          })
        }
        createWasteObligationsApiService.mockReturnValue(mockApi)

        const vm = await getCertificateOfComplianceDetailViewModel(
          'org-abc',
          'decl-1'
        )

        expect(vm.materialTotals.met).toBe(false)
      })

      test('maps obligation tonnages correctly', async () => {
        const mockApi = {
          getComplianceDeclaration: vi.fn().mockResolvedValue(mockDetailData)
        }
        createWasteObligationsApiService.mockReturnValue(mockApi)

        const vm = await getCertificateOfComplianceDetailViewModel(
          'org-abc',
          'decl-1'
        )
        const aluminiumObligation = mockDetailData.obligations[0]
        const aluminiumRow = vm.materials.find((m) => m.name === 'Aluminium')

        expect(aluminiumRow).toMatchObject({
          obligationToMeet: aluminiumObligation.tonnages.obligated,
          awaitingAcceptance: aluminiumObligation.tonnages.awaitingAcceptance,
          accepted: aluminiumObligation.tonnages.accepted,
          outstanding: aluminiumObligation.tonnages.outstanding,
          met: aluminiumObligation.status === 'Met'
        })
      })

      test('passes through material name directly from API', async () => {
        const mockApi = {
          getComplianceDeclaration: vi.fn().mockResolvedValue(mockDetailData)
        }
        createWasteObligationsApiService.mockReturnValue(mockApi)

        const vm = await getCertificateOfComplianceDetailViewModel(
          'org-abc',
          'decl-1'
        )

        expect(vm.materials[0].name).toBe(
          mockDetailData.obligations[0].material
        )
      })
    })

    describe('not-submitted — Account API organisation resolution', () => {
      const setupNotSubmittedTab = (orgs) => {
        mockObligationsApi.listComplianceDeclarations.mockResolvedValue({
          total: 0,
          complianceDeclarations: []
        })
        mockOrganisationsApi.listComplianceOrganisations.mockResolvedValue({
          organisations: orgs
        })
      }

      test('sets organisationId from the org id and defaults details to "No data"', async () => {
        setupNotSubmittedTab([{ id: 'org-guid-1' }])
        mockAccountApi.getOrganisationsByExternalIds.mockResolvedValue({
          organisations: [],
          notFoundExternalIds: ['org-guid-1']
        })

        const vm = await getCertificatesOfComplianceViewModel(
          'direct-producers',
          'not-submitted',
          1
        )

        expect(vm.items[0]).toMatchObject({
          organisationId: 'org-guid-1',
          organisationReferenceNumber: 'No data',
          organisationName: 'No data'
        })
      })

      test('resolves reference number and name from the Account API', async () => {
        setupNotSubmittedTab([{ id: 'org-guid-1' }, { id: 'org-guid-2' }])
        mockAccountApi.getOrganisationsByExternalIds.mockResolvedValue({
          organisations: [
            {
              externalId: 'org-guid-1',
              name: 'Redwood Retail Group',
              referenceNumber: '518293'
            },
            {
              externalId: 'org-guid-2',
              name: 'Maple Manufacturing',
              referenceNumber: '600124'
            }
          ],
          notFoundExternalIds: []
        })

        const vm = await getCertificatesOfComplianceViewModel(
          'direct-producers',
          'not-submitted',
          1
        )

        expect(vm.items).toEqual([
          expect.objectContaining({
            organisationId: 'org-guid-1',
            organisationReferenceNumber: '518293',
            organisationName: 'Redwood Retail Group'
          }),
          expect.objectContaining({
            organisationId: 'org-guid-2',
            organisationReferenceNumber: '600124',
            organisationName: 'Maple Manufacturing'
          })
        ])
      })

      test('shows "No data" for unresolved ids while other rows render', async () => {
        setupNotSubmittedTab([{ id: 'org-guid-1' }, { id: 'org-guid-2' }])
        mockAccountApi.getOrganisationsByExternalIds.mockResolvedValue({
          organisations: [
            {
              externalId: 'org-guid-1',
              name: 'Redwood Retail Group',
              referenceNumber: '518293'
            }
          ],
          notFoundExternalIds: ['org-guid-2']
        })

        const vm = await getCertificatesOfComplianceViewModel(
          'direct-producers',
          'not-submitted',
          1
        )

        expect(vm.items[0]).toMatchObject({
          organisationReferenceNumber: '518293',
          organisationName: 'Redwood Retail Group'
        })
        expect(vm.items[1]).toMatchObject({
          organisationId: 'org-guid-2',
          organisationReferenceNumber: 'No data',
          organisationName: 'No data'
        })
      })

      test('calls the Account API with the page slice external ids and the traceId', async () => {
        setupNotSubmittedTab([{ id: 'org-guid-1' }, { id: 'org-guid-2' }])

        await getCertificatesOfComplianceViewModel(
          'direct-producers',
          'not-submitted',
          1,
          'trace-acct'
        )

        expect(
          mockAccountApi.getOrganisationsByExternalIds
        ).toHaveBeenCalledWith(['org-guid-1', 'org-guid-2'], 'trace-acct')
      })

      test('does not call the Account API when there are no not-submitted organisations', async () => {
        setupNotSubmittedTab([])

        await getCertificatesOfComplianceViewModel(
          'direct-producers',
          'not-submitted',
          1
        )

        expect(
          mockAccountApi.getOrganisationsByExternalIds
        ).not.toHaveBeenCalled()
      })

      test('propagates Account API failures so the error page is shown', async () => {
        setupNotSubmittedTab([{ id: 'org-guid-1' }])
        const apiError = Object.assign(new Error('account API failed'), {
          name: 'ApiError',
          status: 500
        })
        mockAccountApi.getOrganisationsByExternalIds.mockRejectedValue(apiError)

        await expect(
          getCertificatesOfComplianceViewModel(
            'direct-producers',
            'not-submitted',
            1
          )
        ).rejects.toMatchObject({ name: 'ApiError', status: 500 })
      })

      test('does not call the Account API for the pending tab', async () => {
        mockObligationsApi.listComplianceDeclarations.mockResolvedValue({
          total: 0,
          complianceDeclarations: []
        })
        mockOrganisationsApi.listComplianceOrganisations.mockResolvedValue({
          organisations: []
        })

        await getCertificatesOfComplianceViewModel(
          'direct-producers',
          'pending',
          1
        )

        expect(
          mockAccountApi.getOrganisationsByExternalIds
        ).not.toHaveBeenCalled()
      })
    })
  })
})
