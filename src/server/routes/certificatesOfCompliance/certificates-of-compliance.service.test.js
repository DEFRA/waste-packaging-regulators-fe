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

import { config } from '#/config/config.js'
import { createWasteObligationsApiService } from '#/services/waste-obligations-api.service.js'
import { createWasteOrganisationsApiService } from '#/services/waste-organisations-api.service.js'
import {
  getCertificatesOfComplianceViewModel,
  mockSummary,
  mockPendingItems,
  mockAcceptedItems,
  mockNotSubmittedItems
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
  })

  describe('with real API (useMockApi=false)', () => {
    let mockObligationsApi
    let mockOrganisationsApi

    beforeEach(() => {
      config.get.mockReturnValue(false)
      mockObligationsApi = { listComplianceDeclarations: vi.fn() }
      mockOrganisationsApi = { listComplianceOrganisations: vi.fn() }
      createWasteObligationsApiService.mockReturnValue(mockObligationsApi)
      createWasteOrganisationsApiService.mockReturnValue(mockOrganisationsApi)
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
          id: 'REF001',
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
        expect(vm.items.map((i) => i.id)).toEqual(['CH002', 'CH003'])
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
        expect(vm.items[0].id).toBe('CH002')
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
        expect(vm.items[0].id).toBe('CH999')
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

    describe('mapOrganisationToItem', () => {
      const setupNotSubmittedTab = (orgs) => {
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
      }

      test('uses tradingName for compliance-schemes organisations', async () => {
        setupNotSubmittedTab([
          {
            id: 'org-1',
            name: 'Org Name',
            tradingName: 'Trading Name',
            companiesHouseNumber: 'CH001',
            registrationType: 'compliance-schemes'
          }
        ])
        const vm = await getCertificatesOfComplianceViewModel(
          'compliance-schemes',
          'not-submitted',
          1
        )
        expect(vm.items[0].organisationName).toBe('Trading Name')
      })

      test('falls back to name when tradingName is null for compliance-schemes', async () => {
        setupNotSubmittedTab([
          {
            id: 'org-1',
            name: 'Org Name',
            tradingName: null,
            companiesHouseNumber: 'CH001',
            registrationType: 'compliance-schemes'
          }
        ])
        const vm = await getCertificatesOfComplianceViewModel(
          'compliance-schemes',
          'not-submitted',
          1
        )
        expect(vm.items[0].organisationName).toBe('Org Name')
      })

      test('falls back to "Unknown organisation" for compliance-schemes when all names null', async () => {
        setupNotSubmittedTab([
          {
            id: 'org-1',
            name: null,
            tradingName: null,
            companiesHouseNumber: 'CH001',
            registrationType: 'compliance-schemes'
          }
        ])
        const vm = await getCertificatesOfComplianceViewModel(
          'compliance-schemes',
          'not-submitted',
          1
        )
        expect(vm.items[0].organisationName).toBe('Unknown organisation')
      })

      test('uses name directly for non-compliance-scheme organisations', async () => {
        setupNotSubmittedTab([
          {
            id: 'org-1',
            name: 'Producer Name',
            companiesHouseNumber: 'CH001',
            registrationType: 'DirectProducer'
          }
        ])
        const vm = await getCertificatesOfComplianceViewModel(
          'direct-producers',
          'not-submitted',
          1
        )
        expect(vm.items[0].organisationName).toBe('Producer Name')
      })

      test('falls back to "Unknown organisation" when name is null for non-compliance-scheme', async () => {
        setupNotSubmittedTab([
          {
            id: 'org-1',
            name: null,
            companiesHouseNumber: 'CH001',
            registrationType: 'DirectProducer'
          }
        ])
        const vm = await getCertificatesOfComplianceViewModel(
          'direct-producers',
          'not-submitted',
          1
        )
        expect(vm.items[0].organisationName).toBe('Unknown organisation')
      })

      test('uses companiesHouseNumber as item id', async () => {
        setupNotSubmittedTab([
          {
            id: 'org-1',
            name: 'Org',
            companiesHouseNumber: 'CH12345678',
            registrationType: 'DirectProducer'
          }
        ])
        const vm = await getCertificatesOfComplianceViewModel(
          'direct-producers',
          'not-submitted',
          1
        )
        expect(vm.items[0].id).toBe('CH12345678')
      })
    })
  })
})
