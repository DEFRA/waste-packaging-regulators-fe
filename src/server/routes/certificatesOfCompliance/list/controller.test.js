import { statusCodes } from '#server/common/constants/status-codes.js'
import { translate } from '#server/common/helpers/i18n/translate.js'
import * as getSessionUserModule from '#server/common/helpers/get-session-user.js'
import { load } from 'cheerio'
import { vi } from 'vitest'
import * as listService from './list.service.js'
import * as searchService from './search.service.js'
import { getDefaultSortColumn } from './controller.js'
import { setupRegulatorsApp } from '#test-helpers/msw/harness.js'
import {
  obligationPresets,
  materialRow
} from '#test-helpers/msw/obligations.js'
import { emptyTabMessages } from '../common/constants.js'

// A small compliance world the value-asserting tests declare for themselves, so
// the counts, rows and percentages they check trace back to this input rather
// than a shared fixture. Behavioural tests (navigation, sorting mechanics,
// validation) below don't apply a scenario and run against the default mock.
const LIST_ORGS = [
  {
    name: 'Aldbury Producers Ltd',
    reference: '100001',
    status: 'pending',
    obligations: [materialRow('Aluminium', 100, 97, 'NotMet')] // 97% coverage
  },
  {
    name: 'Braemar Producers Ltd',
    reference: '100002',
    status: 'pending',
    obligations: obligationPresets.allMet
  },
  {
    name: 'Cedar Producers Ltd',
    reference: '100003',
    status: 'accepted',
    obligations: obligationPresets.allMet
  },
  {
    name: 'Dover Producers Ltd',
    reference: '100004',
    status: 'not-submitted',
    obligations: [materialRow('Aluminium', 100, 92, 'NotMet')] // 92% coverage
  },
  {
    name: 'Elgin Producers Ltd',
    reference: '100005',
    status: 'not-submitted',
    obligations: obligationPresets.allNoData
  },
  {
    name: 'Foxton Compliance Operators',
    type: 'compliance-scheme',
    reference: '200001',
    status: 'pending',
    obligations: obligationPresets.allMet,
    regulation43: false
  },
  {
    name: 'Girvan Compliance Operators',
    type: 'compliance-scheme',
    reference: '200002',
    status: 'accepted',
    obligations: obligationPresets.allMet,
    regulation43: true
  },
  {
    name: 'Harlow Compliance Operators',
    type: 'compliance-scheme',
    reference: '200003',
    status: 'not-submitted',
    obligations: obligationPresets.allMet
  }
]

describe('#certificatesOfComplianceController', () => {
  const app = setupRegulatorsApp()

  const inject = (url) => app.get(url)

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

    expect(result).toEqual(expect.stringContaining('2026 relevant year'))
  })

  describe('Organisation type navigation', () => {
    test('Should default to direct-producers as the active nav item', async () => {
      const { result } = await inject('/certificates-of-compliance')
      const $ = load(result)

      const activeLink = $('.moj-sub-navigation__link[aria-current="page"]')
      expect(activeLink).toHaveLength(1)
      expect(activeLink.text().trim()).toBe('Direct producers')
    })

    test('Should set direct-producers as the active nav item when type=direct-producers', async () => {
      const { result, statusCode } = await inject(
        '/certificates-of-compliance?type=direct-producers'
      )
      const $ = load(result)

      expect(statusCode).toBe(statusCodes.ok)
      const activeLink = $('.moj-sub-navigation__link[aria-current="page"]')
      expect(activeLink).toHaveLength(1)
      expect(activeLink.text().trim()).toBe('Direct producers')
    })

    test('Should set compliance-schemes as the active nav item when type=compliance-schemes', async () => {
      const { result, statusCode } = await inject(
        '/certificates-of-compliance?type=compliance-schemes'
      )
      const $ = load(result)

      expect(statusCode).toBe(statusCodes.ok)
      const activeLink = $('.moj-sub-navigation__link[aria-current="page"]')
      expect(activeLink).toHaveLength(1)
      expect(activeLink.text().trim()).toBe('Compliance schemes')
    })

    test('Should preserve the active tab when switching organisation type', async () => {
      const { result } = await inject(
        '/certificates-of-compliance?type=direct-producers&tab=accepted'
      )

      expect(result).toMatch(/type=direct-producers(?:&amp;|&)tab=accepted/)
    })

    test('Should include the current tab in the non-active organisation type nav link', async () => {
      const { result } = await inject(
        '/certificates-of-compliance?type=compliance-schemes&tab=accepted'
      )

      expect(result).toMatch(/type=direct-producers(?:&amp;|&)tab=accepted/)
    })
  })

  describe('Tab counts', () => {
    test('Should show the pending count from mock data in the tab label', async () => {
      const scenario = app.given(LIST_ORGS)
      const { result } = await inject('/certificates-of-compliance')

      expect(result).toEqual(
        expect.stringContaining(
          `Pending (${scenario.rowsFor('DirectProducer', 'pending').length})`
        )
      )
    })

    test('Should show the accepted count from mock data in the tab label', async () => {
      const scenario = app.given(LIST_ORGS)
      const { result } = await inject('/certificates-of-compliance')

      expect(result).toEqual(
        expect.stringContaining(
          `Accepted (${scenario.rowsFor('DirectProducer', 'accepted').length})`
        )
      )
    })

    test('Should show the not submitted count from mock data in the tab label', async () => {
      const scenario = app.given(LIST_ORGS)
      const { result } = await inject('/certificates-of-compliance')

      expect(result).toEqual(
        expect.stringContaining(
          `Not submitted (${scenario.rowsFor('DirectProducer', 'not-submitted').length})`
        )
      )
    })
  })

  describe('Tab content', () => {
    test('Should render pending items in the pending tab by default', async () => {
      const scenario = app.given(LIST_ORGS)
      const rows = scenario.rowsFor('DirectProducer', 'pending')
      const { result } = await inject('/certificates-of-compliance')

      expect(result).toEqual(
        expect.stringContaining(`<strong>${rows.length}</strong>`)
      )
      expect(result).toEqual(expect.stringContaining('pending submissions'))
      rows.forEach(({ organisationName, id }) => {
        expect(result).toEqual(expect.stringContaining(organisationName))
        expect(result).toEqual(expect.stringContaining(id))
      })
    })

    test('Should render accepted items in the accepted tab', async () => {
      const scenario = app.given(LIST_ORGS)
      const rows = scenario.rowsFor('DirectProducer', 'accepted')
      const { result, statusCode } = await inject(
        '/certificates-of-compliance?tab=accepted'
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(
        expect.stringContaining(`<strong>${rows.length}</strong>`)
      )
      expect(result).toEqual(expect.stringContaining('accepted submissions'))
      rows.forEach(({ organisationName, id }) => {
        expect(result).toEqual(expect.stringContaining(organisationName))
        expect(result).toEqual(expect.stringContaining(id))
      })
    })

    test('Should render not submitted items in the not submitted tab', async () => {
      const scenario = app.given(LIST_ORGS)
      const rows = scenario.rowsFor('DirectProducer', 'not-submitted')
      const { result, statusCode } = await inject(
        '/certificates-of-compliance?tab=not-submitted'
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(
        expect.stringContaining(`<strong>${rows.length}</strong>`)
      )
      expect(result).toEqual(expect.stringContaining('not submitted'))
      rows.forEach(({ organisationName, organisationReferenceNumber }) => {
        expect(result).toEqual(expect.stringContaining(organisationName))
        expect(result).toEqual(
          expect.stringContaining(organisationReferenceNumber)
        )
      })
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
      const scenario = app.given(LIST_ORGS)
      // Aldbury is declared with 97 accepted of 100 obligated → 97%.
      const item = scenario
        .rowsFor('DirectProducer', 'pending')
        .find((entry) => entry.obligationCoveragePercentage === 97)
      const { result } = await inject(
        '/certificates-of-compliance?type=direct-producers&tab=pending'
      )

      expect(result).toEqual(expect.stringContaining(item.organisationName))
      expect(result).toEqual(expect.stringContaining('97%'))
    })

    test('Should render Percentage met for direct-producer not-submitted items', async () => {
      const scenario = app.given(LIST_ORGS)
      const item = scenario
        .rowsFor('DirectProducer', 'not-submitted')
        .find((entry) => entry.obligationCoveragePercentage === 92)
      const { result } = await inject(
        '/certificates-of-compliance?type=direct-producers&tab=not-submitted'
      )

      expect(result).toEqual(expect.stringContaining(item.organisationName))
      expect(result).toEqual(expect.stringContaining('92%'))
    })

    test('Should render Compliant tag for items where regulation43Met is true', async () => {
      const scenario = app.given(LIST_ORGS)
      const trueItem = scenario
        .rowsFor('ComplianceScheme', 'accepted')
        .find((item) => item.regulation43Met === true)
      const { result } = await inject(
        '/certificates-of-compliance?type=compliance-schemes&tab=accepted'
      )

      expect(result).toEqual(expect.stringContaining(trueItem.organisationName))
      expect(result).toEqual(expect.stringContaining('Compliant'))
    })

    test('Should render Not compliant tag for items where regulation43Met is false', async () => {
      const scenario = app.given(LIST_ORGS)
      const falseItem = scenario
        .rowsFor('ComplianceScheme', 'pending')
        .find((item) => item.regulation43Met === false)
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
        column: 'PercentageMet',
        direction: 'asc'
      },
      {
        type: 'direct-producers',
        tab: 'pending',
        column: 'RecyclingObligations',
        direction: 'asc'
      },
      {
        type: 'direct-producers',
        tab: 'pending',
        column: 'DateSubmitted',
        direction: 'asc'
      },
      {
        type: 'direct-producers',
        tab: 'pending',
        column: 'PercentageMet',
        direction: 'desc'
      },
      {
        type: 'direct-producers',
        tab: 'pending',
        column: 'RecyclingObligations',
        direction: 'desc'
      },
      {
        type: 'direct-producers',
        tab: 'pending',
        column: 'DateSubmitted',
        direction: 'desc'
      },
      { type: 'direct-producers', tab: 'accepted' },
      {
        type: 'direct-producers',
        tab: 'accepted',
        column: 'PercentageMet',
        direction: 'asc'
      },
      {
        type: 'direct-producers',
        tab: 'accepted',
        column: 'RecyclingObligations',
        direction: 'asc'
      },
      {
        type: 'direct-producers',
        tab: 'accepted',
        column: 'DateSubmitted',
        direction: 'asc'
      },
      {
        type: 'direct-producers',
        tab: 'accepted',
        column: 'PercentageMet',
        direction: 'desc'
      },
      {
        type: 'direct-producers',
        tab: 'accepted',
        column: 'RecyclingObligations',
        direction: 'desc'
      },
      {
        type: 'direct-producers',
        tab: 'accepted',
        column: 'DateSubmitted',
        direction: 'desc'
      },
      { type: 'direct-producers', tab: 'not-submitted' },
      { type: 'compliance-schemes', tab: 'pending' },
      {
        type: 'compliance-schemes',
        tab: 'pending',
        column: 'Regulation43',
        direction: 'asc'
      },
      {
        type: 'compliance-schemes',
        tab: 'pending',
        column: 'RecyclingObligations',
        direction: 'asc'
      },
      {
        type: 'compliance-schemes',
        tab: 'pending',
        column: 'DateSubmitted',
        direction: 'asc'
      },
      {
        type: 'compliance-schemes',
        tab: 'pending',
        column: 'Regulation43',
        direction: 'desc'
      },
      {
        type: 'compliance-schemes',
        tab: 'pending',
        column: 'RecyclingObligations',
        direction: 'desc'
      },
      {
        type: 'compliance-schemes',
        tab: 'pending',
        column: 'DateSubmitted',
        direction: 'desc'
      },
      { type: 'compliance-schemes', tab: 'accepted' },
      {
        type: 'compliance-schemes',
        tab: 'accepted',
        column: 'Regulation43',
        direction: 'asc'
      },
      {
        type: 'compliance-schemes',
        tab: 'accepted',
        column: 'RecyclingObligations',
        direction: 'asc'
      },
      {
        type: 'compliance-schemes',
        tab: 'accepted',
        column: 'DateSubmitted',
        direction: 'asc'
      },
      {
        type: 'compliance-schemes',
        tab: 'accepted',
        column: 'Regulation43',
        direction: 'desc'
      },
      {
        type: 'compliance-schemes',
        tab: 'accepted',
        column: 'RecyclingObligations',
        direction: 'desc'
      },
      {
        type: 'compliance-schemes',
        tab: 'accepted',
        column: 'DateSubmitted',
        direction: 'desc'
      },
      { type: 'compliance-schemes', tab: 'not-submitted' }
    ])(
      'Should display sort $direction on column $column on the $type $tab tab',
      async ({ type, tab, column, direction }) => {
        let page = `/certificates-of-compliance?type=${type}&tab=${tab}`
        if (column) page += `&sort=${column}[${direction}]`

        const { result } = await inject(page)

        const defaultDirection =
          !column && (tab === 'pending' || tab === 'accepted') ? 'desc' : 'asc'
        const curDirection = direction || defaultDirection
        const nextDirection = curDirection === 'asc' ? 'desc' : 'asc'

        const $ = load(result)

        const activeSortAnchor = $('th[aria-sort$="ending"] a')

        if (tab === 'not-submitted') {
          expect(activeSortAnchor).toHaveLength(0)
          return
        }

        const activeColumn = column || 'DateSubmitted'

        expect(activeSortAnchor).toHaveLength(1)
        expect(activeSortAnchor.find('path')).toHaveLength(1)

        $('th a.govuk-link').each((_, el) => {
          const href = $(el).attr('href')
          const match = href.match(/sort=([^[&]+)\[(asc|desc)\]/)
          if (!match) return
          const [, col, dir] = match

          if (col === activeColumn) {
            expect(dir).toBe(nextDirection)
          } else {
            const expectedDefault = col === 'DateSubmitted' ? 'desc' : 'asc'
            expect(dir).toBe(expectedDefault)
          }
        })
      }
    )
  })

  describe('Search form', () => {
    test('Should render an empty search input when no search has been made', async () => {
      const { result } = await inject('/certificates-of-compliance')
      const $ = load(result)

      expect($('input#search')).toHaveLength(1)
      expect($('input#search').attr('value')).toBe('')
      expect($('.govuk-error-summary')).toHaveLength(0)
    })

    test('Should carry the current type and tab as hidden inputs', async () => {
      const { result } = await inject(
        '/certificates-of-compliance?type=compliance-schemes&tab=accepted'
      )
      const $ = load(result)
      const form = $('form[action="/certificates-of-compliance"]')

      expect(form.find('input[name="type"]').attr('value')).toBe(
        'compliance-schemes'
      )
      expect(form.find('input[name="tab"]').attr('value')).toBe('accepted')
    })

    test('Should retain the entered term in the search input', async () => {
      const { statusCode, result } = await inject(
        '/certificates-of-compliance?search=zeina'
      )
      const $ = load(result)

      expect(statusCode).toBe(statusCodes.ok)
      expect($('input#search').attr('value')).toBe('zeina')
      expect($('.govuk-error-summary')).toHaveLength(0)
    })

    test('Should trim surrounding whitespace from the entered term', async () => {
      const { result } = await inject(
        '/certificates-of-compliance?search=%20zeina%20'
      )
      const $ = load(result)

      expect($('input#search').attr('value')).toBe('zeina')
    })

    test.each(['', '%20%20'])(
      'Should show an error summary when Search is pressed with "%s"',
      async (value) => {
        const { statusCode, result } = await inject(
          `/certificates-of-compliance?search=${value}`
        )
        const $ = load(result)

        expect(statusCode).toBe(statusCodes.ok)
        expect($('.govuk-error-summary__title').text()).toContain(
          'There is a problem'
        )
        expect($('.govuk-error-summary a').text()).toContain(
          'Enter an organisation name or ID'
        )
        expect($('.govuk-error-summary a').attr('href')).toBe('#search')
        expect($('#search-error').text()).toContain(
          'Enter an organisation name or ID'
        )
        expect($('title').text()).toContain('Error:')
      }
    )

    test('Should still render the tabs and main table when the search is invalid', async () => {
      const { result } = await inject('/certificates-of-compliance?search=')

      expect(result).toEqual(expect.stringContaining('pending submissions'))
    })
  })

  describe('Search results', () => {
    let pendingItem
    let acceptedItem
    let schemeItem

    beforeEach(() => {
      const scenario = app.given(LIST_ORGS)
      pendingItem = scenario.rowsFor('DirectProducer', 'pending')[0]
      acceptedItem = scenario.rowsFor('DirectProducer', 'accepted')[0]
      schemeItem = scenario.rowsFor('ComplianceScheme', 'pending')[0]
    })

    const searchFor = (term, type = 'direct-producers') =>
      inject(
        `/certificates-of-compliance?type=${type}&search=${encodeURIComponent(term)}`
      )

    test('Should show the result count with the search term and a Clear search link', async () => {
      const { result } = await searchFor(pendingItem.organisationName)
      const $ = load(result)

      expect($('body').text()).toContain('1 result for')
      expect($('body').text()).toContain(pendingItem.organisationName)
      expect($('a:contains("Clear search")').attr('href')).toBe(
        '/certificates-of-compliance?type=direct-producers&tab=pending'
      )
    })

    test('Should render the results table above the service navigation', async () => {
      const { result } = await searchFor(pendingItem.organisationName)

      expect(result.indexOf('Submission status')).toBeLessThan(
        result.indexOf('aria-label="Filter by producer type"')
      )
    })

    test('Should render a row linking to the submission', async () => {
      const { result } = await searchFor(pendingItem.organisationName)
      const $ = load(result)
      // The same organisation also appears in the main table below, so scope to
      // the results table.
      const link = $('table')
        .first()
        .find(
          `a[href="/certificates-of-compliance/${pendingItem.organisationId}/certificate/${pendingItem.id}?type=direct-producers&tab=pending"]`
        )

      expect(link.text().trim()).toBe(pendingItem.organisationName)
    })

    test('Should show the Pending tag for a submitted declaration', async () => {
      const { result } = await searchFor(pendingItem.organisationName)

      expect(result).toEqual(
        expect.stringContaining(
          '<strong class="govuk-tag govuk-tag--blue">Pending</strong>'
        )
      )
    })

    test('Should show the Accepted tag for an accepted declaration', async () => {
      const { result } = await searchFor(acceptedItem.organisationName)

      expect(result).toEqual(
        expect.stringContaining(
          '<strong class="govuk-tag govuk-tag--teal">Accepted</strong>'
        )
      )
    })

    test('Should match on organisation ID', async () => {
      const { result } = await searchFor(
        acceptedItem.organisationReferenceNumber
      )

      expect(result).toEqual(
        expect.stringContaining(acceptedItem.organisationName)
      )
    })

    // A cancelled declaration belongs to no tab, so search is the only place it
    // is visible. A producer that cancelled one submission and made another
    // gets a row for each, rather than being collapsed to one row per
    // organisation.
    describe('An organisation with more than one submission', () => {
      const MULTI = [
        {
          name: 'Marlow Producers Ltd',
          organisationId: 'org-marlow',
          reference: '100910',
          status: 'cancelled',
          dateSubmitted: '2027-01-05'
        },
        {
          name: 'Marlow Producers Ltd',
          organisationId: 'org-marlow',
          reference: '100910',
          status: 'pending',
          dateSubmitted: '2027-01-20'
        }
      ]

      test('Should return a row per submission, newest first', async () => {
        app.given(MULTI)
        const { result } = await searchFor('Marlow Producers Ltd')
        const $ = load(result)
        const rows = $('table').first().find('tbody tr')

        expect($('body').text()).toContain('2 results for')
        expect(rows).toHaveLength(2)
        expect(rows.eq(0).text()).toContain('Pending')
        expect(rows.eq(1).text()).toContain('Cancelled')
      })

      test('Should link each row to its own submission', async () => {
        app.given(MULTI)
        const { result } = await searchFor('Marlow Producers Ltd')
        const $ = load(result)
        const hrefs = $('table')
          .first()
          .find('tbody tr a')
          .map((_, el) => $(el).attr('href'))
          .get()

        expect(hrefs).toHaveLength(2)
        expect(new Set(hrefs).size).toBe(2)
      })

      // Yellow rather than grey, matching the detail page: grey is Not submitted,
      // which now appears in this same table.
      test('Should show the Cancelled tag in yellow', async () => {
        app.given(MULTI)
        const { result } = await searchFor('Marlow Producers Ltd')

        expect(result).toEqual(
          expect.stringContaining(
            '<strong class="govuk-tag govuk-tag--yellow">Cancelled</strong>'
          )
        )
      })

      // A superseded submission keeps a status of its own, and no tab lists it,
      // so search is the only place it surfaces. Filtering by the tab a record
      // sits in instead of by its status silently dropped the accepted row here.
      const WITH_SUPERSEDED = [
        {
          name: 'Ashwell Producers Ltd',
          organisationId: 'org-ashwell',
          reference: '100911',
          status: 'accepted',
          listed: false,
          dateSubmitted: '2026-02-13'
        },
        {
          name: 'Ashwell Producers Ltd',
          organisationId: 'org-ashwell',
          reference: '100911',
          status: 'cancelled',
          dateSubmitted: '2026-05-22'
        },
        {
          name: 'Ashwell Producers Ltd',
          organisationId: 'org-ashwell',
          reference: '100911',
          status: 'pending',
          dateSubmitted: '2027-01-31'
        }
      ]

      test('Should include a superseded accepted submission', async () => {
        app.given(WITH_SUPERSEDED)
        const { result } = await searchFor('Ashwell Producers Ltd')
        const $ = load(result)
        const rows = $('table').first().find('tbody tr')

        expect($('body').text()).toContain('3 results for')
        expect(rows).toHaveLength(3)
        expect(rows.eq(0).text()).toContain('Pending')
        expect(rows.eq(1).text()).toContain('Cancelled')
        expect(rows.eq(2).text()).toContain('Accepted')
      })

      // The same producer as the regulator meets it: one live submission, and the
      // earlier ones behind the detail page's current-year history. Those history
      // declarations carry only a created timestamp, so they sort on that.
      test('Should return a row per submission for a producer with history', async () => {
        app.given([
          {
            name: 'Ashwell Producers Ltd',
            status: 'pending',
            dateSubmitted: '2027-01-31',
            history: [
              { status: 'accepted', at: '2026-02-13T09:42:00Z' },
              { status: 'cancelled', at: '2026-05-22T14:18:00Z' }
            ]
          }
        ])
        const { result } = await searchFor('Ashwell Producers Ltd')
        const $ = load(result)
        const rows = $('table').first().find('tbody tr')

        expect($('body').text()).toContain('3 results for')
        expect(rows.eq(0).text()).toContain('Pending')
        expect(rows.eq(1).text()).toContain('Cancelled')
        expect(rows.eq(2).text()).toContain('Accepted')
      })
    })

    test('Should show Percentage met and no Date submitted for direct producers', async () => {
      const { result } = await searchFor(pendingItem.organisationName)
      const $ = load(result)
      const headers = $('table')
        .first()
        .find('thead th')
        .map((_, el) => $(el).text().trim())
        .get()

      expect(headers).toEqual([
        'Organisation name',
        'Organisation ID',
        'Submission status',
        'Recycling obligations',
        'Percentage met'
      ])
    })

    test('Should show Regulation 43 and no Date submitted for compliance schemes', async () => {
      const { result } = await searchFor(
        schemeItem.organisationName,
        'compliance-schemes'
      )
      const $ = load(result)
      const headers = $('table')
        .first()
        .find('thead th')
        .map((_, el) => $(el).text().trim())
        .get()

      expect(headers).toEqual([
        'Organisation name',
        'Organisation ID',
        'Submission status',
        'Recycling obligations',
        'Regulation 43'
      ])
    })

    test('Should show guidance and no results table for a term matching nothing', async () => {
      const { result } = await searchFor('zzzznomatchzzzz')
      const $ = load(result)

      expect($('body').text()).toContain('0 results for')
      expect($('body').text()).toContain(
        'Check the spelling, or search for part of the organisation name or ID'
      )
      expect(
        $('table').first().find('th:contains("Submission status")')
      ).toHaveLength(0)
    })

    test('Should not render the results table when no search has been made', async () => {
      const { result } = await inject('/certificates-of-compliance')
      const $ = load(result)

      expect($('body').text()).not.toContain('result for')
      expect($('a:contains("Clear search")')).toHaveLength(0)
    })

    test('Should retain Welsh locale when searching', async () => {
      const { result } = await inject(
        `/certificates-of-compliance?lang=cy&type=direct-producers&search=${encodeURIComponent(pendingItem.organisationName)}`
      )
      const $ = load(result)

      expect($('html').attr('lang')).toBe('cy')
      expect($('input[name="lang"]').attr('value')).toBe('cy')
      expect(
        $(
          `a:contains("${translate('cy', 'certificatesOfCompliance.list.searchResults.clearSearch')}")`
        ).attr('href')
      ).toBe(
        '/certificates-of-compliance?type=direct-producers&tab=pending&lang=cy'
      )
      expect(
        $('table')
          .first()
          .find(
            `a[href="/certificates-of-compliance/${pendingItem.organisationId}/certificate/${pendingItem.id}?type=direct-producers&tab=pending&lang=cy"]`
          )
      ).toHaveLength(1)
    })

    // "Not submitted" is not a declaration status, so these rows come from the
    // unsubmitted endpoint rather than the declaration search. They are the only
    // way search can surface an organisation that still owes a submission.
    describe('Not submitted organisations', () => {
      const NEVER_SUBMITTED = [
        {
          name: 'Zeina Foods Limited',
          organisationId: 'org-zeina',
          reference: '100245',
          status: 'not-submitted'
        }
      ]

      test('Should return a Not submitted organisation for a partial lower-case term', async () => {
        app.given(NEVER_SUBMITTED)
        const { result } = await searchFor('zei')
        const $ = load(result)
        const rows = $('table').first().find('tbody tr')

        expect($('body').text()).toContain('1 result for')
        expect(rows).toHaveLength(1)
        expect(rows.eq(0).text()).toContain('Zeina Foods Limited')
        expect(rows.eq(0).text()).toContain('Not submitted')
      })

      test('Should match a Not submitted organisation on its organisation ID', async () => {
        app.given(NEVER_SUBMITTED)
        const { result } = await searchFor('10024')

        expect(result).toEqual(expect.stringContaining('Zeina Foods Limited'))
      })

      test('Should show the Not submitted tag in grey', async () => {
        app.given(NEVER_SUBMITTED)
        const { result } = await searchFor('zeina')

        expect(result).toEqual(
          expect.stringContaining(
            '<strong class="govuk-tag govuk-tag--grey">Not submitted</strong>'
          )
        )
      })

      // There is no declaration to link to, so the row points at the
      // organisation itself, the way the not-submitted tab does.
      test('Should link a Not submitted row to the organisation detail page', async () => {
        const scenario = app.given(NEVER_SUBMITTED)
        const org = scenario.byName('Zeina Foods Limited')
        const { result } = await searchFor('zeina')
        const $ = load(result)

        const link = $('table')
          .first()
          .find(
            `a[href="/certificates-of-compliance/${org.organisationId}?obligationYear=2026&type=direct-producers&tab=pending"]`
          )

        expect(link.text().trim()).toBe('Zeina Foods Limited')
      })

      test('Should show No data where an unsubmitted organisation has no calculated obligations', async () => {
        app.given([
          {
            name: 'Uncalculated Producers Ltd',
            organisationId: 'org-uncalculated',
            reference: '100811',
            status: 'not-submitted',
            obligations: []
          }
        ])
        const { result } = await searchFor('Uncalculated')
        const $ = load(result)

        expect($('table').first().find('tbody tr').eq(0).text()).toContain(
          'No data'
        )
      })

      // A cancelled-only organisation reaches both endpoints: it holds no live
      // declaration, and its cancelled one matched the term. Its current state
      // leads and the history sits below it.
      describe('An organisation whose only submission was cancelled', () => {
        const CANCELLED_ONLY = [
          {
            name: 'Cancelled Only Ltd',
            organisationId: 'org-cancelled-only',
            reference: '100910',
            status: 'cancelled',
            dateSubmitted: '2027-01-05'
          }
        ]

        test('Should show a Not submitted row above the Cancelled row', async () => {
          app.given(CANCELLED_ONLY)
          const { result } = await searchFor('Cancelled Only Ltd')
          const $ = load(result)
          const rows = $('table').first().find('tbody tr')

          expect($('body').text()).toContain('2 results for')
          expect(rows).toHaveLength(2)
          expect(rows.eq(0).text()).toContain('Not submitted')
          expect(rows.eq(1).text()).toContain('Cancelled')
        })

        test('Should link the two rows to the organisation and to its declaration', async () => {
          const scenario = app.given(CANCELLED_ONLY)
          const org = scenario.byName('Cancelled Only Ltd')
          const { result } = await searchFor('Cancelled Only Ltd')
          const $ = load(result)
          const hrefs = $('table')
            .first()
            .find('tbody tr a')
            .map((_, el) => $(el).attr('href'))
            .get()

          expect(hrefs).toEqual([
            `/certificates-of-compliance/${org.organisationId}?obligationYear=2026&type=direct-producers&tab=pending`,
            `/certificates-of-compliance/${org.organisationId}/certificate/${org.declarationId}?type=direct-producers&tab=pending`
          ])
        })
      })

      test('Should keep an organisation rows together with its current row leading', async () => {
        app.given([
          {
            name: 'Grouped Recent Ltd',
            organisationId: 'org-recent',
            reference: '100701',
            status: 'pending',
            dateSubmitted: '2027-03-05'
          },
          {
            name: 'Grouped Cancelled Ltd',
            organisationId: 'org-grouped-cancelled',
            reference: '100702',
            status: 'cancelled',
            dateSubmitted: '2027-02-01'
          },
          {
            name: 'Grouped Never Ltd',
            organisationId: 'org-grouped-never',
            reference: '100703',
            status: 'not-submitted'
          }
        ])
        const { result } = await searchFor('Grouped')
        const $ = load(result)
        const rows = $('table')
          .first()
          .find('tbody tr')
          .map((_, el) => $(el).text().replace(/\s+/g, ' ').trim())
          .get()

        expect(rows).toHaveLength(4)
        expect(rows[0]).toContain('Grouped Recent Ltd')
        expect(rows[0]).toContain('Pending')
        // The cancelled-only organisation keeps both of its rows adjacent.
        expect(rows[1]).toContain('Grouped Cancelled Ltd')
        expect(rows[1]).toContain('Not submitted')
        expect(rows[2]).toContain('Grouped Cancelled Ltd')
        expect(rows[2]).toContain('Cancelled')
        // Nothing dates the never-submitted organisation, so it tails the list.
        expect(rows[3]).toContain('Grouped Never Ltd')
        expect(rows[3]).toContain('Not submitted')
      })

      test('Should count Not submitted rows in the result total', async () => {
        app.given([
          {
            name: 'Counted Pending Ltd',
            organisationId: 'org-counted-pending',
            reference: '100801',
            status: 'pending'
          },
          {
            name: 'Counted Never Ltd',
            organisationId: 'org-counted-never',
            reference: '100802',
            status: 'not-submitted'
          }
        ])
        const { result } = await searchFor('Counted')

        expect(load(result)('body').text()).toContain('2 results for')
      })

      // The unsubmitted endpoint owns the membership rule — an organisation with
      // a live submission is simply not in its result set, and the frontend adds
      // no suppression of its own.
      test('Should not show a Not submitted row for an organisation with a live submission', async () => {
        app.given([
          {
            name: 'Resubmitted Ltd',
            organisationId: 'org-resubmitted',
            reference: '100905',
            status: 'pending',
            dateSubmitted: '2027-02-20',
            history: [{ status: 'cancelled', dateSubmitted: '2027-01-02' }]
          }
        ])
        const { result } = await searchFor('Resubmitted Ltd')
        const $ = load(result)

        expect($('table').first().text()).not.toContain('Not submitted')
      })

      test('Should show Not submitted rows for compliance schemes with the Regulation 43 column', async () => {
        app.given([
          {
            name: 'Scheme Never Submitted Ltd',
            organisationId: 'org-scheme-never',
            reference: '530001',
            type: 'compliance-scheme',
            status: 'not-submitted'
          }
        ])
        const { result } = await searchFor('Scheme Never', 'compliance-schemes')
        const $ = load(result)
        const headings = $('table')
          .first()
          .find('thead th')
          .map((_, el) => $(el).text().trim())
          .get()

        expect(headings).toEqual([
          'Organisation name',
          'Organisation ID',
          'Submission status',
          'Recycling obligations',
          'Regulation 43'
        ])
        expect($('table').first().text()).toContain('Not submitted')
      })

      test('Should retain Welsh locale on a Not submitted row link', async () => {
        const scenario = app.given(NEVER_SUBMITTED)
        const org = scenario.byName('Zeina Foods Limited')
        const { result } = await inject(
          '/certificates-of-compliance?lang=cy&type=direct-producers&search=zeina'
        )
        const $ = load(result)

        expect(
          $('table')
            .first()
            .find(
              `a[href="/certificates-of-compliance/${org.organisationId}?obligationYear=2026&type=direct-producers&tab=pending&lang=cy"]`
            )
        ).toHaveLength(1)
      })
    })

    describe('The result count label', () => {
      test('Should render the search term in bold', async () => {
        const { result } = await searchFor(pendingItem.organisationName)
        const $ = load(result)
        const label = $('#search-results p').first()

        expect(label.find('strong').text()).toBe(pendingItem.organisationName)
        expect(label.text()).toContain('1 result for "')
      })

      // The term is user input rendered beside literal markup, so it has to be
      // escaped rather than interpolated into the translated sentence.
      test('Should escape a search term containing HTML', async () => {
        const term = '<img src=x onerror=alert(1)>'
        const { result } = await searchFor(term)
        const $ = load(result)

        expect(result).not.toContain('<img src=x')
        expect(result).toContain('&lt;img src=x')
        expect($('#search-results strong').first().text()).toBe(term)
        expect($('#search-results script')).toHaveLength(0)
      })
    })
  })

  describe('Pagination', () => {
    test('Should include type and tab params in pagination links', async () => {
      const { result } = await inject(
        '/certificates-of-compliance?type=direct-producers&tab=pending&page=1'
      )

      expect(result).toMatch(
        /\/certificates-of-compliance\?type=direct-producers(?:&amp;|&)tab=pending/
      )
    })
  })

  describe('Empty tab state', () => {
    afterEach(() => {
      vi.restoreAllMocks()
    })

    test.each(['pending', 'accepted', 'not-submitted'])(
      'Should show the empty message and hide the table when the %s tab has no items',
      async (tab) => {
        const organisationType = 'direct-producers'
        const sortColumn = getDefaultSortColumn(tab)

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
          organisationType,
          activeTab: tab,
          items: [],
          emptyTabMessage: emptyTabMessages[tab],
          pagination: {
            currentPage: 1,
            totalPages: 1,
            baseUrl: `/certificates-of-compliance?type=${organisationType}&tab=${tab}`
          },
          sort: {
            column: sortColumn,
            direction: 'asc',
            baseUrl: `/certificates-of-compliance?type=${organisationType}&tab=${tab}&page=1`
          }
        })

        const { result } = await inject(
          `/certificates-of-compliance?type=${organisationType}&tab=${tab}`
        )
        const $ = load(result)

        expect(result).toContain(emptyTabMessages[tab])
        expect($('table')).toHaveLength(0)
        // Scenario 6: the download stays available on an empty tab (header-only CSV).
        expect(result).toContain('Download list (CSV)')
        expect(result).toContain('<strong>0</strong>')
      }
    )
  })

  describe('Per-tab sort retention', () => {
    let sortSessionCookie

    beforeAll(async () => {
      sortSessionCookie = await app.signIn()
    })

    test('Should include restored sort in pagination links after returning to a tab', async () => {
      let cookie = sortSessionCookie

      let response = await app.get(
        '/certificates-of-compliance?tab=pending&sort=DateSubmitted[desc]',
        cookie
      )
      cookie = app.nextCookie(response, cookie)

      response = await app.get(
        '/certificates-of-compliance?tab=accepted',
        cookie
      )
      cookie = app.nextCookie(response, cookie)

      response = await app.get(
        '/certificates-of-compliance?tab=pending',
        cookie
      )

      expect(response.result).toContain('sort=DateSubmitted[asc]')
      expect(response.result).toContain('aria-sort="descending"')
    })
  })

  describe('Regulator country filter', () => {
    afterEach(() => {
      vi.restoreAllMocks()
    })

    test('passes session regulator country to the list and search services', async () => {
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
          column: 'DateSubmitted',
          direction: 'desc',
          baseUrl:
            '/certificates-of-compliance?type=direct-producers&tab=pending&page=1'
        }
      })
      const searchSpy = vi
        .spyOn(searchService, 'getComplianceSearchResults')
        .mockResolvedValue([])

      await inject(
        '/certificates-of-compliance?type=direct-producers&tab=pending&search=Acme'
      )

      expect(
        listService.getCertificatesOfComplianceViewModel
      ).toHaveBeenCalledWith(
        'direct-producers',
        'pending',
        1,
        'DateSubmitted',
        'desc',
        expect.objectContaining({ country: 'GB-ENG' })
      )
      expect(searchSpy).toHaveBeenCalledWith(
        'direct-producers',
        'Acme',
        undefined,
        'GB-ENG'
      )
    })

    test('passes null country when session user has unmapped nationId', async () => {
      vi.spyOn(getSessionUserModule, 'getSessionUser').mockReturnValue({
        nationId: 99
      })
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
          column: 'DateSubmitted',
          direction: 'desc',
          baseUrl:
            '/certificates-of-compliance?type=direct-producers&tab=pending&page=1'
        }
      })

      await inject(
        '/certificates-of-compliance?type=direct-producers&tab=pending'
      )

      expect(
        listService.getCertificatesOfComplianceViewModel
      ).toHaveBeenCalledWith(
        'direct-producers',
        'pending',
        1,
        'DateSubmitted',
        'desc',
        expect.objectContaining({ country: null })
      )
    })
  })

  describe('Query parameter validation', () => {
    test('Should return 400 for an unknown organisation type', async () => {
      const { statusCode } = await inject(
        '/certificates-of-compliance?type=banana'
      )

      expect(statusCode).toBe(statusCodes.badRequest)
    })

    test('Should return 400 for an unknown submission status', async () => {
      const { statusCode } = await inject(
        '/certificates-of-compliance?tab=banana'
      )

      expect(statusCode).toBe(statusCodes.badRequest)
    })

    test.each(['direct-producers', 'compliance-schemes'])(
      'Should accept the valid organisation type %s',
      async (type) => {
        const { statusCode } = await inject(
          `/certificates-of-compliance?type=${type}`
        )

        expect(statusCode).toBe(statusCodes.ok)
      }
    )

    test.each(['pending', 'accepted', 'not-submitted'])(
      'Should accept the valid submission status %s',
      async (tab) => {
        const { statusCode } = await inject(
          `/certificates-of-compliance?tab=${tab}`
        )

        expect(statusCode).toBe(statusCodes.ok)
      }
    )
  })

  // These rules used to live in the frontend's own diff and were unit-tested
  // against it. The unsubmitted endpoint owns them now, so they are asserted
  // through the whole stack — store, handler, client, mapper, template — which is
  // the only place left that can honestly exercise them.
  describe('not-submitted membership', () => {
    test('Should list an organisation whose only declaration was cancelled', async () => {
      app.given([
        { name: 'Cancelled Only Ltd', status: 'cancelled' },
        { name: 'Never Submitted Ltd', status: 'not-submitted' },
        { name: 'Pending Ltd', status: 'pending' }
      ])

      const { payload } = await inject(
        '/certificates-of-compliance?type=direct-producers&tab=not-submitted'
      )

      expect(payload).toContain('Cancelled Only Ltd')
      expect(payload).toContain('Never Submitted Ltd')
      expect(payload).not.toContain('Pending Ltd')
    })

    test('Should count an organisation once even when it holds several declarations', async () => {
      app.given([
        {
          name: 'Resubmitted Ltd',
          status: 'pending',
          history: [{ status: 'cancelled' }]
        },
        { name: 'Never Submitted Ltd', status: 'not-submitted' }
      ])

      const { payload } = await inject(
        '/certificates-of-compliance?type=direct-producers&tab=not-submitted'
      )
      const $ = load(payload)

      expect($('table tbody tr')).toHaveLength(1)
      expect(payload).toContain('Never Submitted Ltd')
    })
  })

  // The page number and sort column now travel to the API instead of being
  // applied to an in-memory list, so a junk value has to be resolved before it
  // gets there or the tab 500s.
  describe('not-submitted request hardening', () => {
    test.each(['abc', '0', '-1'])(
      'Should fall back to page 1 for the invalid page value %s',
      async (page) => {
        const { statusCode } = await inject(
          `/certificates-of-compliance?type=direct-producers&tab=not-submitted&page=${page}`
        )

        expect(statusCode).toBe(statusCodes.ok)
      }
    )

    test.each(['DateSubmitted[desc]', 'Regulation43[asc]', 'Nonsense[asc]'])(
      'Should fall back to the default sort for the unsupported column %s',
      async (sort) => {
        const { statusCode } = await inject(
          `/certificates-of-compliance?type=direct-producers&tab=not-submitted&sort=${sort}`
        )

        expect(statusCode).toBe(statusCodes.ok)
      }
    )
  })
})
