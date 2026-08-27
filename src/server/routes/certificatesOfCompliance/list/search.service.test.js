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

// list.service.js pulls these in, and their real modules read config at import time.
vi.mock('#services/waste-organisations-api.service.js', () => ({
  createWasteOrganisationsApiService: vi.fn()
}))

vi.mock('#services/account-api.service.js', () => ({
  createAccountApiService: vi.fn()
}))

import { config } from '#config/config.js'
import { createWasteObligationsApiService } from '#services/waste-obligations-api.service.js'
import { getComplianceSearchResults } from './search.service.js'

function buildDeclaration(overrides = {}) {
  return {
    id: 'decl-1',
    status: 'Submitted',
    created: '2027-01-31',
    obligationStatus: 'Met',
    isRegulation43Compliant: true,
    obligations: [],
    organisation: {
      id: 'org-1',
      registrationType: 'DirectProducer',
      name: 'ZEINA FOODS LIMITED',
      referenceNumber: '100245'
    },
    ...overrides
  }
}

describe('#getComplianceSearchResults', () => {
  let listComplianceDeclarations

  beforeEach(() => {
    listComplianceDeclarations = vi.fn()
    createWasteObligationsApiService.mockReturnValue({
      listComplianceDeclarations
    })
  })

  describe('with the real API', () => {
    beforeEach(() => {
      config.get.mockImplementation((key) =>
        key === 'useMockApi' ? false : ''
      )
    })

    test('Should request pending and accepted together for the page organisation type', async () => {
      listComplianceDeclarations.mockResolvedValue({
        complianceDeclarations: [],
        total: 0
      })

      await getComplianceSearchResults('compliance-schemes', 'zeina', 'trace-1')

      expect(listComplianceDeclarations).toHaveBeenCalledWith(
        {
          obligationYear: 2026,
          status: 'Submitted,Accepted',
          registrationType: 'ComplianceScheme',
          search: 'zeina',
          sortColumn: 'DateSubmitted',
          sortDirection: 'desc',
          page: 1,
          pageSize: 100
        },
        'trace-1'
      )
    })

    test('Should label Submitted as Pending and Accepted as Accepted', async () => {
      listComplianceDeclarations.mockResolvedValue({
        complianceDeclarations: [
          buildDeclaration({ id: 'a', status: 'Submitted' }),
          buildDeclaration({ id: 'b', status: 'Accepted' })
        ],
        total: 2
      })

      const { items } = await getComplianceSearchResults(
        'direct-producers',
        'zeina'
      )

      expect(items.map((item) => item.submissionStatus)).toEqual([
        'Pending',
        'Accepted'
      ])
    })

    // Ordering is delegated to the API via the sort parameter, so the rows are
    // rendered in the order they arrive rather than being reordered here.
    test('Should return one row per submission in the order the API returned them', async () => {
      listComplianceDeclarations.mockResolvedValue({
        complianceDeclarations: [
          buildDeclaration({ id: 'newer', created: '2027-02-20' }),
          buildDeclaration({ id: 'middle', created: '2027-01-31' }),
          buildDeclaration({ id: 'older', created: '2027-01-10' })
        ],
        total: 3
      })

      const { items } = await getComplianceSearchResults(
        'direct-producers',
        'zeina'
      )

      expect(items.map((item) => item.id)).toEqual(['newer', 'middle', 'older'])
      expect(listComplianceDeclarations).toHaveBeenCalledWith(
        expect.objectContaining({
          sortColumn: 'DateSubmitted',
          sortDirection: 'desc'
        }),
        undefined
      )
    })

    test('Should use the scheme operator name for compliance schemes', async () => {
      listComplianceDeclarations.mockResolvedValue({
        complianceDeclarations: [
          buildDeclaration({
            organisation: {
              id: 'org-2',
              registrationType: 'ComplianceScheme',
              name: null,
              schemeOperatorName: 'Operator Co',
              referenceNumber: '530001'
            }
          })
        ],
        total: 1
      })

      const { items } = await getComplianceSearchResults(
        'compliance-schemes',
        'operator'
      )

      expect(items[0].organisationName).toBe('Operator Co')
      expect(items[0].organisationReferenceNumber).toBe('530001')
    })

    test('Should compute the percentage met from the embedded obligations', async () => {
      listComplianceDeclarations.mockResolvedValue({
        complianceDeclarations: [
          buildDeclaration({
            obligations: [
              { tonnages: { accepted: 90, obligated: 100 } },
              { tonnages: { accepted: 10, obligated: 100 } }
            ]
          })
        ],
        total: 1
      })

      const { items } = await getComplianceSearchResults(
        'direct-producers',
        'zeina'
      )

      expect(items[0].obligationCoveragePercentage).toBe(50)
    })

    test('Should leave the percentage empty when there are no obligations', async () => {
      listComplianceDeclarations.mockResolvedValue({
        complianceDeclarations: [buildDeclaration({ obligations: [] })],
        total: 1
      })

      const { items } = await getComplianceSearchResults(
        'direct-producers',
        'zeina'
      )

      expect(items[0].obligationCoveragePercentage).toBeNull()
    })

    test('Should report truncation when the total exceeds the rows returned', async () => {
      listComplianceDeclarations.mockResolvedValue({
        complianceDeclarations: [buildDeclaration()],
        total: 250
      })

      const result = await getComplianceSearchResults('direct-producers', 'ltd')

      expect(result.total).toBe(250)
      expect(result.truncated).toBe(true)
    })

    test('Should return no items when nothing matches', async () => {
      listComplianceDeclarations.mockResolvedValue({
        complianceDeclarations: [],
        total: 0
      })

      const result = await getComplianceSearchResults(
        'direct-producers',
        'zzzz'
      )

      expect(result).toEqual({ items: [], total: 0, truncated: false })
    })
  })
})
