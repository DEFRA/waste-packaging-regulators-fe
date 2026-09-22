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
import { ApiError } from '#services/apiBaseClient/api-error.js'
import { createWasteObligationsApiService } from '#services/waste-obligations-api.service.js'
import { createWasteOrganisationsApiService } from '#services/waste-organisations-api.service.js'
import { createAccountApiService } from '#services/account-api.service.js'
import {
  getCertificatesOfComplianceViewModel,
  fetchAllDeclarations,
  mapUnsubmittedToItem,
  resolveUnsubmittedSort
} from './list.service.js'
import { getCertificateOfComplianceDetailViewModel } from '../detail/detail.service.js'
import { complianceRecords } from '#mocks/waste-obligations/fixtures.js'
import { toDeclaration } from '#mocks/backends.js'
import {
  PAGE_SIZE,
  DECLARATIONS_BATCH_SIZE,
  COMPLIANCE_YEAR,
  NO_DATA
} from '../common/constants.js'

// Canonical declaration shapes projected from the default records, fed to the fake
// API services in the tests below and asserted against.
const byKey = (key) => complianceRecords.find((record) => record.key === key)
const declarationByKey = (key) => toDeclaration(byKey(key))
const mockDetailData = declarationByKey('howco-pending')
const mockComplianceSchemeDetailData = declarationByKey('ecopack-pending')
const mockSubmittedAuditEntry = byKey('howco-pending').audit[0]
const mockObligationData = {
  obligations: byKey('redwood-not-submitted').obligations
}

// waste-organisations records carry no registrationType — it is derived from
// the registrations they do carry, so fixtures must supply those instead.
const complianceSchemeRegistrations = [
  { type: 'COMPLIANCE_SCHEME', registrationYear: 2026, status: 'REGISTERED' }
]
const directProducerRegistrations = [
  { type: 'LARGE_PRODUCER', registrationYear: 2026, status: 'REGISTERED' }
]

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
  obligationCoveragePercentage: 84,
  ...rest
})

describe('getCertificatesOfComplianceViewModel', () => {
  describe('with the API services faked', () => {
    let mockObligationsApi
    let mockOrganisationsApi
    let mockAccountApi

    beforeEach(() => {
      config.get.mockImplementation((key) => {
        if (key === 'csvExport.obligationConcurrency') return 20
        return false
      })
      mockObligationsApi = {
        listComplianceDeclarations: vi.fn(),
        listUnsubmittedComplianceDeclarations: vi
          .fn()
          .mockResolvedValue({ unsubmittedOrganisations: [], total: 0 }),
        getComplianceObligation: vi.fn().mockResolvedValue({ obligations: [] })
      }
      // The list path no longer touches these two; the detail view model
      // covered further down this file still does.
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
      // All three tab counts are now a `total` from a pageSize=1 probe. The
      // not-submitted count used to mean repeating the whole submitted/accepted
      // diff a second time per render.
      const stubCounts = ({ pending, accepted, notSubmitted }) => {
        mockObligationsApi.listComplianceDeclarations.mockImplementation(
          ({ status }) =>
            Promise.resolve({
              total: status === 'Submitted' ? pending : accepted,
              complianceDeclarations: []
            })
        )
        mockObligationsApi.listUnsubmittedComplianceDeclarations.mockResolvedValue(
          { unsubmittedOrganisations: [], total: notSubmitted }
        )
      }

      test('builds summary from API results', async () => {
        stubCounts({ pending: 10, accepted: 5, notSubmitted: 5 })

        const vm = await getCertificatesOfComplianceViewModel(
          'compliance-schemes',
          'pending',
          1
        )

        expect(vm.totalPending).toBe(10)
        expect(vm.totalAccepted).toBe(5)
        expect(vm.totalNotSubmitted).toBe(5)
      })

      test('takes totalNotSubmitted from the unsubmitted endpoint total', async () => {
        stubCounts({ pending: 0, accepted: 0, notSubmitted: 42 })

        const vm = await getCertificatesOfComplianceViewModel(
          'direct-producers',
          'pending',
          1
        )

        expect(vm.totalNotSubmitted).toBe(42)
        expect(
          mockObligationsApi.listUnsubmittedComplianceDeclarations
        ).toHaveBeenCalledWith(
          expect.objectContaining({ pageSize: 1 }),
          undefined
        )
      })

      test('counts the tabs without draining any declaration pages', async () => {
        stubCounts({ pending: 500, accepted: 500, notSubmitted: 500 })

        await getCertificatesOfComplianceViewModel(
          'direct-producers',
          'pending',
          1
        )

        const batchDrains =
          mockObligationsApi.listComplianceDeclarations.mock.calls.filter(
            ([params]) => params.pageSize === DECLARATIONS_BATCH_SIZE
          )
        expect(batchDrains).toHaveLength(0)
      })

      test.each([
        ['compliance-schemes', 'ComplianceScheme'],
        ['direct-producers', 'DirectProducer']
      ])('maps %s to %s registrationType', async (type, registrationType) => {
        stubCounts({ pending: 0, accepted: 0, notSubmitted: 0 })

        await getCertificatesOfComplianceViewModel(type, 'pending', 1)

        expect(
          mockObligationsApi.listComplianceDeclarations
        ).toHaveBeenCalledWith(
          expect.objectContaining({ registrationType }),
          undefined
        )
        expect(
          mockObligationsApi.listUnsubmittedComplianceDeclarations
        ).toHaveBeenCalledWith(
          expect.objectContaining({ registrationType }),
          undefined
        )
      })

      test('scopes every count to the compliance year', async () => {
        stubCounts({ pending: 0, accepted: 0, notSubmitted: 0 })

        await getCertificatesOfComplianceViewModel(
          'direct-producers',
          'pending',
          1
        )

        expect(
          mockObligationsApi.listUnsubmittedComplianceDeclarations
        ).toHaveBeenCalledWith(
          expect.objectContaining({ obligationYear: COMPLIANCE_YEAR }),
          undefined
        )
      })

      test('forwards traceId to API calls', async () => {
        stubCounts({ pending: 0, accepted: 0, notSubmitted: 0 })

        await getCertificatesOfComplianceViewModel(
          'direct-producers',
          'pending',
          1,
          undefined,
          undefined,
          { traceId: 'trace-xyz' }
        )

        expect(
          mockObligationsApi.listComplianceDeclarations
        ).toHaveBeenCalledWith(expect.any(Object), 'trace-xyz')
        expect(
          mockObligationsApi.listUnsubmittedComplianceDeclarations
        ).toHaveBeenCalledWith(expect.any(Object), 'trace-xyz')
      })

      test('forwards regulator country to tab count and list API calls', async () => {
        stubCounts({ pending: 0, accepted: 0, notSubmitted: 0 })

        await getCertificatesOfComplianceViewModel(
          'direct-producers',
          'pending',
          1,
          undefined,
          undefined,
          { country: 'GB-ENG' }
        )

        for (const [params] of mockObligationsApi.listComplianceDeclarations
          .mock.calls) {
          expect(params.country).toBe('GB-ENG')
        }
        for (const [params] of mockObligationsApi
          .listUnsubmittedComplianceDeclarations.mock.calls) {
          expect(params.country).toBe('GB-ENG')
        }
      })
    })

    describe('getComplianceList — pending tab', () => {
      test('fetches and maps declarations from the API', async () => {
        const declaration = makeDeclaration()
        mockObligationsApi.listComplianceDeclarations.mockImplementation(
          ({ pageSize, status }) => {
            if (pageSize === 1) {
              return Promise.resolve({ total: 1, complianceDeclarations: [] })
            }
            if (pageSize === PAGE_SIZE && status === 'Submitted') {
              return Promise.resolve({
                total: 1,
                complianceDeclarations: [declaration]
              })
            }
            return Promise.resolve({ total: 0, complianceDeclarations: [] })
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
          obligationCoveragePercentage: 84,
          dateSubmitted: '2027-01-15'
        })
      })

      test('calculates totalPages correctly from total count', async () => {
        mockObligationsApi.listComplianceDeclarations.mockImplementation(
          ({ pageSize, status }) => {
            if (pageSize === 1 && status === 'Submitted') {
              return Promise.resolve({ total: 45, complianceDeclarations: [] })
            }
            if (pageSize === 1) {
              return Promise.resolve({ total: 0, complianceDeclarations: [] })
            }
            if (pageSize === PAGE_SIZE && status === 'Submitted') {
              return Promise.resolve({ total: 45, complianceDeclarations: [] })
            }
            return Promise.resolve({ total: 0, complianceDeclarations: [] })
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
      const rows = (count, from = 1) =>
        Array.from({ length: count }, (_, i) => ({
          organisationId: `org-${from + i}`,
          obligationYear: 2026,
          registrationType: 'DirectProducer',
          name: `Org ${from + i}`,
          referenceNumber: `10000${from + i}`,
          recyclingObligationsMet: true,
          obligationCoveragePercentage: 90
        }))

      const stubUnsubmitted = ({ total, page }) => {
        mockObligationsApi.listComplianceDeclarations.mockResolvedValue({
          total: 0,
          complianceDeclarations: []
        })
        mockObligationsApi.listUnsubmittedComplianceDeclarations.mockImplementation(
          ({ pageSize }) =>
            Promise.resolve(
              pageSize === 1
                ? { unsubmittedOrganisations: [], total }
                : { unsubmittedOrganisations: page, total }
            )
        )
      }

      test('maps the endpoint rows to list items', async () => {
        stubUnsubmitted({ total: 2, page: rows(2) })

        const vm = await getCertificatesOfComplianceViewModel(
          'direct-producers',
          'not-submitted',
          1
        )

        expect(vm.items).toHaveLength(2)
        expect(vm.items[0]).toMatchObject({
          id: null,
          organisationId: 'org-1',
          organisationName: 'Org 1',
          organisationReferenceNumber: '100001'
        })
      })

      // Paging is the endpoint's job now; the frontend only derives the page
      // count from the total it reports.
      test('asks for the requested page at the list page size', async () => {
        stubUnsubmitted({ total: 45, page: rows(20, 21) })

        const vm = await getCertificatesOfComplianceViewModel(
          'direct-producers',
          'not-submitted',
          2
        )

        expect(
          mockObligationsApi.listUnsubmittedComplianceDeclarations
        ).toHaveBeenCalledWith(
          expect.objectContaining({ page: 2, pageSize: PAGE_SIZE }),
          undefined
        )
        expect(vm.pagination.totalPages).toBe(3)
        expect(vm.pagination.currentPage).toBe(2)
      })

      test('returns totalPages=1 when there are no not-submitted organisations', async () => {
        stubUnsubmitted({ total: 0, page: [] })

        const vm = await getCertificatesOfComplianceViewModel(
          'direct-producers',
          'not-submitted',
          1
        )

        expect(vm.items).toEqual([])
        expect(vm.pagination.totalPages).toBe(1)
      })

      // The regression guard for the incident this change removes: rendering the
      // tab must cost one call to the endpoint and nothing per row.
      test('resolves the tab without any per-organisation or cross-service lookups', async () => {
        stubUnsubmitted({ total: 20, page: rows(20) })

        await getCertificatesOfComplianceViewModel(
          'direct-producers',
          'not-submitted',
          1
        )

        expect(
          mockObligationsApi.getComplianceObligation
        ).not.toHaveBeenCalled()
        expect(
          mockOrganisationsApi.listComplianceOrganisations
        ).not.toHaveBeenCalled()
        expect(
          mockAccountApi.getOrganisationsByExternalIds
        ).not.toHaveBeenCalled()
        expect(
          mockAccountApi.getOrganisationsByCompaniesHouseNumbers
        ).not.toHaveBeenCalled()
      })

      test('scopes the request to the compliance year and the page organisation type', async () => {
        stubUnsubmitted({ total: 0, page: [] })

        await getCertificatesOfComplianceViewModel(
          'compliance-schemes',
          'not-submitted',
          1,
          undefined,
          undefined,
          { traceId: 'trace-9' }
        )

        expect(
          mockObligationsApi.listUnsubmittedComplianceDeclarations
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            obligationYear: COMPLIANCE_YEAR,
            registrationType: 'ComplianceScheme'
          }),
          'trace-9'
        )
      })

      test('sends the default sort when the tab has none of its own', async () => {
        stubUnsubmitted({ total: 0, page: [] })

        await getCertificatesOfComplianceViewModel(
          'direct-producers',
          'not-submitted',
          1
        )

        expect(
          mockObligationsApi.listUnsubmittedComplianceDeclarations
        ).toHaveBeenCalledWith(
          expect.objectContaining({ sort: 'Name[asc]' }),
          undefined
        )
      })
    })
    describe('getComplianceList — unknown tab', () => {
      test('returns empty items and totalPages=1 for unknown tab', async () => {
        mockObligationsApi.listComplianceDeclarations.mockResolvedValue({
          total: 0,
          complianceDeclarations: []
        })
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

    // Still the pending/accepted CSV's page drain; the not-submitted tab no
    // longer reaches it.
    describe('fetchAllDeclarations — multi-page', () => {
      test('fetches every page when the total exceeds the batch size', async () => {
        const api = {
          listComplianceDeclarations: vi.fn(({ page }) =>
            Promise.resolve({
              total: 150,
              complianceDeclarations: Array.from(
                { length: page === 1 ? DECLARATIONS_BATCH_SIZE : 50 },
                (_, i) => ({ organisation: { id: `decl-${page}-${i}` } })
              )
            })
          )
        }

        const declarations = await fetchAllDeclarations(
          api,
          { status: 'Submitted' },
          'trace-1'
        )

        expect(api.listComplianceDeclarations).toHaveBeenCalledTimes(2)
        expect(declarations).toHaveLength(150)
      })

      test('makes a single call when one page covers the total', async () => {
        const api = {
          listComplianceDeclarations: vi.fn().mockResolvedValue({
            total: 3,
            complianceDeclarations: [{}, {}, {}]
          })
        }

        const declarations = await fetchAllDeclarations(api, {}, undefined)

        expect(api.listComplianceDeclarations).toHaveBeenCalledTimes(1)
        expect(declarations).toHaveLength(3)
      })
    })

    describe('mapDeclarationToItem', () => {
      const setupPendingTab = (declarations) => {
        mockObligationsApi.listComplianceDeclarations.mockImplementation(
          ({ status, pageSize }) => {
            if (pageSize === 1) {
              return Promise.resolve({
                total: declarations.length,
                complianceDeclarations: []
              })
            }
            if (pageSize === PAGE_SIZE && status === 'Submitted') {
              return Promise.resolve({
                total: declarations.length,
                complianceDeclarations: declarations
              })
            }
            return Promise.resolve({ total: 0, complianceDeclarations: [] })
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

    describe('getCertificateOfComplianceDetailViewModel', () => {
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
        mockObligationsApi.getComplianceDeclarationOrNull.mockResolvedValue({
          ...mockDetailData,
          status: 'Queried',
          queryDetails: {
            queriedMaterials: 'Plastic, Steel',
            reason: 'Tonnage figures do not match submitted evidence.',
            dateQueried: '2026-03-17T00:00:00Z'
          }
        })

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
          queriedMaterials: 'Plastic, Steel',
          reason: 'Tonnage figures do not match submitted evidence.',
          dateQueried: '17 March 2026'
        })
      })

      test('maps the Cancelled outcome from the cancellation audit entry', async () => {
        mockObligationsApi.getComplianceDeclarationOrNull.mockResolvedValue({
          ...mockDetailData,
          status: 'Cancelled',
          audit: [
            {
              action: 'Cancelled',
              timestamp: '2026-03-10T09:15:00Z',
              user: { name: 'James Walker' },
              reason: 'Submitted after the deadline.'
            }
          ]
        })

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
          expect(vm.currentYearActions[0].viewSubmissionUrl).toBe(
            '/497f6eca-6276-4993-bfeb-53cbbbba6f08/certificate/decl-cancelled-no-reason'
          )
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
          expect(vm.currentYearActions[0].viewSubmissionUrl).toBe(
            '/497f6eca-6276-4993-bfeb-53cbbbba6f08/certificate/decl-accepted-history'
          )
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

        test('sets recyclingObligationsMet to null when all obligation materials are no-data', async () => {
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
              registrations: complianceSchemeRegistrations,
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
                registrations: directProducerRegistrations
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
                registrations: complianceSchemeRegistrations,
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

          test('renders the rest of the page when the contact lookup fails', async () => {
            setupComplianceScheme()
            mockAccountApi.getOrganisationWithPersonsOrNull.mockRejectedValue(
              new ApiError({
                status: 500,
                message: 'account API request failed with status 500',
                serviceName: 'account'
              })
            )

            const vm = await getCertificateOfComplianceDetailViewModel(
              'org-cs',
              undefined,
              { obligationYear: 2026 }
            )

            expect(vm.declarationEmailAddress).toBe('No data')
            expect(vm.companyPhoneNumber).toBe('No data')
            expect(vm.companyName).toBe('Scheme Operator Co')
            expect(vm.organisationRef).toBe('530001')
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

    // The reference number now arrives materialised on the endpoint row, so the
    // Account API lookups this tab used to make are gone. What survives is the
    // mapping contract the template depends on.
    describe('not-submitted — row mapping', () => {
      test('sets id to null so the template links to the organisation, not a declaration', () => {
        const item = mapUnsubmittedToItem({
          organisationId: 'org-1',
          name: 'Acme Ltd',
          referenceNumber: '100001',
          recyclingObligationsMet: true,
          obligationCoveragePercentage: 92
        })

        expect(item.id).toBeNull()
        expect(item.organisationId).toBe('org-1')
      })

      test('takes the organisation name and reference number from the endpoint row', () => {
        const item = mapUnsubmittedToItem({
          organisationId: 'org-1',
          name: 'Acme Ltd',
          referenceNumber: '100001'
        })

        expect(item.organisationName).toBe('Acme Ltd')
        expect(item.organisationReferenceNumber).toBe('100001')
      })

      // The endpoint only returns organisations whose reference number resolved,
      // so this is a guard against ever rendering 'undefined' in the ID column —
      // not a fallback the contract is expected to exercise.
      test('falls back to "No data" rather than undefined when a reference number is missing', () => {
        const item = mapUnsubmittedToItem({
          organisationId: 'org-1',
          name: 'Acme Ltd'
        })

        expect(item.organisationReferenceNumber).toBe(NO_DATA)
      })

      test('leaves Regulation 43 and date submitted empty — neither applies without a declaration', () => {
        const item = mapUnsubmittedToItem({
          organisationId: 'org-1',
          name: 'Acme Ltd',
          referenceNumber: '100001'
        })

        expect(item.regulation43Met).toBeNull()
        expect(item.dateSubmitted).toBeNull()
      })
    })

    describe('resolveUnsubmittedSort', () => {
      test.each([
        ['OrganisationName', 'asc', 'Name[asc]'],
        ['OrganisationId', 'desc', 'ReferenceNumber[desc]'],
        ['RecyclingObligations', 'asc', 'RecyclingObligationsMet[asc]'],
        ['PercentageMet', 'desc', 'ObligationCoveragePercentage[desc]']
      ])(
        'maps %s[%s] to the endpoint vocabulary',
        (column, direction, expected) => {
          expect(resolveUnsubmittedSort(column, direction)).toBe(expected)
        }
      )

      // The controller persists whatever ?sort= it is given per tab, so a column
      // belonging to another tab can arrive here from the session. Falling back
      // keeps it away from the endpoint, which would reject it.
      test.each(['DateSubmitted', 'Regulation43', 'Nonsense', undefined])(
        'falls back to the default sort for the unsupported column %s',
        (column) => {
          expect(resolveUnsubmittedSort(column, 'asc')).toBe('Name[asc]')
        }
      )

      test('falls back to the default sort for an invalid direction', () => {
        expect(resolveUnsubmittedSort('OrganisationName', 'sideways')).toBe(
          'Name[asc]'
        )
      })
    })
    // The endpoint serves both metrics materialised, so these are mapping tests
    // over its payload rather than tests of a frontend calculation.
    describe('not-submitted — obligation metrics', () => {
      const unsubmittedRow = (overrides = {}) => ({
        organisationId: 'org-1',
        obligationYear: 2026,
        registrationType: 'DirectProducer',
        name: 'Acme Ltd',
        referenceNumber: '100001',
        recyclingObligationsMet: true,
        obligationCoveragePercentage: 92,
        ...overrides
      })

      const notSubmittedItems = async (rows, type = 'direct-producers') => {
        mockObligationsApi.listComplianceDeclarations.mockResolvedValue({
          total: 0,
          complianceDeclarations: []
        })
        mockObligationsApi.listUnsubmittedComplianceDeclarations.mockImplementation(
          ({ pageSize }) =>
            Promise.resolve(
              pageSize === 1
                ? { unsubmittedOrganisations: [], total: rows.length }
                : { unsubmittedOrganisations: rows, total: rows.length }
            )
        )
        const vm = await getCertificatesOfComplianceViewModel(
          type,
          'not-submitted',
          1
        )
        return vm.items
      }

      test('passes the materialised percentage through unchanged', async () => {
        const items = await notSubmittedItems([
          unsubmittedRow({ obligationCoveragePercentage: 92 })
        ])

        expect(items[0].obligationCoveragePercentage).toBe(92)
      })

      test('passes the materialised recycling status through unchanged', async () => {
        const items = await notSubmittedItems([
          unsubmittedRow({ recyclingObligationsMet: false })
        ])

        expect(items[0].recyclingObligationsMet).toBe(false)
      })

      // A null metric means the backend holds no successful calculation for that
      // organisation yet. It must not be coerced to 0, which the template and CSV
      // would render as a genuine "0% of obligations met".
      test('keeps a null percentage null rather than coercing it to 0', async () => {
        const items = await notSubmittedItems([
          unsubmittedRow({
            recyclingObligationsMet: null,
            obligationCoveragePercentage: null
          })
        ])

        expect(items[0].obligationCoveragePercentage).toBeNull()
        expect(items[0].recyclingObligationsMet).toBeNull()
      })

      test('never asks the obligations route for a not-submitted row', async () => {
        await notSubmittedItems([unsubmittedRow()])

        expect(
          mockObligationsApi.getComplianceObligation
        ).not.toHaveBeenCalled()
      })

      test('propagates an unsubmitted endpoint failure so the error page is shown', async () => {
        mockObligationsApi.listComplianceDeclarations.mockResolvedValue({
          total: 0,
          complianceDeclarations: []
        })
        mockObligationsApi.listUnsubmittedComplianceDeclarations.mockRejectedValue(
          new ApiError({ message: 'Boom', status: 500 })
        )

        await expect(
          getCertificatesOfComplianceViewModel(
            'direct-producers',
            'not-submitted',
            1
          )
        ).rejects.toThrow('Boom')
      })
    })
  })
})
