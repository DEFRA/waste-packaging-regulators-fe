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
  getCertificateOfComplianceDetailViewModel,
  buildCertificateDetailActions,
  buildCertificateSuccessBanner,
  mapDeclarationStatusToReviewStatus,
  mapSessionUserToApiUser,
  approveComplianceDeclaration,
  readAndClearCertificateActionBannerFlags,
  certificateActionSessionKeys,
  mockSummary,
  mockPendingItems,
  mockAcceptedItems,
  mockNotSubmittedItems,
  mockDetailData,
  mockComplianceSchemePendingItems,
  mockComplianceSchemeDetailData
} from './certificates-of-compliance.service.js'
import {
  mockSummaryByOrganisationType,
  mockQueriedDetailData,
  mockCancelledDetailData
} from './certificates-of-compliance.mock.js'

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

    test('returns compliance-schemes mock summary data', async () => {
      const vm = await getCertificatesOfComplianceViewModel(
        'compliance-schemes',
        'pending',
        1
      )
      expect(vm.totalPending).toBe(
        mockSummaryByOrganisationType['compliance-schemes'].totalPending
      )
      expect(vm.totalAccepted).toBe(
        mockSummaryByOrganisationType['compliance-schemes'].totalAccepted
      )
    })

    test('returns compliance-schemes mock pending items', async () => {
      const vm = await getCertificatesOfComplianceViewModel(
        'compliance-schemes',
        'pending',
        1
      )
      expect(vm.items[0].organisationName).toBe('EcoPack Compliance Ltd')
      expect(vm.items[0].regulation43Met).toBe(false)
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
      expect(vm.reviewStatus).toBe('Pending')
      expect(vm.actions).toMatchObject({
        showAccept: true,
        showCancel: true,
        labels: {
          accept: 'Accept certificate',
          cancel: 'Cancel certificate'
        },
        urls: {
          accept: '/org-abc/certificates-of-compliance/decl-1/approve',
          cancel: '/org-abc/certificates-of-compliance/decl-1/cancel'
        }
      })
      expect(vm.successBanner).toBeNull()
    })

    test('getCertificateOfComplianceDetailViewModel returns compliance-schemes mock detail', async () => {
      const item = mockComplianceSchemePendingItems[0]
      const vm = await getCertificateOfComplianceDetailViewModel(
        item.organisationId,
        item.id
      )
      expect(vm.companyName).toBe(
        mockComplianceSchemeDetailData.organisation.complianceSchemeName
      )
      expect(vm.organisationType).toBe('Compliance scheme')
      expect(vm.actions.labels).toEqual({
        accept: 'Accept statement',
        cancel: 'Cancel statement'
      })
    })

    test('getCertificateOfComplianceDetailViewModel returns success banner when flagged', async () => {
      const vm = await getCertificateOfComplianceDetailViewModel(
        'org-abc',
        'decl-1',
        undefined,
        {
          showApprovalBanner: true,
          showQueryBanner: false,
          showCancelBanner: false
        }
      )
      expect(vm.successBanner).toEqual({
        heading: 'Certificate accepted',
        text: 'Certificate has been accepted.'
      })
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

      test('maps Accepted status to Approved review status with no action buttons', async () => {
        const mockApi = {
          getComplianceDeclaration: vi.fn().mockResolvedValue({
            ...mockDetailData,
            status: 'Accepted'
          })
        }
        createWasteObligationsApiService.mockReturnValue(mockApi)

        const vm = await getCertificateOfComplianceDetailViewModel(
          'org-abc',
          'decl-1'
        )

        expect(vm.reviewStatus).toBe('Approved')
        expect(vm.actions).toMatchObject({
          showAccept: false,
          showCancel: false
        })
      })

      test('maps Queried status with query details', async () => {
        const mockApi = {
          getComplianceDeclaration: vi
            .fn()
            .mockResolvedValue(mockQueriedDetailData)
        }
        createWasteObligationsApiService.mockReturnValue(mockApi)

        const vm = await getCertificateOfComplianceDetailViewModel(
          'org-abc',
          'decl-queried'
        )

        expect(vm.reviewStatus).toBe('Queried')
        expect(vm.actions).toMatchObject({
          showAccept: true,
          showCancel: true
        })
        expect(vm.queryDetails).toEqual({
          queriedMaterials: mockQueriedDetailData.queryDetails.queriedMaterials,
          reason: mockQueriedDetailData.queryDetails.reason,
          dateQueried: '17 March 2026'
        })
      })

      test('maps Cancelled status with cancellation details', async () => {
        const mockApi = {
          getComplianceDeclaration: vi
            .fn()
            .mockResolvedValue(mockCancelledDetailData)
        }
        createWasteObligationsApiService.mockReturnValue(mockApi)

        const vm = await getCertificateOfComplianceDetailViewModel(
          'org-abc',
          'decl-cancelled'
        )

        expect(vm.reviewStatus).toBe('Cancelled')
        expect(vm.cancellationDetails).toEqual({
          reason: mockCancelledDetailData.cancellationDetails.reason,
          resubmissionRequested: 'Yes',
          dateCancelled: '10 March 2026'
        })
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

describe('certificate detail action helpers', () => {
  test('mapDeclarationStatusToReviewStatus maps known statuses', () => {
    expect(mapDeclarationStatusToReviewStatus('Submitted')).toBe('Pending')
    expect(mapDeclarationStatusToReviewStatus('Accepted')).toBe('Approved')
    expect(mapDeclarationStatusToReviewStatus('Queried')).toBe('Queried')
    expect(mapDeclarationStatusToReviewStatus('Cancelled')).toBe('Cancelled')
    expect(mapDeclarationStatusToReviewStatus('Unknown')).toBe('Pending')
  })

  test('buildCertificateDetailActions shows buttons by review status', () => {
    expect(
      buildCertificateDetailActions(
        'Pending',
        'org-1',
        'decl-1',
        'DirectProducer'
      )
    ).toEqual({
      showAccept: true,
      showCancel: true,
      labels: {
        accept: 'Accept certificate',
        cancel: 'Cancel certificate'
      },
      urls: {
        accept: '/org-1/certificates-of-compliance/decl-1/approve',
        cancel: '/org-1/certificates-of-compliance/decl-1/cancel'
      }
    })
    expect(
      buildCertificateDetailActions(
        'Queried',
        'org-1',
        'decl-1',
        'DirectProducer'
      )
    ).toMatchObject({
      showAccept: true,
      showCancel: true
    })
    expect(
      buildCertificateDetailActions(
        'Approved',
        'org-1',
        'decl-1',
        'DirectProducer'
      )
    ).toMatchObject({
      showAccept: false,
      showCancel: false
    })
  })

  test('buildCertificateDetailActions uses statement labels for compliance schemes', () => {
    expect(
      buildCertificateDetailActions(
        'Pending',
        'org-1',
        'decl-1',
        'ComplianceScheme'
      ).labels
    ).toEqual({
      accept: 'Accept statement',
      cancel: 'Cancel statement'
    })
  })

  test('buildCertificateSuccessBanner returns copy by registration type', () => {
    expect(
      buildCertificateSuccessBanner(
        {
          showApprovalBanner: true,
          showQueryBanner: false,
          showCancelBanner: false
        },
        'DirectProducer'
      )
    ).toEqual({
      heading: 'Certificate accepted',
      text: 'Certificate has been accepted.'
    })
    expect(
      buildCertificateSuccessBanner(
        {
          showApprovalBanner: false,
          showQueryBanner: false,
          showCancelBanner: true
        },
        'DirectProducer'
      )
    ).toEqual({
      heading: 'Certificate cancelled',
      text: 'Certificate has been cancelled and an email sent to the producer.'
    })
    expect(
      buildCertificateSuccessBanner(
        {
          showApprovalBanner: true,
          showQueryBanner: false,
          showCancelBanner: false
        },
        'ComplianceScheme'
      )
    ).toEqual({
      heading: 'Statement accepted',
      text: 'Statement has been accepted.'
    })
    expect(
      buildCertificateSuccessBanner(
        {
          showApprovalBanner: false,
          showQueryBanner: false,
          showCancelBanner: true
        },
        'ComplianceScheme'
      )
    ).toEqual({
      heading: 'Statement cancelled',
      text: 'Statement has been cancelled and an email sent to the compliance scheme.'
    })
    expect(
      buildCertificateSuccessBanner(
        {
          showApprovalBanner: false,
          showQueryBanner: true,
          showCancelBanner: false
        },
        'DirectProducer'
      )
    ).toBeNull()
    expect(
      buildCertificateSuccessBanner(
        {
          showApprovalBanner: false,
          showQueryBanner: false,
          showCancelBanner: false
        },
        'DirectProducer'
      )
    ).toBeNull()
  })

  test('readAndClearCertificateActionBannerFlags reads and clears session keys', () => {
    const session = {
      data: {
        [certificateActionSessionKeys.justApproved]: 'org-1/decl-1',
        [certificateActionSessionKeys.justCancelled]: 'org-1/decl-2'
      },
      get(key) {
        return this.data[key]
      },
      clear(key) {
        delete this.data[key]
      }
    }

    const flags = readAndClearCertificateActionBannerFlags(
      session,
      'org-1/decl-1'
    )

    expect(flags).toEqual({
      showApprovalBanner: true,
      showQueryBanner: false,
      showCancelBanner: false
    })
    expect(
      session.data[certificateActionSessionKeys.justApproved]
    ).toBeUndefined()
    expect(session.data[certificateActionSessionKeys.justCancelled]).toBe(
      'org-1/decl-2'
    )
  })

  test('mapSessionUserToApiUser maps profile credentials', () => {
    expect(
      mapSessionUserToApiUser({
        profile: { sub: 'user-123', email: 'regulator@example.com' }
      })
    ).toEqual({
      id: 'user-123',
      email: 'regulator@example.com'
    })
  })

  test('mapSessionUserToApiUser falls back for mock auth', () => {
    expect(mapSessionUserToApiUser({ user: 'mock-user' })).toEqual({
      id: 'mock-user',
      email: 'mock-user@test.local'
    })
  })

  describe('approveComplianceDeclaration', () => {
    test('skips API call when useMockApi is true', async () => {
      config.get.mockReturnValue(true)

      await approveComplianceDeclaration(
        'org-1',
        'decl-1',
        { user: 'mock-user' },
        'trace-1'
      )

      expect(createWasteObligationsApiService).not.toHaveBeenCalled()
    })

    test('calls updateComplianceDeclaration when useMockApi is false', async () => {
      config.get.mockReturnValue(false)
      const mockApi = { updateComplianceDeclaration: vi.fn() }
      createWasteObligationsApiService.mockReturnValue(mockApi)

      await approveComplianceDeclaration(
        'org-1',
        'decl-1',
        { profile: { sub: 'user-1', email: 'user@example.com' } },
        'trace-1'
      )

      expect(mockApi.updateComplianceDeclaration).toHaveBeenCalledWith(
        {
          organisationId: 'org-1',
          id: 'decl-1',
          status: 'Accepted',
          user: { id: 'user-1', email: 'user@example.com' }
        },
        'trace-1'
      )
    })
  })
})
