import { describe, expect, test, vi, beforeEach } from 'vitest'

vi.mock('#config/config.js', () => ({
  config: { get: vi.fn() }
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
import { ApiError } from '#services/apiBaseClient/api-error.js'
import { createWasteObligationsApiService } from '#services/waste-obligations-api.service.js'
import { createWasteOrganisationsApiService } from '#services/waste-organisations-api.service.js'
import { createAccountApiService } from '#services/account-api.service.js'
import {
  getCertificatesOfComplianceViewModel,
  getCertificateOfComplianceDetailViewModel,
  buildCertificateDetailActions,
  buildCertificateSuccessBanner,
  buildComplianceTypeLabel,
  buildRegulation43Statement,
  displayOrNoData,
  mapDeclarationStatusToReviewStatus,
  mapSessionUserToApiUser,
  approveComplianceDeclaration,
  cancelComplianceDeclaration,
  readAndClearCertificateActionBannerFlags,
  canApproveComplianceDeclaration,
  canCancelComplianceDeclaration,
  setMockDeclarationStatusOverride,
  certificateActionSessionKeys,
  deriveRegistrationType,
  mapWasteOrganisationToDetailFields,
  findSubmittedAuditUser,
  mockSummary,
  mockPendingItems,
  mockAcceptedItems,
  mockNotSubmittedItems,
  mockDetailData,
  mockObligationData,
  mockComplianceSchemePendingItems,
  mockComplianceSchemeDetailData,
  mockDirectProducerAcceptedDetailData,
  mockDirectProducerCancelledDetailData,
  mockComplianceSchemeAcceptedDetailData,
  mockComplianceSchemeCancelledDetailData
} from './certificates-of-compliance.service.js'
import {
  mockSummaryByOrganisationType,
  mockQueriedDetailData,
  mockCancelledDetailData,
  mockSubmittedAuditEntry,
  mockDirectProducerPendingNotMetDetailData
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
      createAccountApiService.mockReturnValue({
        getAccountDetailsById: vi
          .fn()
          .mockResolvedValue({ telephone: '01234 567890' })
      })
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
      expect(vm.complianceTypeLabel).toBe('2026 certificate of compliance')
      expect(vm.companyName).toBe(mockDetailData.organisation.name)
      expect(vm.nameOnAccount).toBe(mockSubmittedAuditEntry.user.name)
      expect(vm.declarationEmailAddress).toBe(
        mockSubmittedAuditEntry.user.email
      )
      expect(vm.companyPhoneNumber).toBe('01234 567890')
      expect(vm.declarationSignedBy).toBe(mockDetailData.submitterName)
      expect(vm.heading).toBe('Certificate of compliance')
      expect(vm.backlink).toBe('/certificates-of-compliance')
      expect(vm.reviewStatus).toBe('Pending')
      expect(vm.showDeclaration).toBe(true)
      expect(vm.complianceDocumentNoun).toBe('certificate of compliance')
      expect(vm.actions).toMatchObject({
        showAccept: true,
        showCancel: true,
        labels: {
          accept: 'Accept certificate',
          cancel: 'Cancel certificate'
        },
        urls: {
          accept: '/org-abc/certificates-of-compliance/decl-1/accept',
          cancel: '/org-abc/certificates-of-compliance/decl-1/cancel/reason'
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
      expect(vm.complianceTypeLabel).toBe('2026 statement of compliance')
      expect(vm.showDeclaration).toBe(true)
      expect(vm.complianceDocumentNoun).toBe('statement of compliance')
    })

    test('getCertificateOfComplianceDetailViewModel returns not-submitted mock detail with organisation name', async () => {
      const item = mockNotSubmittedItems[0]
      const vm = await getCertificateOfComplianceDetailViewModel(
        item.organisationId,
        undefined,
        { obligationYear: 2026 }
      )

      expect(vm.companyName).toBe(item.organisationName)
      expect(vm.organisationRef).toBe(item.organisationReferenceNumber)
      expect(vm.companiesHouseNumber).toBe('17121895')
      expect(vm.organisationType).toBe('Direct producer')
      expect(vm.nameOnAccount).toBe('No data')
      expect(vm.declarationEmailAddress).toBe('No data')
      expect(vm.companyPhoneNumber).toBe('No data')
      expect(vm.declarationStatus).toBe('Unsubmitted')
      expect(vm.showDeclaration).toBe(false)
      expect(vm.complianceTypeLabel).toBe('2026 certificate of compliance')
    })

    test('getCertificateOfComplianceDetailViewModel returns not-submitted mock detail for org without waste-organisations mock', async () => {
      const item = mockNotSubmittedItems[1]
      const vm = await getCertificateOfComplianceDetailViewModel(
        item.organisationId,
        undefined,
        { obligationYear: 2026 }
      )

      expect(vm.companyName).toBe('Coastal Bottling Co')
      expect(vm.organisationRef).toBe('627148')
      expect(vm.companiesHouseNumber).toBe('No data')
      expect(vm.organisationType).toBe('No data')
    })

    test('getCertificateOfComplianceDetailViewModel returns No data companyName for unknown not-submitted org', async () => {
      const vm = await getCertificateOfComplianceDetailViewModel(
        'unknown-org-id',
        undefined,
        { obligationYear: 2026 }
      )

      expect(vm.companyName).toBe('No data')
    })

    describe('showObligations', () => {
      test('is true when the org has obligations', async () => {
        const item = mockNotSubmittedItems[0] // Redwood Retail — uses default mockObligationData
        const vm = await getCertificateOfComplianceDetailViewModel(
          item.organisationId,
          undefined,
          { obligationYear: 2026 }
        )

        expect(vm.showObligations).toBe(true)
      })

      test('is false when the org has an empty obligations array', async () => {
        const item = mockNotSubmittedItems[3] // Pinnacle Containers Ltd — obligations: []
        const vm = await getCertificateOfComplianceDetailViewModel(
          item.organisationId,
          undefined,
          { obligationYear: 2026 }
        )

        expect(vm.showObligations).toBe(false)
      })

      test('is false when the org has null obligations', async () => {
        const item = mockNotSubmittedItems[2] // Sterling Packaging Ltd — obligations: null
        const vm = await getCertificateOfComplianceDetailViewModel(
          item.organisationId,
          undefined,
          { obligationYear: 2026 }
        )

        expect(vm.showObligations).toBe(false)
      })
    })

    test('getCertificateOfComplianceDetailViewModel returns accepted direct producer detail', async () => {
      const vm = await getCertificateOfComplianceDetailViewModel(
        mockDirectProducerAcceptedDetailData.organisation.id,
        mockDirectProducerAcceptedDetailData.id
      )
      expect(vm.companyName).toBe('Acme Compliance Co')
      expect(vm.reviewStatus).toBe('Approved')
      expect(vm.actions.showAccept).toBe(false)
      expect(vm.actions.showCancel).toBe(true)
      expect(vm.showAcceptedOutcome).toBe(true)
      expect(vm.complianceStatusLabel).toBe('Certificate status')
      expect(vm.acceptedBy).toBe('James Walker')
      expect(vm.acceptedDate).toBe('15 January 2027 at 14:30')
    })

    test('getCertificateOfComplianceDetailViewModel returns accepted compliance scheme detail', async () => {
      const vm = await getCertificateOfComplianceDetailViewModel(
        mockComplianceSchemeAcceptedDetailData.organisation.id,
        mockComplianceSchemeAcceptedDetailData.id
      )
      expect(vm.companyName).toBe('Nationwide Packaging Scheme')
      expect(vm.reviewStatus).toBe('Approved')
      expect(vm.actions.showAccept).toBe(false)
      expect(vm.actions.showCancel).toBe(true)
      expect(vm.actions.labels.accept).toBe('Accept statement')
      expect(vm.showAcceptedOutcome).toBe(true)
      expect(vm.complianceStatusLabel).toBe('Statement status')
      expect(vm.acceptedBy).toBe('James Walker')
      expect(vm.acceptedDate).toBe('12 January 2027 at 12:05')
    })

    test('getCertificateOfComplianceDetailViewModel returns cancelled direct producer detail', async () => {
      const vm = await getCertificateOfComplianceDetailViewModel(
        mockDirectProducerCancelledDetailData.organisation.id,
        mockDirectProducerCancelledDetailData.id
      )
      expect(vm.companyName).toBe('Greenfield Packaging Ltd')
      expect(vm.reviewStatus).toBe('Cancelled')
      expect(vm.showDeclaration).toBe(true)
      expect(vm.actions.showAccept).toBe(false)
      expect(vm.actions.showCancel).toBe(false)
      expect(vm.cancellationDetails.reason).toBe(
        mockDirectProducerCancelledDetailData.cancellationDetails.reason
      )
    })

    test('getCertificateOfComplianceDetailViewModel returns cancelled compliance scheme detail', async () => {
      const vm = await getCertificateOfComplianceDetailViewModel(
        mockComplianceSchemeCancelledDetailData.organisation.id,
        mockComplianceSchemeCancelledDetailData.id
      )
      expect(vm.companyName).toBe('GreenCircle Schemes')
      expect(vm.reviewStatus).toBe('Cancelled')
      expect(vm.actions.showAccept).toBe(false)
      expect(vm.actions.showCancel).toBe(false)
      expect(vm.cancellationDetails.resubmissionRequested).toBe('No')
    })

    test('getCertificateOfComplianceDetailViewModel returns success banner when flagged', async () => {
      const vm = await getCertificateOfComplianceDetailViewModel(
        'org-abc',
        'decl-1',
        {
          bannerFlags: {
            showApprovalBanner: true,
            showQueryBanner: false,
            showCancelBanner: false
          }
        }
      )
      expect(vm.successBanner).toEqual({
        heading: 'Certificate accepted',
        text: 'Certificate has been accepted.',
        type: 'accepted'
      })
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
          .mockResolvedValue({ organisations: [], notFoundExternalIds: [] }),
        getAccountDetailsById: vi
          .fn()
          .mockResolvedValue({ telephone: '01234 567890' })
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

      test('passes complianceYear as registrationYears to listComplianceOrganisations', async () => {
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
          mockOrganisationsApi.listComplianceOrganisations
        ).toHaveBeenCalledWith(
          expect.objectContaining({ registrationYears: 2026 }),
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
        expect(vm.items.map((i) => i.organisationId)).toEqual([
          'org-2',
          'org-3'
        ])
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
      beforeEach(() => {
        mockObligationsApi.getComplianceDeclarationOrNull = vi
          .fn()
          .mockResolvedValue(mockDetailData)
        mockObligationsApi.listOrganisationComplianceDeclarations = vi
          .fn()
          .mockResolvedValue({ complianceDeclarations: [] })
        mockObligationsApi.getComplianceObligation = vi
          .fn()
          .mockResolvedValue(mockObligationData)
        mockOrganisationsApi.getOrganisation = vi.fn().mockResolvedValue({
          id: 'org-abc',
          name: 'Live Producer Ltd',
          registrationType: 'DirectProducer',
          referenceNumber: '518293'
        })
      })
      test('calls getComplianceObligation with obligationYear when id is null', async () => {
        await getCertificateOfComplianceDetailViewModel('org-abc', null, {
          traceId: 'trace-z',
          obligationYear: 2026
        })

        expect(mockObligationsApi.getComplianceObligation).toHaveBeenCalledWith(
          {
            organisationId: 'org-abc',
            obligationYear: 2026
          },
          'trace-z'
        )
        expect(mockOrganisationsApi.getOrganisation).toHaveBeenCalledWith(
          { organisationId: 'org-abc' },
          'trace-z'
        )
      })

      test('calls getComplianceDeclarationOrNull with organisationId and id', async () => {
        await getCertificateOfComplianceDetailViewModel('org-abc', 'decl-1', {
          traceId: 'trace-z'
        })

        expect(
          mockObligationsApi.getComplianceDeclarationOrNull
        ).toHaveBeenCalledWith(
          { organisationId: 'org-abc', id: 'decl-1' },
          'trace-z'
        )
      })

      test('calls getAccountDetailsById with submitter user id from audit', async () => {
        await getCertificateOfComplianceDetailViewModel('org-abc', 'decl-1', {
          traceId: 'trace-z'
        })

        expect(mockAccountApi.getAccountDetailsById).toHaveBeenCalledWith(
          mockSubmittedAuditEntry.user.id,
          'trace-z'
        )
      })

      test('does not call getAccountDetailsById for not-submitted detail', async () => {
        await getCertificateOfComplianceDetailViewModel('org-abc', null, {
          traceId: 'trace-z',
          obligationYear: 2026
        })

        expect(mockAccountApi.getAccountDetailsById).not.toHaveBeenCalled()
      })

      test('maps submitter telephone from Account API to companyPhoneNumber', async () => {
        const vm = await getCertificateOfComplianceDetailViewModel(
          'org-abc',
          'decl-1'
        )

        expect(vm.companyPhoneNumber).toBe('01234 567890')
      })

      test('maps companyPhoneNumber to No data when Account API returns no telephone', async () => {
        mockAccountApi.getAccountDetailsById.mockResolvedValue({})

        const vm = await getCertificateOfComplianceDetailViewModel(
          'org-abc',
          'decl-1'
        )

        expect(vm.companyPhoneNumber).toBe('No data')
      })

      test('maps companyPhoneNumber to No data when submitter user is not found in Account API', async () => {
        mockAccountApi.getAccountDetailsById.mockRejectedValue(
          new ApiError({
            status: 404,
            message: 'account API request failed with status 404',
            serviceName: 'account'
          })
        )

        const vm = await getCertificateOfComplianceDetailViewModel(
          'org-abc',
          'decl-1'
        )

        expect(vm.companyPhoneNumber).toBe('No data')
      })

      test('maps obligationYear to complianceYear string', async () => {
        const vm = await getCertificateOfComplianceDetailViewModel(
          'org-abc',
          'decl-1'
        )

        expect(vm.complianceYear).toBe(String(mockDetailData.obligationYear))
      })

      test('maps organisation.name to companyName', async () => {
        const vm = await getCertificateOfComplianceDetailViewModel(
          'org-abc',
          'decl-1'
        )

        expect(vm.companyName).toBe(mockDetailData.organisation.name)
      })

      test('falls back to complianceSchemeName when organisation.name is null', async () => {
        mockObligationsApi.getComplianceDeclarationOrNull.mockResolvedValue({
          ...mockDetailData,
          organisation: {
            ...mockDetailData.organisation,
            name: null,
            complianceSchemeName: 'Scheme Co'
          }
        })

        const vm = await getCertificateOfComplianceDetailViewModel(
          'org-abc',
          'decl-1'
        )

        expect(vm.companyName).toBe('Scheme Co')
      })

      test('falls back to "Unknown organisation" when all name fields are null', async () => {
        mockObligationsApi.getComplianceDeclarationOrNull.mockResolvedValue({
          ...mockDetailData,
          organisation: {
            ...mockDetailData.organisation,
            name: null,
            complianceSchemeName: null,
            schemeOperatorName: null
          }
        })

        const vm = await getCertificateOfComplianceDetailViewModel(
          'org-abc',
          'decl-1'
        )

        expect(vm.companyName).toBe('Unknown organisation')
      })

      test('maps obligationStatus=Met to recyclingObligationsMet=true', async () => {
        mockObligationsApi.getComplianceDeclarationOrNull.mockResolvedValue({
          ...mockDetailData,
          obligationStatus: 'Met'
        })

        const vm = await getCertificateOfComplianceDetailViewModel(
          'org-abc',
          'decl-1'
        )

        expect(vm.recyclingObligationsMet).toBe(true)
      })

      test('maps obligationStatus other than Met to recyclingObligationsMet=false', async () => {
        mockObligationsApi.getComplianceDeclarationOrNull.mockResolvedValue({
          ...mockDetailData,
          obligationStatus: 'NotMet'
        })

        const vm = await getCertificateOfComplianceDetailViewModel(
          'org-abc',
          'decl-1'
        )

        expect(vm.recyclingObligationsMet).toBe(false)
      })

      test('formats created date with time', async () => {
        mockObligationsApi.getComplianceDeclarationOrNull.mockResolvedValue({
          ...mockDetailData,
          created: '2027-01-31T14:54:00'
        })

        const vm = await getCertificateOfComplianceDetailViewModel(
          'org-abc',
          'decl-1'
        )

        expect(vm.dateDeclarationSubmitted).toBe('31 January 2027 at 14:54')
      })

      test('maps DirectProducer registrationType to display name', async () => {
        const vm = await getCertificateOfComplianceDetailViewModel(
          'org-abc',
          'decl-1'
        )

        expect(vm.organisationType).toBe('Direct producer')
      })

      test('maps ComplianceScheme registrationType to display name', async () => {
        mockObligationsApi.getComplianceDeclarationOrNull.mockResolvedValue({
          ...mockDetailData,
          organisation: {
            ...mockDetailData.organisation,
            registrationType: 'ComplianceScheme'
          }
        })

        const vm = await getCertificateOfComplianceDetailViewModel(
          'org-abc',
          'decl-1'
        )

        expect(vm.organisationType).toBe('Compliance scheme')
      })

      test('maps submitterName to declarationSignedBy', async () => {
        const vm = await getCertificateOfComplianceDetailViewModel(
          'org-abc',
          'decl-1'
        )

        expect(vm.declarationSignedBy).toBe(mockDetailData.submitterName)
      })

      test('splits obligations into materials and glassBreakdown', async () => {
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

      test('materialTotals.status is not-met when any material is not met', async () => {
        mockObligationsApi.getComplianceDeclarationOrNull.mockResolvedValue({
          ...mockDetailData,
          obligations: mockDetailData.obligations.map((o, i) =>
            i === 0 ? { ...o, status: 'NotMet' } : o
          )
        })

        const vm = await getCertificateOfComplianceDetailViewModel(
          'org-abc',
          'decl-1'
        )

        expect(vm.materialTotals.status).toBe('not-met')
      })

      test('materialTotals.status is no-data when every material has no data', async () => {
        mockObligationsApi.getComplianceDeclarationOrNull.mockResolvedValue({
          ...mockDetailData,
          obligations: mockDetailData.obligations.map((o) => ({
            ...o,
            status: 'NoDataYet'
          }))
        })

        const vm = await getCertificateOfComplianceDetailViewModel(
          'org-abc',
          'decl-1'
        )

        expect(vm.materialTotals.status).toBe('no-data')
      })

      test('materialTotals.status is met when all materials are met', async () => {
        mockObligationsApi.getComplianceDeclarationOrNull.mockResolvedValue({
          ...mockDetailData,
          obligations: mockDetailData.obligations.map((o) => ({
            ...o,
            status: 'Met'
          }))
        })

        const vm = await getCertificateOfComplianceDetailViewModel(
          'org-abc',
          'decl-1'
        )

        expect(vm.materialTotals.status).toBe('met')
      })

      test('maps obligation tonnages correctly', async () => {
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
          status: 'met'
        })
      })

      test('maps NotMet obligation status to not-met on the row', async () => {
        mockObligationsApi.getComplianceDeclarationOrNull.mockResolvedValue({
          ...mockDetailData,
          obligations: [
            {
              material: 'Plastic',
              tonnages: {
                material: 100,
                awaitingAcceptance: 10,
                accepted: 80,
                outstanding: 10,
                obligated: 100
              },
              status: 'NotMet'
            }
          ]
        })

        const vm = await getCertificateOfComplianceDetailViewModel(
          'org-abc',
          'decl-1'
        )

        expect(vm.materials[0].status).toBe('not-met')
      })

      test('maps NoDataYet obligation status to no-data on the row', async () => {
        mockObligationsApi.getComplianceDeclarationOrNull.mockResolvedValue({
          ...mockDetailData,
          obligations: [
            {
              material: 'Wood',
              tonnages: {
                material: 0,
                awaitingAcceptance: 0,
                accepted: 0,
                outstanding: 0,
                obligated: 0
              },
              status: 'NoDataYet'
            }
          ]
        })

        const vm = await getCertificateOfComplianceDetailViewModel(
          'org-abc',
          'decl-1'
        )

        expect(vm.materials[0].status).toBe('no-data')
      })

      test('passes through material name directly from API', async () => {
        const vm = await getCertificateOfComplianceDetailViewModel(
          'org-abc',
          'decl-1'
        )

        expect(vm.materials[0].name).toBe(
          mockDetailData.obligations[0].material
        )
      })

      test('null tonnage fields map to 0 on the row', async () => {
        mockObligationsApi.getComplianceDeclarationOrNull.mockResolvedValue({
          ...mockDetailData,
          obligations: [
            {
              material: 'Wood',
              tonnages: {
                material: null,
                awaitingAcceptance: null,
                accepted: null,
                outstanding: null,
                obligated: null
              },
              status: 'NoDataYet'
            }
          ]
        })

        const vm = await getCertificateOfComplianceDetailViewModel(
          'org-abc',
          'decl-1'
        )

        expect(vm.materials[0]).toMatchObject({
          obligationToMeet: 0,
          awaitingAcceptance: 0,
          accepted: 0,
          outstanding: 0
        })
      })

      test('null tonnage values contribute 0 to materialTotals', async () => {
        mockObligationsApi.getComplianceDeclarationOrNull.mockResolvedValue({
          ...mockDetailData,
          obligations: [
            {
              material: 'Aluminium',
              tonnages: {
                material: 100,
                awaitingAcceptance: 10,
                accepted: 80,
                outstanding: 10,
                obligated: 100
              },
              status: 'Met'
            },
            {
              material: 'Wood',
              tonnages: {
                material: null,
                awaitingAcceptance: null,
                accepted: null,
                outstanding: null,
                obligated: null
              },
              status: 'NoDataYet'
            }
          ]
        })

        const vm = await getCertificateOfComplianceDetailViewModel(
          'org-abc',
          'decl-1'
        )

        expect(vm.materialTotals).toMatchObject({
          obligationToMeet: 100,
          awaitingAcceptance: 10,
          accepted: 80,
          outstanding: 10
        })
      })

      test('maps Accepted status to Approved review status with cancel only', async () => {
        mockObligationsApi.getComplianceDeclarationOrNull.mockResolvedValue({
          ...mockDetailData,
          status: 'Accepted'
        })

        const vm = await getCertificateOfComplianceDetailViewModel(
          'org-abc',
          'decl-1'
        )

        expect(vm.reviewStatus).toBe('Approved')
        expect(vm.actions).toMatchObject({
          showAccept: false,
          showCancel: true
        })
      })

      test('maps Queried status with query details', async () => {
        mockObligationsApi.getComplianceDeclarationOrNull.mockResolvedValue(
          mockQueriedDetailData
        )

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
        mockObligationsApi.getComplianceDeclarationOrNull.mockResolvedValue(
          mockCancelledDetailData
        )

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

      test('sets declarationStatus from declaration data.status', async () => {
        mockObligationsApi.getComplianceDeclarationOrNull.mockResolvedValue({
          ...mockDetailData,
          status: 'Submitted'
        })

        const vm = await getCertificateOfComplianceDetailViewModel(
          'org-abc',
          'decl-1'
        )

        expect(vm.declarationStatus).toBe('Submitted')
      })

      describe('currentYearActions — mapper edge cases', () => {
        const runDetailVm = async (declaration, declarationsForYear) => {
          mockObligationsApi.getComplianceDeclarationOrNull.mockResolvedValue(
            declaration
          )
          mockObligationsApi.listOrganisationComplianceDeclarations.mockResolvedValue(
            { complianceDeclarations: declarationsForYear }
          )
          return getCertificateOfComplianceDetailViewModel(
            'org-abc',
            declaration.id
          )
        }

        test('filters out Submitted-status declarations', async () => {
          const vm = await runDetailVm(mockDetailData, [mockDetailData])
          expect(vm.currentYearActions).toEqual([])
        })

        test('falls back to null reason when a Cancelled audit entry has no reason', async () => {
          const cancelled = {
            ...mockDetailData,
            id: 'decl-cancelled-no-reason',
            status: 'Cancelled',
            updated: '2026-06-17T16:00:00Z',
            submitterName: 'Test Submitter A',
            audit: [
              {
                action: 'Cancelled',
                timestamp: '2026-06-17T16:00:00Z',
                user: { id: 'u1', email: 'test-regulator@example.test' }
              }
            ]
          }
          const vm = await runDetailVm(mockDetailData, [cancelled])

          expect(vm.currentYearActions[0].reason).toBeNull()
        })

        test('maps by from the audit user who performed the accept action', async () => {
          const accepted = {
            ...mockDetailData,
            id: 'decl-accepted-history',
            status: 'Accepted',
            updated: '2026-06-10T14:30:00Z',
            submitterName: 'Test Submitter A',
            audit: [
              {
                action: 'Accepted',
                timestamp: '2026-06-10T14:30:00Z',
                user: {
                  id: 'regulator-1',
                  email: 'regulator@example.test',
                  name: 'Jane Regulator'
                }
              }
            ]
          }
          const vm = await runDetailVm(mockDetailData, [accepted])

          expect(vm.currentYearActions[0].by).toBe('Jane Regulator')
          expect(vm.currentYearActions[0].action).toBe('Accepted')
          expect(vm.currentYearActions[0].reason).toBe('')
        })

        test('includes the current Accepted declaration when the year list still has it as Submitted', async () => {
          const acceptedCurrent = {
            ...mockDetailData,
            status: 'Accepted',
            updated: '2027-02-01T10:00:00Z',
            audit: [
              mockDetailData.audit[0],
              {
                action: 'Accepted',
                timestamp: '2027-02-01T10:00:00Z',
                user: {
                  id: 'regulator-1',
                  email: 'regulator@example.test',
                  name: 'Jane Regulator'
                }
              }
            ]
          }

          const vm = await runDetailVm(acceptedCurrent, [mockDetailData])

          expect(vm.currentYearActions).toHaveLength(1)
          expect(vm.currentYearActions[0].action).toBe('Accepted')
          expect(vm.currentYearActions[0].by).toBe('Jane Regulator')
        })
      })

      describe('fallback path — no declaration found', () => {
        beforeEach(() => {
          mockObligationsApi.getComplianceDeclarationOrNull.mockResolvedValue(
            null
          )
        })

        test('calls getComplianceObligation when getComplianceDeclarationOrNull returns null', async () => {
          await getCertificateOfComplianceDetailViewModel('org-abc', 'decl-1', {
            traceId: 'trace-z'
          })

          expect(
            mockObligationsApi.getComplianceObligation
          ).toHaveBeenCalledWith({ organisationId: 'org-abc' }, 'trace-z')
        })

        test('sets declarationStatus to Unsubmitted on fallback path', async () => {
          const vm = await getCertificateOfComplianceDetailViewModel(
            'org-abc',
            'decl-1'
          )

          expect(vm.declarationStatus).toBe('Unsubmitted')
        })

        test('sets recyclingObligationsMet to null on fallback path', async () => {
          const vm = await getCertificateOfComplianceDetailViewModel(
            'org-abc',
            'decl-1'
          )

          expect(vm.recyclingObligationsMet).toBeNull()
        })

        test('maps obligations from fallback data into materials', async () => {
          const vm = await getCertificateOfComplianceDetailViewModel(
            'org-abc',
            'decl-1'
          )

          const glassBreakdownMaterials = new Set([
            'GlassRemelt',
            'RemainingGlass'
          ])
          const expectedMaterials = mockObligationData.obligations.filter(
            (o) => !glassBreakdownMaterials.has(o.material)
          )
          expect(vm.materials).toHaveLength(expectedMaterials.length)
          expect(vm.materials[0].name).toBe(
            mockObligationData.obligations[0].material
          )
        })

        test('sets org display fields to No data on fallback path', async () => {
          const vm = await getCertificateOfComplianceDetailViewModel(
            'org-abc',
            'decl-1'
          )

          expect(vm.companyName).toBe('No data')
          expect(vm.complianceYear).toBeNull()
          expect(vm.dateDeclarationSubmitted).toBe('No data')
          expect(vm.organisationType).toBe('No data')
          expect(vm.declarationSignedBy).toBe('No data')
        })

        test('sets organisationRef to organisationId on fallback path', async () => {
          const vm = await getCertificateOfComplianceDetailViewModel(
            'org-abc',
            'decl-1'
          )

          expect(vm.organisationRef).toBe('org-abc')
        })

        test('currentYearActions is an empty array on fallback path', async () => {
          const vm = await getCertificateOfComplianceDetailViewModel(
            'org-abc',
            'decl-1'
          )

          expect(vm.currentYearActions).toEqual([])
        })
      })

      describe('not-submitted path — no declaration id', () => {
        test('calls getComplianceObligation, getOrganisation, and getOrganisationsByExternalIds in parallel', async () => {
          const mockObligationsApi = {
            getComplianceObligation: vi
              .fn()
              .mockResolvedValue(mockObligationData)
          }
          const mockOrganisationsApi = {
            getOrganisation: vi.fn().mockResolvedValue({
              id: 'org-abc',
              name: 'Live Producer Ltd',
              registrationType: 'DirectProducer',
              referenceNumber: '518293'
            })
          }
          createWasteObligationsApiService.mockReturnValue(mockObligationsApi)
          createWasteOrganisationsApiService.mockReturnValue(
            mockOrganisationsApi
          )

          await getCertificateOfComplianceDetailViewModel(
            'org-abc',
            undefined,
            {
              traceId: 'trace-z',
              obligationYear: 2026
            }
          )

          expect(
            mockObligationsApi.getComplianceObligation
          ).toHaveBeenCalledWith(
            { organisationId: 'org-abc', obligationYear: 2026 },
            'trace-z'
          )
          expect(mockOrganisationsApi.getOrganisation).toHaveBeenCalledWith(
            { organisationId: 'org-abc' },
            'trace-z'
          )
          expect(
            mockAccountApi.getOrganisationsByExternalIds
          ).toHaveBeenCalledWith(['org-abc'], 'trace-z')
        })

        test('populates companyName from Account API', async () => {
          createWasteObligationsApiService.mockReturnValue({
            getComplianceObligation: vi
              .fn()
              .mockResolvedValue(mockObligationData)
          })
          createWasteOrganisationsApiService.mockReturnValue({
            getOrganisation: vi.fn().mockResolvedValue({
              id: 'org-abc',
              name: 'Live Producer Ltd',
              registrationType: 'DirectProducer',
              referenceNumber: '518293'
            })
          })
          mockAccountApi.getOrganisationsByExternalIds.mockResolvedValue({
            organisations: [
              {
                externalId: 'org-abc',
                name: 'Account Producer Ltd',
                referenceNumber: '518293'
              }
            ],
            notFoundExternalIds: []
          })

          const vm = await getCertificateOfComplianceDetailViewModel(
            'org-abc',
            undefined,
            { obligationYear: 2026 }
          )

          expect(vm.companyName).toBe('Account Producer Ltd')
          expect(vm.organisationRef).toBe('518293')
          expect(vm.complianceTypeLabel).toBe('2026 certificate of compliance')
        })

        test('populates organisationRef from Account API referenceNumber', async () => {
          createWasteObligationsApiService.mockReturnValue({
            getComplianceObligation: vi
              .fn()
              .mockResolvedValue(mockObligationData)
          })
          createWasteOrganisationsApiService.mockReturnValue({
            getOrganisation: vi.fn().mockResolvedValue({
              id: 'org-abc',
              name: 'Live Producer Ltd',
              registrationType: 'DirectProducer'
            })
          })
          mockAccountApi.getOrganisationsByExternalIds.mockResolvedValue({
            organisations: [
              {
                externalId: 'org-abc',
                name: 'Account Producer Ltd',
                referenceNumber: '600124'
              }
            ],
            notFoundExternalIds: []
          })

          const vm = await getCertificateOfComplianceDetailViewModel(
            'org-abc',
            undefined,
            { obligationYear: 2026 }
          )

          expect(vm.organisationRef).toBe('600124')
        })

        test('falls back to waste-organisations referenceNumber when Account API has no match', async () => {
          createWasteObligationsApiService.mockReturnValue({
            getComplianceObligation: vi
              .fn()
              .mockResolvedValue(mockObligationData)
          })
          createWasteOrganisationsApiService.mockReturnValue({
            getOrganisation: vi.fn().mockResolvedValue({
              id: 'org-abc',
              name: 'Live Producer Ltd',
              registrationType: 'DirectProducer',
              referenceNumber: '518293'
            })
          })

          const vm = await getCertificateOfComplianceDetailViewModel(
            'org-abc',
            undefined,
            { obligationYear: 2026 }
          )

          expect(vm.organisationRef).toBe('518293')
        })

        test('falls back to organisationId when Account API and waste-organisations have no referenceNumber', async () => {
          createWasteObligationsApiService.mockReturnValue({
            getComplianceObligation: vi
              .fn()
              .mockResolvedValue(mockObligationData)
          })
          createWasteOrganisationsApiService.mockReturnValue({
            getOrganisation: vi.fn().mockResolvedValue({
              id: 'org-abc',
              name: 'Live Producer Ltd',
              registrationType: 'DirectProducer'
            })
          })

          const vm = await getCertificateOfComplianceDetailViewModel(
            'org-abc',
            undefined,
            { obligationYear: 2026 }
          )

          expect(vm.organisationRef).toBe('org-abc')
        })

        test('falls back to waste-organisations name when Account API returns no match', async () => {
          createWasteObligationsApiService.mockReturnValue({
            getComplianceObligation: vi
              .fn()
              .mockResolvedValue(mockObligationData)
          })
          createWasteOrganisationsApiService.mockReturnValue({
            getOrganisation: vi.fn().mockResolvedValue({
              id: 'org-abc',
              name: 'Live Producer Ltd',
              registrationType: 'DirectProducer',
              referenceNumber: '518293'
            })
          })

          const vm = await getCertificateOfComplianceDetailViewModel(
            'org-abc',
            undefined,
            { obligationYear: 2026 }
          )

          expect(vm.companyName).toBe('Live Producer Ltd')
        })

        test('falls back to Unknown organisation when Account API has no match and waste-organisations has no name', async () => {
          createWasteObligationsApiService.mockReturnValue({
            getComplianceObligation: vi
              .fn()
              .mockResolvedValue(mockObligationData)
          })
          createWasteOrganisationsApiService.mockReturnValue({
            getOrganisation: vi.fn().mockResolvedValue({
              id: 'org-abc',
              registrationType: 'DirectProducer',
              referenceNumber: '518293'
            })
          })

          const vm = await getCertificateOfComplianceDetailViewModel(
            'org-abc',
            undefined,
            { obligationYear: 2026 }
          )

          expect(vm.companyName).toBe('Unknown organisation')
        })

        test('maps compliance scheme organisation name from tradingName when Account API has no match', async () => {
          createWasteObligationsApiService.mockReturnValue({
            getComplianceObligation: vi
              .fn()
              .mockResolvedValue(mockObligationData)
          })
          createWasteOrganisationsApiService.mockReturnValue({
            getOrganisation: vi.fn().mockResolvedValue({
              id: 'org-cs',
              name: 'Legal Name',
              tradingName: 'Trading Scheme Co',
              registrationType: 'ComplianceScheme',
              referenceNumber: 'CS-3001'
            })
          })

          const vm = await getCertificateOfComplianceDetailViewModel(
            'org-cs',
            undefined,
            { obligationYear: 2026 }
          )

          expect(vm.companyName).toBe('Trading Scheme Co')
          expect(vm.complianceTypeLabel).toBe('2026 statement of compliance')
        })

        test('derives registration type and companies house from waste-organisations GET shape', async () => {
          createWasteObligationsApiService.mockReturnValue({
            getComplianceObligation: vi
              .fn()
              .mockResolvedValue(mockObligationData)
          })
          createWasteOrganisationsApiService.mockReturnValue({
            getOrganisation: vi.fn().mockResolvedValue({
              id: 'org-abc',
              name: 'POP QUEST LTD',
              companiesHouseNumber: '17121895',
              registrations: [
                {
                  type: 'LARGE_PRODUCER',
                  status: 'REGISTERED',
                  registrationYear: 2026,
                  updated: '2026-03-31T23:20:34.294+00:00'
                }
              ]
            })
          })

          const vm = await getCertificateOfComplianceDetailViewModel(
            'org-abc',
            undefined,
            { obligationYear: 2026 }
          )

          expect(vm.companyName).toBe('POP QUEST LTD')
          expect(vm.companiesHouseNumber).toBe('17121895')
          expect(vm.organisationType).toBe('Direct producer')
          expect(vm.complianceTypeLabel).toBe('2026 certificate of compliance')
          expect(vm.nameOnAccount).toBe('No data')
          expect(vm.declarationEmailAddress).toBe('No data')
        })
      })

      test('maps complianceTypeLabel for direct producer declarations', async () => {
        const vm = await getCertificateOfComplianceDetailViewModel(
          'org-abc',
          'decl-1'
        )

        expect(vm.complianceTypeLabel).toBe('2026 certificate of compliance')
      })

      test('maps complianceTypeLabel for compliance scheme declarations', async () => {
        mockObligationsApi.getComplianceDeclarationOrNull.mockResolvedValue(
          mockComplianceSchemeDetailData
        )

        const vm = await getCertificateOfComplianceDetailViewModel(
          'org-abc',
          'decl-cs-001'
        )

        expect(vm.complianceTypeLabel).toBe('2026 statement of compliance')
      })

      test('maps regulation43Met from isRegulation43Compliant', async () => {
        mockObligationsApi.getComplianceDeclarationOrNull.mockResolvedValue({
          ...mockComplianceSchemeDetailData,
          isRegulation43Compliant: false
        })

        const vm = await getCertificateOfComplianceDetailViewModel(
          'org-abc',
          'decl-cs-001'
        )

        expect(vm.regulation43Met).toBe(false)
      })

      test('maps the not complied Regulation 43 statement for a not compliant compliance scheme', async () => {
        mockObligationsApi.getComplianceDeclarationOrNull.mockResolvedValue({
          ...mockComplianceSchemeDetailData,
          isRegulation43Compliant: false
        })

        const vm = await getCertificateOfComplianceDetailViewModel(
          'org-abc',
          'decl-cs-001'
        )

        expect(vm.regulation43Statement).toBe(
          'EcoPack Compliance Ltd declared they have not complied with all other requirements in regulation 43.'
        )
      })

      test('maps regulation43Statement to null when isRegulation43Compliant is null', async () => {
        mockObligationsApi.getComplianceDeclarationOrNull.mockResolvedValue({
          ...mockComplianceSchemeDetailData,
          isRegulation43Compliant: null
        })

        const vm = await getCertificateOfComplianceDetailViewModel(
          'org-abc',
          'decl-cs-001'
        )

        expect(vm.regulation43Statement).toBeNull()
      })

      test('maps recyclingObligationsMet to null when obligationStatus is null', async () => {
        mockObligationsApi.getComplianceDeclarationOrNull.mockResolvedValue({
          ...mockDetailData,
          obligationStatus: null
        })

        const vm = await getCertificateOfComplianceDetailViewModel(
          'org-abc',
          'decl-1'
        )

        expect(vm.recyclingObligationsMet).toBeNull()
      })

      test('maps null string fields to No data', async () => {
        mockObligationsApi.getComplianceDeclarationOrNull.mockResolvedValue({
          ...mockDetailData,
          submitterName: null,
          audit: [],
          organisation: {
            ...mockDetailData.organisation,
            companiesHouseNumber: null
          }
        })

        const vm = await getCertificateOfComplianceDetailViewModel(
          'org-abc',
          'decl-1'
        )

        expect(vm.companiesHouseNumber).toBe('No data')
        expect(vm.nameOnAccount).toBe('No data')
        expect(vm.declarationEmailAddress).toBe('No data')
        expect(vm.companyPhoneNumber).toBe('No data')
        expect(vm.declarationSignedBy).toBe('No data')
      })

      test('maps dateDeclarationSubmitted to No data when created is null', async () => {
        mockObligationsApi.getComplianceDeclarationOrNull.mockResolvedValue({
          ...mockDetailData,
          created: null
        })

        const vm = await getCertificateOfComplianceDetailViewModel(
          'org-abc',
          'decl-1'
        )

        expect(vm.dateDeclarationSubmitted).toBe('No data')
      })

      test('maps queryDetails to null when declaration is Queried but has no queryDetails', async () => {
        mockObligationsApi.getComplianceDeclarationOrNull.mockResolvedValue({
          ...mockDetailData,
          status: 'Queried',
          queryDetails: null
        })

        const vm = await getCertificateOfComplianceDetailViewModel(
          'org-abc',
          'decl-1'
        )

        expect(vm.queryDetails).toBeNull()
      })

      test('uses resubmissionRequestedDisplay when resubmissionRequested is neither true nor false', async () => {
        mockObligationsApi.getComplianceDeclarationOrNull.mockResolvedValue({
          ...mockDetailData,
          status: 'Cancelled',
          cancellationDetails: {
            reason: 'Test reason',
            resubmissionRequested: undefined,
            resubmissionRequestedDisplay: 'Pending decision',
            dateCancelled: '2026-03-10T00:00:00Z'
          }
        })

        const vm = await getCertificateOfComplianceDetailViewModel(
          'org-abc',
          'decl-1'
        )

        expect(vm.cancellationDetails.resubmissionRequested).toBe(
          'Pending decision'
        )
      })

      test('maps history entry date to null when updated is absent', async () => {
        mockObligationsApi.getComplianceDeclarationOrNull.mockResolvedValue(
          mockDetailData
        )
        mockObligationsApi.listOrganisationComplianceDeclarations.mockResolvedValue(
          {
            complianceDeclarations: [
              {
                ...mockDetailData,
                status: 'Accepted',
                updated: null,
                audit: []
              }
            ]
          }
        )

        const vm = await getCertificateOfComplianceDetailViewModel(
          'org-abc',
          'decl-1'
        )

        expect(vm.currentYearActions[0].date).toBeNull()
      })

      test('rethrows non-404 ApiErrors from getAccountDetailsById', async () => {
        const serverError = new ApiError({
          status: 500,
          message: 'account API request failed with status 500',
          serviceName: 'account'
        })
        mockAccountApi.getAccountDetailsById.mockRejectedValue(serverError)

        await expect(
          getCertificateOfComplianceDetailViewModel('org-abc', 'decl-1')
        ).rejects.toBe(serverError)
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

      test('defaults reference number to "No data" and keeps the organisation name', async () => {
        setupNotSubmittedTab([
          {
            id: 'org-guid-1',
            name: 'Redwood Retail Group',
            registrationType: 'DirectProducer'
          }
        ])
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
          organisationName: 'Redwood Retail Group'
        })
      })

      test('resolves the reference number from the Account API; name comes from the organisation record', async () => {
        setupNotSubmittedTab([
          {
            id: 'org-guid-1',
            name: 'Redwood Retail Group',
            registrationType: 'DirectProducer'
          },
          {
            id: 'org-guid-2',
            name: 'Maple Manufacturing',
            registrationType: 'DirectProducer'
          }
        ])
        mockAccountApi.getOrganisationsByExternalIds.mockResolvedValue({
          organisations: [
            {
              externalId: 'org-guid-1',
              name: 'Ignored Account Name',
              referenceNumber: '518293'
            },
            {
              externalId: 'org-guid-2',
              name: 'Ignored Account Name',
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

      test('shows "No data" reference number for unresolved ids while other rows render', async () => {
        setupNotSubmittedTab([
          {
            id: 'org-guid-1',
            name: 'Redwood Retail Group',
            registrationType: 'DirectProducer'
          },
          {
            id: 'org-guid-2',
            name: 'Maple Manufacturing',
            registrationType: 'DirectProducer'
          }
        ])
        mockAccountApi.getOrganisationsByExternalIds.mockResolvedValue({
          organisations: [
            {
              externalId: 'org-guid-1',
              name: 'Ignored Account Name',
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
          organisationName: 'Maple Manufacturing'
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

      test('sets id to null and organisationId to org id for not-submitted items', async () => {
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

        expect(vm.items[0].id).toBeNull()
        expect(vm.items[0].organisationId).toBe('org-1')
      })

      describe('compliance-schemes — organisation name from Account API', () => {
        test('calls the Account API with the compliance-scheme org ids and traceId', async () => {
          setupNotSubmittedTab([
            {
              id: 'cs-guid-1',
              name: 'Org record name',
              registrationType: 'ComplianceScheme'
            },
            {
              id: 'cs-guid-2',
              name: 'Org record name',
              registrationType: 'ComplianceScheme'
            }
          ])
          mockAccountApi.getOrganisationsByExternalIds.mockResolvedValue({
            organisations: [],
            notFoundExternalIds: []
          })

          await getCertificatesOfComplianceViewModel(
            'compliance-schemes',
            'not-submitted',
            1,
            'trace-cs'
          )

          expect(
            mockAccountApi.getOrganisationsByExternalIds
          ).toHaveBeenCalledWith(['cs-guid-1', 'cs-guid-2'], 'trace-cs')
        })

        test('displays the Account API name for each compliance-scheme row', async () => {
          setupNotSubmittedTab([
            {
              id: 'cs-guid-1',
              name: 'Org record name 1',
              registrationType: 'ComplianceScheme'
            },
            {
              id: 'cs-guid-2',
              name: 'Org record name 2',
              registrationType: 'ComplianceScheme'
            }
          ])
          mockAccountApi.getOrganisationsByExternalIds.mockResolvedValue({
            organisations: [
              {
                externalId: 'cs-guid-1',
                name: 'EcoPack Compliance Ltd',
                referenceNumber: '518293'
              },
              {
                externalId: 'cs-guid-2',
                name: 'GreenCircle Schemes',
                referenceNumber: '600124'
              }
            ],
            notFoundExternalIds: []
          })

          const vm = await getCertificatesOfComplianceViewModel(
            'compliance-schemes',
            'not-submitted',
            1
          )

          expect(vm.items).toEqual([
            expect.objectContaining({
              organisationId: 'cs-guid-1',
              organisationReferenceNumber: '518293',
              organisationName: 'EcoPack Compliance Ltd'
            }),
            expect.objectContaining({
              organisationId: 'cs-guid-2',
              organisationReferenceNumber: '600124',
              organisationName: 'GreenCircle Schemes'
            })
          ])
        })

        test('shows "No data" name for a 404 id while other rows render', async () => {
          setupNotSubmittedTab([
            {
              id: 'cs-guid-1',
              name: 'Org record name 1',
              registrationType: 'ComplianceScheme'
            },
            {
              id: 'cs-guid-2',
              name: 'Org record name 2',
              registrationType: 'ComplianceScheme'
            }
          ])
          mockAccountApi.getOrganisationsByExternalIds.mockResolvedValue({
            organisations: [
              {
                externalId: 'cs-guid-1',
                name: 'EcoPack Compliance Ltd',
                referenceNumber: '518293'
              }
            ],
            notFoundExternalIds: ['cs-guid-2']
          })

          const vm = await getCertificatesOfComplianceViewModel(
            'compliance-schemes',
            'not-submitted',
            1
          )

          expect(vm.items[0]).toMatchObject({
            organisationId: 'cs-guid-1',
            organisationName: 'EcoPack Compliance Ltd'
          })
          expect(vm.items[1]).toMatchObject({
            organisationId: 'cs-guid-2',
            organisationReferenceNumber: 'No data',
            organisationName: 'No data'
          })
        })

        test('propagates a 5xx so the error page is shown', async () => {
          setupNotSubmittedTab([
            {
              id: 'cs-guid-1',
              name: 'Org record name',
              registrationType: 'ComplianceScheme'
            }
          ])

          const apiError = Object.assign(new Error('account API failed'), {
            name: 'ApiError',
            status: 500
          })
          mockAccountApi.getOrganisationsByExternalIds.mockRejectedValue(
            apiError
          )

          await expect(
            getCertificatesOfComplianceViewModel(
              'compliance-schemes',
              'not-submitted',
              1
            )
          ).rejects.toMatchObject({ name: 'ApiError', status: 500 })
        })
      })
    })
  })
})

describe('organisation and audit detail mapping', () => {
  test('deriveRegistrationType maps LARGE_PRODUCER to DirectProducer for obligation year', () => {
    expect(
      deriveRegistrationType(
        [
          {
            type: 'LARGE_PRODUCER',
            status: 'REGISTERED',
            registrationYear: 2026
          }
        ],
        2026
      )
    ).toBe('DirectProducer')
  })

  test('deriveRegistrationType maps COMPLIANCE_SCHEME to ComplianceScheme', () => {
    expect(
      deriveRegistrationType(
        [
          {
            type: 'COMPLIANCE_SCHEME',
            status: 'REGISTERED',
            registrationYear: 2026
          }
        ],
        2026
      )
    ).toBe('ComplianceScheme')
  })

  test('deriveRegistrationType returns null for empty registrations', () => {
    expect(deriveRegistrationType([], 2026)).toBeNull()
    expect(deriveRegistrationType(undefined, 2026)).toBeNull()
  })

  test('deriveRegistrationType falls back to latest year when no registrations match the obligation year', () => {
    // registrations are for 2024, obligation year is 2026 → forYear pool is
    // empty, selectFromPool([]) returns null, then falls through to latest year
    expect(
      deriveRegistrationType(
        [
          {
            type: 'LARGE_PRODUCER',
            status: 'REGISTERED',
            registrationYear: 2024
          }
        ],
        2026
      )
    ).toBe('DirectProducer')
  })

  test('deriveRegistrationType selects most recently updated when candidates lack an updated field', () => {
    // One candidate has no updated field — its bestTime falls back to 0
    expect(
      deriveRegistrationType(
        [
          {
            type: 'SMALL_PRODUCER',
            status: 'REGISTERED',
            registrationYear: 2026
          },
          {
            type: 'LARGE_PRODUCER',
            status: 'REGISTERED',
            registrationYear: 2026,
            updated: '2026-01-01T00:00:00Z'
          }
        ],
        2026
      )
    ).toBe('DirectProducer')
  })

  test('mapWasteOrganisationToDetailFields returns No data organisationType when no registration type can be determined', () => {
    expect(
      mapWasteOrganisationToDetailFields({
        name: 'Unknown Org',
        companiesHouseNumber: '12345678',
        registrations: []
      })
    ).toMatchObject({
      registrationType: null,
      organisationType: 'No data'
    })
  })

  test('mapWasteOrganisationToDetailFields returns null fields when organisation is null', () => {
    expect(mapWasteOrganisationToDetailFields(null)).toEqual({
      companyName: null,
      registrationType: null,
      organisationType: 'No data',
      companiesHouseNumber: 'No data'
    })
  })

  test('findSubmittedAuditUser returns user from Submitted audit entry', () => {
    expect(findSubmittedAuditUser([mockSubmittedAuditEntry])).toEqual(
      mockSubmittedAuditEntry.user
    )
  })

  test('findSubmittedAuditUser returns null when no Submitted entry exists', () => {
    expect(findSubmittedAuditUser([])).toBeNull()
    expect(
      findSubmittedAuditUser([{ action: 'Accepted', user: { name: 'Other' } }])
    ).toBeNull()
  })

  test('mapWasteOrganisationToDetailFields maps companies house and derived type', () => {
    expect(
      mapWasteOrganisationToDetailFields(
        {
          name: 'POP QUEST LTD',
          companiesHouseNumber: '17121895',
          registrations: [
            {
              type: 'LARGE_PRODUCER',
              status: 'REGISTERED',
              registrationYear: 2026
            }
          ]
        },
        { obligationYear: 2026 }
      )
    ).toEqual({
      companyName: 'POP QUEST LTD',
      registrationType: 'DirectProducer',
      organisationType: 'Direct producer',
      companiesHouseNumber: '17121895'
    })
  })

  test('mapWasteOrganisationToDetailFields uses tradingName for compliance schemes', () => {
    expect(
      mapWasteOrganisationToDetailFields(
        {
          name: 'Legal Name',
          tradingName: 'Trading Scheme Co',
          companiesHouseNumber: '87654321',
          registrations: [
            {
              type: 'COMPLIANCE_SCHEME',
              status: 'REGISTERED',
              registrationYear: 2026
            }
          ]
        },
        { obligationYear: 2026 }
      )
    ).toEqual({
      companyName: 'Trading Scheme Co',
      registrationType: 'ComplianceScheme',
      organisationType: 'Compliance scheme',
      companiesHouseNumber: '87654321'
    })
  })
})

describe('certificate detail action helpers', () => {
  test('buildComplianceTypeLabel builds certificate and statement labels', () => {
    expect(buildComplianceTypeLabel(2026, 'DirectProducer')).toBe(
      '2026 certificate of compliance'
    )
    expect(buildComplianceTypeLabel(2026, 'ComplianceScheme')).toBe(
      '2026 statement of compliance'
    )
    expect(buildComplianceTypeLabel(null, 'DirectProducer')).toBe('No data')
  })

  test('buildRegulation43Statement builds compliant and not compliant text', () => {
    expect(buildRegulation43Statement(true, 'EcoPack Compliance Ltd')).toBe(
      'EcoPack Compliance Ltd declared they have complied with all other requirements in regulation 43.'
    )
    expect(buildRegulation43Statement(false, 'EcoPack Compliance Ltd')).toBe(
      'EcoPack Compliance Ltd declared they have not complied with all other requirements in regulation 43.'
    )
  })

  test('buildRegulation43Statement returns null when status is null', () => {
    expect(
      buildRegulation43Statement(null, 'EcoPack Compliance Ltd')
    ).toBeNull()
  })

  test('displayOrNoData returns No data for null and empty values', () => {
    expect(displayOrNoData(null)).toBe('No data')
    expect(displayOrNoData('')).toBe('No data')
    expect(displayOrNoData('Acme Ltd')).toBe('Acme Ltd')
  })

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
        accept: '/org-1/certificates-of-compliance/decl-1/accept',
        cancel: '/org-1/certificates-of-compliance/decl-1/cancel/reason'
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
      showCancel: true
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
      text: 'Certificate has been accepted.',
      type: 'accepted'
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
      text: 'Certificate has been cancelled and an email sent to the producer.',
      type: 'cancelled'
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
      text: 'Statement has been accepted.',
      type: 'accepted'
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
      text: 'Statement has been cancelled and an email sent to the compliance scheme.',
      type: 'cancelled'
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

  test('canApproveComplianceDeclaration and canCancelComplianceDeclaration match review status', () => {
    expect(canApproveComplianceDeclaration('Pending')).toBe(true)
    expect(canApproveComplianceDeclaration('Queried')).toBe(true)
    expect(canApproveComplianceDeclaration('Approved')).toBe(false)
    expect(canCancelComplianceDeclaration('Pending')).toBe(true)
    expect(canCancelComplianceDeclaration('Approved')).toBe(true)
    expect(canCancelComplianceDeclaration('Cancelled')).toBe(false)
  })

  test('setMockDeclarationStatusOverride stores status in session when useMockApi is true', () => {
    config.get.mockReturnValue(true)
    const session = {
      data: {},
      get(key) {
        return this.data[key]
      },
      set(key, value) {
        this.data[key] = value
      }
    }

    setMockDeclarationStatusOverride(session, 'org-1/decl-1', 'Approved')

    expect(session.data['certificate-mock-status:org-1/decl-1']).toBe(
      'Accepted'
    )
    expect(session.data['certificate-mock-audit:org-1/decl-1']).toHaveLength(1)
    expect(session.data['certificate-mock-audit:org-1/decl-1'][0].action).toBe(
      'Accepted'
    )
  })

  test('getCertificateOfComplianceDetailViewModel shows Accepted and Cancelled rows after mock accept then cancel', async () => {
    config.get.mockReturnValue(true)
    createAccountApiService.mockReturnValue({
      getAccountDetailsById: vi.fn().mockResolvedValue({ telephone: null })
    })

    const session = {
      data: {},
      get(key) {
        return this.data[key]
      },
      set(key, value) {
        this.data[key] = value
      }
    }

    session.set('user', {
      id: 'user-oid-1',
      email: 'regulator@example.com',
      name: 'Jane Regulator'
    })

    const declarationKey = `${mockDirectProducerPendingNotMetDetailData.organisation.id}/${mockDirectProducerPendingNotMetDetailData.id}`
    setMockDeclarationStatusOverride(session, declarationKey, 'Approved')
    setMockDeclarationStatusOverride(session, declarationKey, 'Cancelled')

    const vm = await getCertificateOfComplianceDetailViewModel(
      mockDirectProducerPendingNotMetDetailData.organisation.id,
      mockDirectProducerPendingNotMetDetailData.id,
      { session }
    )

    expect(vm.reviewStatus).toBe('Cancelled')
    expect(vm.currentYearActions.map((row) => row.action)).toEqual([
      'Cancelled',
      'Accepted'
    ])
    expect(vm.currentYearActions[0].by).toBe('Jane Regulator')
    expect(vm.currentYearActions[1].by).toBe('Jane Regulator')
  })

  test('getCertificateOfComplianceDetailViewModel applies mock status override from session', async () => {
    config.get.mockReturnValue(true)
    const session = {
      data: { 'certificate-mock-status:org-abc/decl-1': 'Accepted' },
      get(key) {
        return this.data[key]
      }
    }

    const vm = await getCertificateOfComplianceDetailViewModel(
      'org-abc',
      'decl-1',
      {
        traceId: 'trace-1',
        session
      }
    )

    expect(vm.reviewStatus).toBe('Approved')
    expect(vm.actions.showAccept).toBe(false)
    expect(vm.actions.showCancel).toBe(true)
  })

  test('mapSessionUserToApiUser maps session user to API user', () => {
    expect(
      mapSessionUserToApiUser({
        id: 'user-oid-123',
        email: 'regulator@example.com',
        name: 'Bob Smith'
      })
    ).toEqual({
      id: 'user-oid-123',
      email: 'regulator@example.com',
      name: 'Bob Smith'
    })
  })

  test('mapSessionUserToApiUser defaults name to "Unknown" when absent', () => {
    expect(
      mapSessionUserToApiUser({
        id: 'user-oid-123',
        email: 'regulator@example.com'
      })
    ).toEqual({
      id: 'user-oid-123',
      email: 'regulator@example.com',
      name: 'Unknown'
    })
  })

  test('mapSessionUserToApiUser falls back to mock user when id or email is missing', () => {
    expect(mapSessionUserToApiUser({})).toEqual({
      id: 'mock-user',
      email: 'mock-user@test.local',
      name: 'Mock User'
    })
  })

  test('setMockDeclarationStatusOverride does nothing when useMockApi is false', () => {
    config.get.mockReturnValue(false)
    const session = { set: vi.fn() }

    setMockDeclarationStatusOverride(session, 'org-1/decl-1', 'Approved')

    expect(session.set).not.toHaveBeenCalled()
  })

  test('readAndClearCertificateActionBannerFlags clears the query banner when shown', () => {
    const session = {
      data: {
        [certificateActionSessionKeys.justQueried]: 'org-1/decl-q'
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
      'org-1/decl-q'
    )

    expect(flags).toEqual({
      showApprovalBanner: false,
      showQueryBanner: true,
      showCancelBanner: false
    })
    expect(
      session.data[certificateActionSessionKeys.justQueried]
    ).toBeUndefined()
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
        { id: 'user-oid-1', email: 'user@example.com', name: 'John Doe' },
        'trace-1'
      )

      expect(mockApi.updateComplianceDeclaration).toHaveBeenCalledWith(
        {
          organisationId: 'org-1',
          id: 'decl-1',
          status: 'Accepted',
          user: {
            id: 'user-oid-1',
            email: 'user@example.com',
            name: 'John Doe'
          }
        },
        'trace-1'
      )
    })
  })

  describe('cancelComplianceDeclaration', () => {
    test('skips API call when useMockApi is true', async () => {
      config.get.mockReturnValue(true)

      await cancelComplianceDeclaration(
        'org-1',
        'decl-1',
        { user: 'mock-user' },
        'Producer requested to cancel',
        'trace-1'
      )

      expect(createWasteObligationsApiService).not.toHaveBeenCalled()
    })

    test('sends status Cancelled with the reason when useMockApi is false', async () => {
      config.get.mockReturnValue(false)
      const mockApi = { updateComplianceDeclaration: vi.fn() }
      createWasteObligationsApiService.mockReturnValue(mockApi)

      await cancelComplianceDeclaration(
        'org-1',
        'decl-1',
        { id: 'user-oid-1', email: 'user@example.com', name: 'John Doe' },
        'Producer requested to cancel',
        'trace-1'
      )

      expect(mockApi.updateComplianceDeclaration).toHaveBeenCalledWith(
        {
          organisationId: 'org-1',
          id: 'decl-1',
          status: 'Cancelled',
          reason: 'Producer requested to cancel',
          user: {
            id: 'user-oid-1',
            email: 'user@example.com',
            name: 'John Doe'
          }
        },
        'trace-1'
      )
    })
  })
})
