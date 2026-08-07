import { createServer } from '#server/server.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import {
  sessionCookieFromResponse,
  mergeCookiesFromResponse
} from '#test-helpers/cookies.js'
import { load } from 'cheerio'
import { vi } from 'vitest'
import * as listService from './list.service.js'
import {
  mockSummary,
  mockPendingItems,
  mockAcceptedItems,
  mockNotSubmittedItems,
  mockComplianceSchemeAcceptedItems,
  mockComplianceSchemePendingItems
} from '../certificates-of-compliance.mock.js'
import { emptyTabMessages } from '../common/constants.js'

describe('#certificatesOfComplianceController', () => {
  let server
  let sessionCookie

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
    // Sign in via mock strategy to get a session cookie for use in all tests
    const response = await server.inject({
      method: 'GET',
      url: '/signin-oidc'
    })
    sessionCookie = sessionCookieFromResponse(response)
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  const inject = (url) =>
    server.inject({ method: 'GET', url, headers: { cookie: sessionCookie } })

  test('Should return 200 for default request', async () => {
    const { statusCode } = await inject('/certificates-of-compliance')

    expect(statusCode).toBe(statusCodes.ok)
  })

  test('Should render the page heading', async () => {
    const { result } = await inject('/certificates-of-compliance')

    expect(result).toEqual(
      expect.stringContaining('View certificates and statements of compliance')
    )
  })

  test('Should render the compliance year from the summary', async () => {
    const { result } = await inject('/certificates-of-compliance')

    expect(result).toEqual(
      expect.stringContaining(`${mockSummary.complianceYear} compliance year`)
    )
  })

  describe('Organisation type navigation', () => {
    test('Should default to direct-producers as the active nav item', async () => {
      const { result } = await inject('/certificates-of-compliance')

      expect(result).toEqual(
        expect.stringContaining(
          '<strong class="govuk-service-navigation__active-fallback">Direct producers</strong>'
        )
      )
    })

    test('Should set direct-producers as the active nav item when type=direct-producers', async () => {
      const { result, statusCode } = await inject(
        '/certificates-of-compliance?type=direct-producers'
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(
        expect.stringContaining(
          '<strong class="govuk-service-navigation__active-fallback">Direct producers</strong>'
        )
      )
    })

    test('Should set compliance-schemes as the active nav item when type=compliance-schemes', async () => {
      const { result, statusCode } = await inject(
        '/certificates-of-compliance?type=compliance-schemes'
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(
        expect.stringContaining(
          '<strong class="govuk-service-navigation__active-fallback">Compliance schemes</strong>'
        )
      )
    })

    test('Should preserve the active tab when switching organisation type', async () => {
      const { result } = await inject(
        '/certificates-of-compliance?type=direct-producers&tab=accepted'
      )

      expect(result).toEqual(
        expect.stringContaining('type=direct-producers&tab=accepted')
      )
    })

    test('Should include the current tab in the non-active organisation type nav link', async () => {
      const { result } = await inject(
        '/certificates-of-compliance?type=compliance-schemes&tab=accepted'
      )

      expect(result).toEqual(
        expect.stringContaining('type=direct-producers&tab=accepted')
      )
    })
  })

  describe('Tab counts', () => {
    test('Should show the pending count from mock data in the tab label', async () => {
      const { result } = await inject('/certificates-of-compliance')

      expect(result).toEqual(
        expect.stringContaining(`Pending (${mockSummary.totalPending})`)
      )
    })

    test('Should show the accepted count from mock data in the tab label', async () => {
      const { result } = await inject('/certificates-of-compliance')

      expect(result).toEqual(
        expect.stringContaining(`Accepted (${mockSummary.totalAccepted})`)
      )
    })

    test('Should show the not submitted count from mock data in the tab label', async () => {
      const { result } = await inject('/certificates-of-compliance')

      expect(result).toEqual(
        expect.stringContaining(
          `Not submitted (${mockSummary.totalNotSubmitted})`
        )
      )
    })
  })

  describe('Tab content', () => {
    test('Should render pending items in the pending tab by default', async () => {
      const { result } = await inject('/certificates-of-compliance')

      expect(result).toEqual(
        expect.stringContaining(`<strong>${mockSummary.totalPending}</strong>`)
      )
      expect(result).toEqual(expect.stringContaining('pending submissions'))
      mockPendingItems.forEach(({ organisationName, id }) => {
        expect(result).toEqual(expect.stringContaining(organisationName))
        expect(result).toEqual(expect.stringContaining(id))
      })
    })

    test('Should render accepted items in the accepted tab', async () => {
      const { result, statusCode } = await inject(
        '/certificates-of-compliance?tab=accepted'
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(
        expect.stringContaining(`<strong>${mockSummary.totalAccepted}</strong>`)
      )
      expect(result).toEqual(expect.stringContaining('accepted submissions'))
      mockAcceptedItems.forEach(({ organisationName, id }) => {
        expect(result).toEqual(expect.stringContaining(organisationName))
        expect(result).toEqual(expect.stringContaining(id))
      })
    })

    test('Should render not submitted items in the not submitted tab', async () => {
      const { result, statusCode } = await inject(
        '/certificates-of-compliance?tab=not-submitted'
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(
        expect.stringContaining(
          `<strong>${mockSummary.totalNotSubmitted}</strong>`
        )
      )
      expect(result).toEqual(expect.stringContaining('not submitted'))
      mockNotSubmittedItems.forEach(
        ({ organisationName, organisationReferenceNumber }) => {
          expect(result).toEqual(expect.stringContaining(organisationName))
          expect(result).toEqual(
            expect.stringContaining(organisationReferenceNumber)
          )
        }
      )
    })

    test('Should not render other tab panels when a specific tab is active', async () => {
      const { result } = await inject(
        '/certificates-of-compliance?tab=accepted'
      )

      expect(result).not.toEqual(expect.stringContaining('pending submissions'))
      expect(result).not.toEqual(expect.stringContaining('not submitted'))
    })

    test('Should not show the Date submitted column on the not-submitted tab', async () => {
      const { result } = await inject(
        '/certificates-of-compliance?tab=not-submitted'
      )

      expect(result).not.toEqual(expect.stringContaining('Date submitted'))
    })

    test('Should show the Date submitted column on the pending tab', async () => {
      const { result } = await inject('/certificates-of-compliance?tab=pending')

      expect(result).toEqual(expect.stringContaining('Date submitted'))
    })
  })

  describe('Regulation 43 and Percentage met columns', () => {
    test.each(['accepted', 'pending', 'not-submitted'])(
      'Should show Regulation 43 and not Percentage met on the %s tab for compliance-schemes',
      async (tab) => {
        const { result } = await inject(
          `/certificates-of-compliance?type=compliance-schemes&tab=${tab}`
        )

        expect(result).toEqual(expect.stringContaining('Regulation 43'))
        expect(result).not.toEqual(expect.stringContaining('Percentage met'))
      }
    )

    test.each(['accepted', 'pending', 'not-submitted'])(
      'Should show Percentage met and not Regulation 43 on the %s tab for direct-producers',
      async (tab) => {
        const { result } = await inject(
          `/certificates-of-compliance?type=direct-producers&tab=${tab}`
        )

        expect(result).toEqual(expect.stringContaining('Percentage met'))
        expect(result).not.toEqual(expect.stringContaining('Regulation 43'))
      }
    )

    test('Should render Percentage met for direct-producer pending items', async () => {
      const item = mockPendingItems.find(
        (entry) => entry.obligationCoveragePercentage === 97
      )
      const { result } = await inject(
        '/certificates-of-compliance?type=direct-producers&tab=pending'
      )

      expect(result).toEqual(expect.stringContaining(item.organisationName))
      expect(result).toEqual(expect.stringContaining('97%'))
    })

    test('Should render Percentage met for direct-producer not-submitted items', async () => {
      const item = mockNotSubmittedItems.find(
        (entry) => entry.obligationCoveragePercentage === 92
      )
      const { result } = await inject(
        '/certificates-of-compliance?type=direct-producers&tab=not-submitted'
      )

      expect(result).toEqual(expect.stringContaining(item.organisationName))
      expect(result).toEqual(expect.stringContaining('92%'))
    })

    test('Should render Compliant tag for items where regulation43Met is true', async () => {
      const trueItem = mockComplianceSchemeAcceptedItems.find(
        (item) => item.regulation43Met === true
      )
      const { result } = await inject(
        '/certificates-of-compliance?type=compliance-schemes&tab=accepted'
      )

      expect(result).toEqual(expect.stringContaining(trueItem.organisationName))
      expect(result).toEqual(expect.stringContaining('Compliant'))
    })

    test('Should render Not compliant tag for items where regulation43Met is false', async () => {
      const falseItem = mockComplianceSchemePendingItems.find(
        (item) => item.regulation43Met === false
      )
      const { result } = await inject(
        '/certificates-of-compliance?type=compliance-schemes&tab=pending'
      )

      expect(result).toEqual(
        expect.stringContaining(falseItem.organisationName)
      )
      expect(result).toEqual(expect.stringContaining('Not compliant'))
    })
  })

  describe('Sorting', () => {
    test.each([
      { type: 'direct-producers', tab: 'pending' },
      {
        type: 'direct-producers',
        tab: 'pending',
        column: 'obligationCoveragePercentage',
        direction: 'asc'
      },
      {
        type: 'direct-producers',
        tab: 'pending',
        column: 'recyclingObligationsMet',
        direction: 'asc'
      },
      {
        type: 'direct-producers',
        tab: 'pending',
        column: 'dateSubmitted',
        direction: 'asc'
      },
      {
        type: 'direct-producers',
        tab: 'pending',
        column: 'obligationCoveragePercentage',
        direction: 'desc'
      },
      {
        type: 'direct-producers',
        tab: 'pending',
        column: 'recyclingObligationsMet',
        direction: 'desc'
      },
      {
        type: 'direct-producers',
        tab: 'pending',
        column: 'dateSubmitted',
        direction: 'desc'
      },
      { type: 'direct-producers', tab: 'accepted' },
      {
        type: 'direct-producers',
        tab: 'accepted',
        column: 'obligationCoveragePercentage',
        direction: 'asc'
      },
      {
        type: 'direct-producers',
        tab: 'accepted',
        column: 'recyclingObligationsMet',
        direction: 'asc'
      },
      {
        type: 'direct-producers',
        tab: 'accepted',
        column: 'dateSubmitted',
        direction: 'asc'
      },
      {
        type: 'direct-producers',
        tab: 'accepted',
        column: 'obligationCoveragePercentage',
        direction: 'desc'
      },
      {
        type: 'direct-producers',
        tab: 'accepted',
        column: 'recyclingObligationsMet',
        direction: 'desc'
      },
      {
        type: 'direct-producers',
        tab: 'accepted',
        column: 'dateSubmitted',
        direction: 'desc'
      },
      { type: 'direct-producers', tab: 'not-submitted' },
      {
        type: 'direct-producers',
        tab: 'not-submitted',
        column: 'obligationCoveragePercentage',
        direction: 'asc'
      },
      {
        type: 'direct-producers',
        tab: 'not-submitted',
        column: 'recyclingObligationsMet',
        direction: 'asc'
      },
      {
        type: 'direct-producers',
        tab: 'not-submitted',
        column: 'obligationCoveragePercentage',
        direction: 'desc'
      },
      {
        type: 'direct-producers',
        tab: 'not-submitted',
        column: 'recyclingObligationsMet',
        direction: 'desc'
      },
      { type: 'compliance-schemes', tab: 'pending' },
      {
        type: 'compliance-schemes',
        tab: 'pending',
        column: 'regulation43Met',
        direction: 'asc'
      },
      {
        type: 'compliance-schemes',
        tab: 'pending',
        column: 'recyclingObligationsMet',
        direction: 'asc'
      },
      {
        type: 'compliance-schemes',
        tab: 'pending',
        column: 'dateSubmitted',
        direction: 'asc'
      },
      {
        type: 'compliance-schemes',
        tab: 'pending',
        column: 'regulation43Met',
        direction: 'desc'
      },
      {
        type: 'compliance-schemes',
        tab: 'pending',
        column: 'recyclingObligationsMet',
        direction: 'desc'
      },
      {
        type: 'compliance-schemes',
        tab: 'pending',
        column: 'dateSubmitted',
        direction: 'desc'
      },
      { type: 'compliance-schemes', tab: 'accepted' },
      {
        type: 'compliance-schemes',
        tab: 'accepted',
        column: 'regulation43Met',
        direction: 'asc'
      },
      {
        type: 'compliance-schemes',
        tab: 'accepted',
        column: 'recyclingObligationsMet',
        direction: 'asc'
      },
      {
        type: 'compliance-schemes',
        tab: 'accepted',
        column: 'dateSubmitted',
        direction: 'asc'
      },
      {
        type: 'compliance-schemes',
        tab: 'accepted',
        column: 'regulation43Met',
        direction: 'desc'
      },
      {
        type: 'compliance-schemes',
        tab: 'accepted',
        column: 'recyclingObligationsMet',
        direction: 'desc'
      },
      {
        type: 'compliance-schemes',
        tab: 'accepted',
        column: 'dateSubmitted',
        direction: 'desc'
      },
      { type: 'compliance-schemes', tab: 'not-submitted' },
      {
        type: 'compliance-schemes',
        tab: 'not-submitted',
        column: 'regulation43Met',
        direction: 'asc'
      },
      {
        type: 'compliance-schemes',
        tab: 'not-submitted',
        column: 'recyclingObligationsMet',
        direction: 'asc'
      },
      {
        type: 'compliance-schemes',
        tab: 'not-submitted',
        column: 'regulation43Met',
        direction: 'desc'
      },
      {
        type: 'compliance-schemes',
        tab: 'not-submitted',
        column: 'recyclingObligationsMet',
        direction: 'desc'
      }
    ])(
      'Should display sort $direction on column $column on the $type $tab tab',
      async ({ type, tab, column, direction }) => {
        let page = `/certificates-of-compliance?type=${type}&tab=${tab}`
        if (column) page += `&sortColumn=${column}&sortDirection=${direction}`

        const { result } = await inject(page)

        const curDirection = direction || 'asc'
        const nextDirection = curDirection === 'asc' ? 'desc' : 'asc'

        const $ = load(result)

        const activeSortAnchor = $('th[aria-sort$="ending"] a')

        expect(activeSortAnchor).toHaveLength(1)
        expect(activeSortAnchor.find('path')).toHaveLength(1)

        if (column) {
          expect(activeSortAnchor.attr('href')).toContain(
            `sortColumn=${column}&sortDirection=${nextDirection}`
          )
        } else if (tab === 'pending' || tab === 'accepted') {
          expect(activeSortAnchor.attr('href')).toContain(
            `sortColumn=dateSubmitted&sortDirection=${nextDirection}`
          )
        } else if (tab === 'not-submitted') {
          if (type === 'direct-producers') {
            expect(activeSortAnchor.attr('href')).toContain(
              `sortColumn=obligationCoveragePercentage&sortDirection=${nextDirection}`
            )
          } else if (type === 'compliance-schemes') {
            expect(activeSortAnchor.attr('href')).toContain(
              `sortColumn=recyclingObligationsMet&sortDirection=${nextDirection}`
            )
          }
        }
      }
    )
  })

  describe('Pagination', () => {
    test('Should include type and tab params in pagination links', async () => {
      const { result } = await inject(
        '/certificates-of-compliance?type=direct-producers&tab=pending&page=1'
      )

      expect(result).toEqual(
        expect.stringContaining(
          '/certificates-of-compliance?type=direct-producers&amp;tab=pending'
        )
      )
    })
  })

  describe('Empty tab state', () => {
    afterEach(() => {
      vi.restoreAllMocks()
    })

    test('Should show the empty message and hide the table when a tab has no items', async () => {
      vi.spyOn(
        listService,
        'getCertificatesOfComplianceViewModel'
      ).mockResolvedValue({
        heading: 'View certificates and statements of compliance',
        backlink: './',
        complianceYear: '2026',
        totalPending: 0,
        totalAccepted: 0,
        totalNotSubmitted: 0,
        organisationType: 'direct-producers',
        activeTab: 'pending',
        items: [],
        emptyTabMessage: emptyTabMessages.pending,
        pagination: {
          currentPage: 1,
          totalPages: 1,
          baseUrl:
            '/certificates-of-compliance?type=direct-producers&tab=pending'
        },
        sort: {
          column: 'dateSubmitted',
          direction: 'asc',
          baseUrl:
            '/certificates-of-compliance?type=direct-producers&tab=pending&page=1'
        }
      })

      const { result } = await inject('/certificates-of-compliance?tab=pending')
      const $ = load(result)

      expect(result).toContain(emptyTabMessages.pending)
      expect($('table').length).toBe(0)
      expect(result).not.toContain('Download list (CSV)')
      expect(result).toContain('<strong>0</strong>')
    })
  })

  describe('Per-tab sort retention', () => {
    let sortSessionCookie

    beforeAll(async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/signin-oidc'
      })
      sortSessionCookie = sessionCookieFromResponse(response)
    })

    test('Should include restored sort in pagination links after returning to a tab', async () => {
      let cookie = sortSessionCookie

      let response = await server.inject({
        method: 'GET',
        url: '/certificates-of-compliance?tab=pending&sortColumn=dateSubmitted&sortDirection=desc',
        headers: { cookie }
      })
      cookie = mergeCookiesFromResponse(cookie, response)

      response = await server.inject({
        method: 'GET',
        url: '/certificates-of-compliance?tab=accepted',
        headers: { cookie }
      })
      cookie = mergeCookiesFromResponse(cookie, response)

      response = await server.inject({
        method: 'GET',
        url: '/certificates-of-compliance?tab=pending',
        headers: { cookie }
      })

      expect(response.result).toContain('sortColumn=dateSubmitted')
      expect(response.result).toContain('aria-sort="descending"')
    })
  })
})
