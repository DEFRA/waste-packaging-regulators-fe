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
import { getCertificatesOfComplianceViewModel } from './list.service.js'
import { getCertificateOfComplianceDetailViewModel } from '../detail/detail.service.js'
import { setMockDeclarationStatusOverride } from '../actions/session.service.js'
import {
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
  mockComplianceSchemeCancelledDetailData,
  mockSummaryByOrganisationType,
  mockQueriedDetailData,
  mockCancelledDetailData,
  mockSubmittedAuditEntry,
  mockDirectProducerPendingNotMetDetailData
} from '../certificates-of-compliance.mock.js'

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
  obligationCoveragePercentage: 105,
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
      expect(vm.items[0].organisationName).toBe('EcoPack Group')
      expect(vm.items[0].regulation43Met).toBe(false)
      expect(vm.items[0].obligationCoveragePercentage).toBe(100)
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
      expect(vm.showSubmittedOn).toBe(true)
      expect(vm.showNameOnAccount).toBe(true)
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
        mockComplianceSchemeDetailData.organisation.schemeOperatorName
      )
      expect(vm.organisationType).toBe('Compliance scheme')
      expect(vm.actions.labels).toEqual({
        accept: 'Accept statement',
        cancel: 'Cancel statement'
      })
      expect(vm.complianceTypeLabel).toBe('2026 statement of compliance')
      expect(vm.showDeclaration).toBe(true)
      expect(vm.complianceDocumentNoun).toBe('statement of compliance')
      expect(vm.companiesHouseNumber).toBe('CS_GENERATED_0923795')
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
      expect(vm.declarationEmailAddress).toBe('olivia.hart@redwood.test')
      expect(vm.companyPhoneNumber).toBe('020 7946 0101')
      expect(vm.declarationStatus).toBe('Unsubmitted')
      expect(vm.showDeclaration).toBe(false)
      expect(vm.showSubmittedOn).toBe(false)
      expect(vm.showNameOnAccount).toBe(false)
      expect(vm.recyclingObligationsMet).toBe(false)
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
      test.each([
        // Redwood Retail — uses default mockObligationData
        {
          obligations: 'obligations',
          item: mockNotSubmittedItems[0],
          expected: true
        },
        // Pinnacle Containers Ltd — obligations: []
        {
          obligations: 'an empty obligations array',
          item: mockNotSubmittedItems[3],
          expected: false
        },
        // Sterling Packaging Ltd — obligations: null
        {
          obligations: 'null obligations',
          item: mockNotSubmittedItems[2],
          expected: false
        }
      ])(
        'is $expected when the org has $obligations',
        async ({ item, expected }) => {
          const vm = await getCertificateOfComplianceDetailViewModel(
            item.organisationId,
            undefined,
            { obligationYear: 2026 }
          )

          expect(vm.showObligations).toBe(expected)
        }
      )
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
      expect(vm.acceptedBy).toBe('James Walker')
      expect(vm.acceptedDate).toBe('15 January 2027 at 14:30')
    })

    test('getCertificateOfComplianceDetailViewModel returns accepted compliance scheme detail', async () => {
      const vm = await getCertificateOfComplianceDetailViewModel(
        mockComplianceSchemeAcceptedDetailData.organisation.id,
        mockComplianceSchemeAcceptedDetailData.id
      )
      expect(vm.companyName).toBe('Nationwide Packaging Group')
      expect(vm.reviewStatus).toBe('Approved')
      expect(vm.actions.showAccept).toBe(false)
      expect(vm.actions.showCancel).toBe(true)
      expect(vm.actions.labels.accept).toBe('Accept statement')
      expect(vm.showAcceptedOutcome).toBe(true)
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
      expect(vm.showCancelledOutcome).toBe(true)
      expect(vm.cancelledBy).toBe('James Walker')
      expect(vm.cancellationReason).toBe('Submitted after the deadline.')
    })

    test('getCertificateOfComplianceDetailViewModel returns cancelled compliance scheme detail', async () => {
      const vm = await getCertificateOfComplianceDetailViewModel(
        mockComplianceSchemeCancelledDetailData.organisation.id,
        mockComplianceSchemeCancelledDetailData.id
      )
      expect(vm.companyName).toBe('GreenCircle Group')
      expect(vm.reviewStatus).toBe('Cancelled')
      expect(vm.actions.showAccept).toBe(false)
      expect(vm.actions.showCancel).toBe(false)
      expect(vm.showCancelledOutcome).toBe(true)
      expect(vm.cancellationReason).toBe('Incomplete member data submitted.')
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
        getOrganisationsByCompaniesHouseNumbers: vi.fn().mockResolvedValue([]),
        getOrganisationWithPersonsOrNull: vi.fn().mockResolvedValue(null),
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
          obligationCoveragePercentage: 105,
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

      test('falls back to schemeOperatorName when name is null for compliance schemes', async () => {
        setupPendingTab([
          makeDeclaration({
            organisation: {
              name: null,
              registrationType: 'ComplianceScheme',
              complianceSchemeName: 'Scheme Name',
              schemeOperatorName: 'Operator Name'
            }
          })
        ])
        const vm = await getCertificatesOfComplianceViewModel(
          'compliance-schemes',
          'pending',
          1
        )
        expect(vm.items[0].organisationName).toBe('Operator Name')
      })

      test('falls back to "Unknown organisation" when all name fields are null for compliance schemes', async () => {
        setupPendingTab([
          makeDeclaration({
            organisation: {
              name: null,
              registrationType: 'ComplianceScheme',
              complianceSchemeName: 'Scheme Name',
              schemeOperatorName: null
            }
          })
        ])
        const vm = await getCertificatesOfComplianceViewModel(
          'compliance-schemes',
          'pending',
          1
        )
        expect(vm.items[0].organisationName).toBe('Unknown organisation')
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

      test('sets obligationCoveragePercentage to null when not provided by the API', async () => {
        setupPendingTab([
          makeDeclaration({ obligationCoveragePercentage: undefined })
        ])
        const vm = await getCertificatesOfComplianceViewModel(
          'direct-producers',
          'pending',
          1
        )
        expect(vm.items[0].obligationCoveragePercentage).toBeNull()
      })

      test('maps obligationCoveragePercentage from the API to list items', async () => {
        setupPendingTab([makeDeclaration({ obligationCoveragePercentage: 84 })])

        const vm = await getCertificatesOfComplianceViewModel(
          'direct-producers',
          'pending',
          1
        )

        expect(vm.items[0].obligationCoveragePercentage).toBe(84)
      })

      test('maps obligationCoveragePercentage for compliance-schemes pending items', async () => {
        setupPendingTab([makeDeclaration({ obligationCoveragePercentage: 88 })])

        const vm = await getCertificatesOfComplianceViewModel(
          'compliance-schemes',
          'pending',
          1
        )

        expect(vm.items[0].obligationCoveragePercentage).toBe(88)
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

      test('calls getOrganisation when loading submitted declaration detail', async () => {
        await getCertificateOfComplianceDetailViewModel('org-abc', 'decl-1', {
          traceId: 'trace-z'
        })

        expect(mockOrganisationsApi.getOrganisation).toHaveBeenCalledWith(
          { organisationId: 'org-abc' },
          'trace-z'
        )
      })

      test('maps companiesHouseNumber from waste-organisations API for submitted declarations', async () => {
        mockOrganisationsApi.getOrganisation.mockResolvedValue({
          id: 'org-abc',
          name: 'Live Producer Ltd',
          companiesHouseNumber: '17121895',
          registrations: [
            {
              type: 'LARGE_PRODUCER',
              status: 'REGISTERED',
              registrationYear: 2026
            }
          ]
        })

        const vm = await getCertificateOfComplianceDetailViewModel(
          'org-abc',
          'decl-1'
        )

        expect(vm.companiesHouseNumber).toBe('17121895')
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

      test('falls back to schemeOperatorName when organisation.name is null', async () => {
        mockObligationsApi.getComplianceDeclarationOrNull.mockResolvedValue({
          ...mockDetailData,
          organisation: {
            ...mockDetailData.organisation,
            name: null,
            registrationType: 'ComplianceScheme',
            complianceSchemeName: 'Scheme Co',
            schemeOperatorName: 'Operator Co'
          }
        })

        const vm = await getCertificateOfComplianceDetailViewModel(
          'org-abc',
          'decl-1'
        )

        expect(vm.companyName).toBe('Operator Co')
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

      test('maps the Cancelled outcome from the cancellation audit entry', async () => {
        mockObligationsApi.getComplianceDeclarationOrNull.mockResolvedValue(
          mockCancelledDetailData
        )

        const vm = await getCertificateOfComplianceDetailViewModel(
          'org-abc',
          'decl-cancelled'
        )

        expect(vm.reviewStatus).toBe('Cancelled')
        expect(vm.showCancelledOutcome).toBe(true)
        expect(vm.cancelledBy).toBe('James Walker')
        expect(vm.cancelledDate).toBe('10 March 2026 at 09:15')
        expect(vm.cancellationReason).toBe('Submitted after the deadline.')
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

        test('sets recyclingObligationsMet to false when obligations exist but are not met', async () => {
          const vm = await getCertificateOfComplianceDetailViewModel(
            'org-abc',
            'decl-1'
          )

          expect(vm.recyclingObligationsMet).toBe(false)
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

        test('sets organisationRef to No data on fallback path when no reference number is available', async () => {
          const vm = await getCertificateOfComplianceDetailViewModel(
            'org-abc',
            'decl-1'
          )

          expect(vm.organisationRef).toBe('No data')
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

        test('shows No data (not the external id) when Account API and waste-organisations have no referenceNumber', async () => {
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

          expect(vm.organisationRef).toBe('No data')
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

        test('resolves a compliance-scheme name from waste-organisations and reference number by Companies House number', async () => {
          createWasteObligationsApiService.mockReturnValue({
            getComplianceObligation: vi
              .fn()
              .mockResolvedValue(mockObligationData)
          })
          createWasteOrganisationsApiService.mockReturnValue({
            getOrganisation: vi.fn().mockResolvedValue({
              id: 'cs-org-abc',
              name: 'Waste Org Scheme Ltd',
              companiesHouseNumber: 'CHN-CS-DETAIL',
              registrationType: 'ComplianceScheme'
            })
          })
          mockAccountApi.getOrganisationsByCompaniesHouseNumbers.mockResolvedValue(
            [
              {
                companiesHouseNumber: 'CHN-CS-DETAIL',
                name: 'Account Scheme Name',
                referenceNumber: '530001',
                isComplianceScheme: true
              }
            ]
          )

          const vm = await getCertificateOfComplianceDetailViewModel(
            'cs-org-abc',
            undefined,
            { obligationYear: 2026 }
          )

          expect(vm.companyName).toBe('Waste Org Scheme Ltd')
          expect(vm.organisationRef).toBe('530001')
          expect(
            mockAccountApi.getOrganisationsByCompaniesHouseNumbers
          ).toHaveBeenCalledWith(['CHN-CS-DETAIL'], undefined)
          expect(
            mockAccountApi.getOrganisationsByExternalIds
          ).not.toHaveBeenCalled()
        })

        test('resolves the compliance-scheme operator when a producer shares the Companies House number', async () => {
          createWasteObligationsApiService.mockReturnValue({
            getComplianceObligation: vi
              .fn()
              .mockResolvedValue(mockObligationData)
          })
          createWasteOrganisationsApiService.mockReturnValue({
            getOrganisation: vi.fn().mockResolvedValue({
              id: 'cs-org-abc',
              name: 'Scheme legal name',
              companiesHouseNumber: 'CHN-SHARED',
              registrationType: 'ComplianceScheme'
            })
          })
          mockAccountApi.getOrganisationsByCompaniesHouseNumbers.mockResolvedValue(
            [
              {
                companiesHouseNumber: 'CHN-SHARED',
                name: 'Producer',
                referenceNumber: '111111',
                isComplianceScheme: false
              },
              {
                companiesHouseNumber: 'CHN-SHARED',
                name: 'Scheme Operator',
                referenceNumber: '530009',
                isComplianceScheme: true
              }
            ]
          )

          const vm = await getCertificateOfComplianceDetailViewModel(
            'cs-org-abc',
            undefined,
            { obligationYear: 2026 }
          )

          expect(vm.organisationRef).toBe('530009')
        })

        test('shows "No data" when only a non-compliance-scheme organisation matches the Companies House number', async () => {
          createWasteObligationsApiService.mockReturnValue({
            getComplianceObligation: vi
              .fn()
              .mockResolvedValue(mockObligationData)
          })
          createWasteOrganisationsApiService.mockReturnValue({
            getOrganisation: vi.fn().mockResolvedValue({
              id: 'cs-org-abc',
              name: 'Scheme legal name',
              companiesHouseNumber: 'CHN-PRODUCER-ONLY',
              registrationType: 'ComplianceScheme'
            })
          })
          mockAccountApi.getOrganisationsByCompaniesHouseNumbers.mockResolvedValue(
            [
              {
                companiesHouseNumber: 'CHN-PRODUCER-ONLY',
                name: 'Producer',
                referenceNumber: '111111',
                isComplianceScheme: false
              }
            ]
          )

          const vm = await getCertificateOfComplianceDetailViewModel(
            'cs-org-abc',
            undefined,
            { obligationYear: 2026 }
          )

          expect(vm.organisationRef).toBe('No data')
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

        test('maps compliance scheme organisation name from the scheme operator name, not the scheme trading name', async () => {
          createWasteObligationsApiService.mockReturnValue({
            getComplianceObligation: vi
              .fn()
              .mockResolvedValue(mockObligationData)
          })
          createWasteOrganisationsApiService.mockReturnValue({
            getOrganisation: vi.fn().mockResolvedValue({
              id: 'org-cs',
              name: 'Scheme Operator Co',
              tradingName: 'Trading Scheme Co',
              registrationType: 'ComplianceScheme',
              referenceNumber: '183551'
            })
          })

          const vm = await getCertificateOfComplianceDetailViewModel(
            'org-cs',
            undefined,
            { obligationYear: 2026 }
          )

          expect(vm.companyName).toBe('Scheme Operator Co')
          expect(vm.complianceTypeLabel).toBe('2026 statement of compliance')
        })

        describe('contact details from the organisation nominated contact', () => {
          const approvedPerson = {
            firstName: 'Nadia',
            lastName: 'Clarke',
            email: 'nadia.clarke@example.test',
            telephoneNumber: '020 7946 0103',
            serviceRole: 'Approved Person'
          }
          const basicUser = {
            firstName: 'Sam',
            lastName: 'Reed',
            email: 'sam.reed@example.test',
            telephoneNumber: '020 7946 1111',
            serviceRole: 'Basic User'
          }

          function setupDirectProducer() {
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
                  externalId: 'account-guid-dp',
                  name: 'Account Producer Ltd',
                  referenceNumber: '600124'
                }
              ],
              notFoundExternalIds: []
            })
          }

          function setupComplianceScheme() {
            createWasteObligationsApiService.mockReturnValue({
              getComplianceObligation: vi
                .fn()
                .mockResolvedValue(mockObligationData)
            })
            createWasteOrganisationsApiService.mockReturnValue({
              getOrganisation: vi.fn().mockResolvedValue({
                id: 'org-cs',
                name: 'Scheme Operator Co',
                tradingName: 'Trading Scheme Co',
                registrationType: 'ComplianceScheme',
                companiesHouseNumber: 'CHN-CS-1'
              })
            })
            mockAccountApi.getOrganisationsByCompaniesHouseNumbers.mockResolvedValue(
              [
                {
                  companiesHouseNumber: 'CHN-CS-1',
                  externalId: 'account-guid-cs',
                  name: 'Scheme Operator Co',
                  referenceNumber: '530001',
                  isComplianceScheme: true
                }
              ]
            )
          }

          test('resolves a compliance scheme contact using the external id from the Companies House lookup', async () => {
            setupComplianceScheme()
            mockAccountApi.getOrganisationWithPersonsOrNull.mockResolvedValue({
              persons: [basicUser, approvedPerson]
            })

            const vm = await getCertificateOfComplianceDetailViewModel(
              'org-cs',
              undefined,
              { traceId: 'trace-cs', obligationYear: 2026 }
            )

            expect(
              mockAccountApi.getOrganisationWithPersonsOrNull
            ).toHaveBeenCalledWith('account-guid-cs', 'trace-cs')
            expect(vm.declarationEmailAddress).toBe('nadia.clarke@example.test')
            expect(vm.companyPhoneNumber).toBe('020 7946 0103')
          })

          test('resolves a direct producer contact using the external id from the Account API', async () => {
            setupDirectProducer()
            mockAccountApi.getOrganisationWithPersonsOrNull.mockResolvedValue({
              persons: [approvedPerson]
            })

            const vm = await getCertificateOfComplianceDetailViewModel(
              'org-abc',
              undefined,
              { traceId: 'trace-dp', obligationYear: 2026 }
            )

            expect(
              mockAccountApi.getOrganisationWithPersonsOrNull
            ).toHaveBeenCalledWith('account-guid-dp', 'trace-dp')
            expect(vm.declarationEmailAddress).toBe('nadia.clarke@example.test')
            expect(vm.companyPhoneNumber).toBe('020 7946 0103')
          })

          test('shows No data when nobody holds a nominated contact role', async () => {
            setupComplianceScheme()
            mockAccountApi.getOrganisationWithPersonsOrNull.mockResolvedValue({
              persons: [basicUser]
            })

            const vm = await getCertificateOfComplianceDetailViewModel(
              'org-cs',
              undefined,
              { obligationYear: 2026 }
            )

            expect(vm.declarationEmailAddress).toBe('No data')
            expect(vm.companyPhoneNumber).toBe('No data')
          })

          test('shows No data when the Account API holds no organisation record', async () => {
            setupComplianceScheme()
            mockAccountApi.getOrganisationWithPersonsOrNull.mockResolvedValue(
              null
            )

            const vm = await getCertificateOfComplianceDetailViewModel(
              'org-cs',
              undefined,
              { obligationYear: 2026 }
            )

            expect(vm.declarationEmailAddress).toBe('No data')
            expect(vm.companyPhoneNumber).toBe('No data')
          })

          test('does not call the contact endpoint when no Account organisation matched', async () => {
            setupComplianceScheme()
            mockAccountApi.getOrganisationsByCompaniesHouseNumbers.mockResolvedValue(
              []
            )

            const vm = await getCertificateOfComplianceDetailViewModel(
              'org-cs',
              undefined,
              { obligationYear: 2026 }
            )

            expect(
              mockAccountApi.getOrganisationWithPersonsOrNull
            ).not.toHaveBeenCalled()
            expect(vm.declarationEmailAddress).toBe('No data')
            expect(vm.companyPhoneNumber).toBe('No data')
          })

          test('leaves Name on account hidden — there is still no submitter', async () => {
            setupComplianceScheme()
            mockAccountApi.getOrganisationWithPersonsOrNull.mockResolvedValue({
              persons: [approvedPerson]
            })

            const vm = await getCertificateOfComplianceDetailViewModel(
              'org-cs',
              undefined,
              { obligationYear: 2026 }
            )

            expect(vm.showNameOnAccount).toBe(false)
            expect(vm.nameOnAccount).toBe('No data')
          })
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

        test('sets showSubmittedOn and showNameOnAccount to false', async () => {
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

          expect(vm.showSubmittedOn).toBe(false)
          expect(vm.showNameOnAccount).toBe(false)
        })

        test('derives recyclingObligationsMet from obligation material totals', async () => {
          createWasteObligationsApiService.mockReturnValue({
            getComplianceObligation: vi.fn().mockResolvedValue({
              obligations: mockObligationData.obligations.map((o, i) =>
                i === 0 ? { ...o, status: 'NotMet' } : { ...o, status: 'Met' }
              )
            })
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

          expect(vm.recyclingObligationsMet).toBe(false)
        })

        test('sets recyclingObligationsMet to true when all obligation materials are met', async () => {
          createWasteObligationsApiService.mockReturnValue({
            getComplianceObligation: vi.fn().mockResolvedValue({
              obligations: mockObligationData.obligations.map((o) => ({
                ...o,
                status: 'Met'
              }))
            })
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

          expect(vm.recyclingObligationsMet).toBe(true)
        })

        test('sets recyclingObligationsMet to null when obligations are absent', async () => {
          createWasteObligationsApiService.mockReturnValue({
            getComplianceObligation: vi
              .fn()
              .mockResolvedValue({ obligations: null })
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

          expect(vm.recyclingObligationsMet).toBeNull()
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
          'EcoPack Group declared they have not complied with all other requirements in regulation 43.'
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
          audit: []
        })
        mockOrganisationsApi.getOrganisation.mockResolvedValue({
          id: 'org-abc',
          name: 'Live Producer Ltd',
          companiesHouseNumber: null,
          registrations: []
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

      describe('compliance-schemes — reference number by Companies House number', () => {
        test('calls the Account API with the compliance-scheme Companies House numbers and traceId, not external ids', async () => {
          setupNotSubmittedTab([
            {
              id: 'cs-guid-1',
              name: 'Org record name',
              companiesHouseNumber: 'CHN-CS-1',
              registrationType: 'ComplianceScheme'
            },
            {
              id: 'cs-guid-2',
              name: 'Org record name',
              companiesHouseNumber: 'CHN-CS-2',
              registrationType: 'ComplianceScheme'
            }
          ])

          await getCertificatesOfComplianceViewModel(
            'compliance-schemes',
            'not-submitted',
            1,
            'trace-cs'
          )

          expect(
            mockAccountApi.getOrganisationsByCompaniesHouseNumbers
          ).toHaveBeenCalledWith(['CHN-CS-1', 'CHN-CS-2'], 'trace-cs')
          expect(
            mockAccountApi.getOrganisationsByExternalIds
          ).not.toHaveBeenCalled()
        })

        test('ignores a non-compliance-scheme organisation that shares a Companies House number', async () => {
          setupNotSubmittedTab([
            {
              id: 'cs-guid-1',
              name: 'Scheme record',
              companiesHouseNumber: 'CHN-SHARED',
              registrationType: 'ComplianceScheme'
            }
          ])
          mockAccountApi.getOrganisationsByCompaniesHouseNumbers.mockResolvedValue(
            [
              {
                companiesHouseNumber: 'CHN-SHARED',
                name: 'Producer',
                referenceNumber: '111111',
                isComplianceScheme: false
              },
              {
                companiesHouseNumber: 'CHN-SHARED',
                name: 'Scheme Operator',
                referenceNumber: '530009',
                isComplianceScheme: true
              }
            ]
          )

          const vm = await getCertificatesOfComplianceViewModel(
            'compliance-schemes',
            'not-submitted',
            1
          )

          expect(vm.items[0].organisationReferenceNumber).toBe('530009')
        })

        test('displays the waste-organisations record name and the Account API reference number for each row', async () => {
          setupNotSubmittedTab([
            {
              id: 'cs-guid-1',
              name: 'Org record name 1',
              companiesHouseNumber: 'CHN-CS-1',
              registrationType: 'ComplianceScheme'
            },
            {
              id: 'cs-guid-2',
              name: 'Org record name 2',
              companiesHouseNumber: 'CHN-CS-2',
              registrationType: 'ComplianceScheme'
            }
          ])
          mockAccountApi.getOrganisationsByCompaniesHouseNumbers.mockResolvedValue(
            [
              {
                companiesHouseNumber: 'CHN-CS-1',
                name: 'Ignored Account Name',
                referenceNumber: '530001',
                isComplianceScheme: true
              },
              {
                companiesHouseNumber: 'CHN-CS-2',
                name: 'Ignored Account Name',
                referenceNumber: '530002',
                isComplianceScheme: true
              }
            ]
          )

          const vm = await getCertificatesOfComplianceViewModel(
            'compliance-schemes',
            'not-submitted',
            1
          )

          expect(vm.items).toEqual([
            expect.objectContaining({
              organisationId: 'cs-guid-1',
              organisationReferenceNumber: '530001',
              organisationName: 'Org record name 1'
            }),
            expect.objectContaining({
              organisationId: 'cs-guid-2',
              organisationReferenceNumber: '530002',
              organisationName: 'Org record name 2'
            })
          ])
        })

        test('displays the scheme operator name, not the scheme trading name', async () => {
          setupNotSubmittedTab([
            {
              id: 'cs-guid-1',
              name: 'Scheme Operator Co',
              tradingName: 'GreenCircle Compliance Scheme',
              companiesHouseNumber: 'CHN-CS-1',
              registrationType: 'ComplianceScheme'
            }
          ])
          mockAccountApi.getOrganisationsByCompaniesHouseNumbers.mockResolvedValue(
            [
              {
                companiesHouseNumber: 'CHN-CS-1',
                name: 'Ignored Account Name',
                referenceNumber: '530001',
                isComplianceScheme: true
              }
            ]
          )

          const vm = await getCertificatesOfComplianceViewModel(
            'compliance-schemes',
            'not-submitted',
            1
          )

          expect(vm.items[0].organisationName).toBe('Scheme Operator Co')
        })

        test('shows "No data" reference number for an unmatched Companies House number while keeping the record name', async () => {
          setupNotSubmittedTab([
            {
              id: 'cs-guid-1',
              name: 'Org record name 1',
              companiesHouseNumber: 'CHN-CS-1',
              registrationType: 'ComplianceScheme'
            },
            {
              id: 'cs-guid-2',
              name: 'Org record name 2',
              companiesHouseNumber: 'CHN-CS-2',
              registrationType: 'ComplianceScheme'
            }
          ])
          mockAccountApi.getOrganisationsByCompaniesHouseNumbers.mockResolvedValue(
            [
              {
                companiesHouseNumber: 'CHN-CS-1',
                name: 'Ignored Account Name',
                referenceNumber: '530001',
                isComplianceScheme: true
              }
            ]
          )

          const vm = await getCertificatesOfComplianceViewModel(
            'compliance-schemes',
            'not-submitted',
            1
          )

          expect(vm.items[0]).toMatchObject({
            organisationId: 'cs-guid-1',
            organisationReferenceNumber: '530001',
            organisationName: 'Org record name 1'
          })
          expect(vm.items[1]).toMatchObject({
            organisationId: 'cs-guid-2',
            organisationReferenceNumber: 'No data',
            organisationName: 'Org record name 2'
          })
        })

        test('propagates a 5xx so the error page is shown', async () => {
          setupNotSubmittedTab([
            {
              id: 'cs-guid-1',
              name: 'Org record name',
              companiesHouseNumber: 'CHN-CS-1',
              registrationType: 'ComplianceScheme'
            }
          ])

          const apiError = Object.assign(new Error('account API failed'), {
            name: 'ApiError',
            status: 500
          })
          mockAccountApi.getOrganisationsByCompaniesHouseNumbers.mockRejectedValue(
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
