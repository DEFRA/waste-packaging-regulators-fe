import { statusCodes } from '#server/common/constants/status-codes.js'
import { load } from 'cheerio'
import { vi } from 'vitest'
import * as listService from './list.service.js'
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
          `a[href="./${pendingItem.organisationId}/certificates-of-compliance/${pendingItem.id}"]`
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

      test('Should show the Cancelled tag in grey', async () => {
        app.given(MULTI)
        const { result } = await searchFor('Marlow Producers Ltd')

        expect(result).toEqual(
          expect.stringContaining(
            '<strong class="govuk-tag govuk-tag--grey">Cancelled</strong>'
          )
        )
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
      expect($('a:contains("Clear search")').attr('href')).toBe(
        '/certificates-of-compliance?type=direct-producers&tab=pending&lang=cy'
      )
      expect(
        $('table')
          .first()
          .find(
            `a[href="./${pendingItem.organisationId}/certificates-of-compliance/${pendingItem.id}?lang=cy"]`
          )
      ).toHaveLength(1)
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
})
