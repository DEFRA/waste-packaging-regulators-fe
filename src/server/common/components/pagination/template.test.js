import { fileURLToPath } from 'node:url'
import path from 'path'
import nunjucks from 'nunjucks'
import { load } from 'cheerio'
import { translate } from '#server/common/helpers/i18n/translate.js'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const nunjucksEnv = nunjucks.configure(
  [path.normalize(path.resolve(dirname, '..'))],
  { trimBlocks: true, lstripBlocks: true }
)

nunjucksEnv.addGlobal('t', (locale, key, params = {}) =>
  translate(locale ?? 'en', key, params)
)

function renderPagination(pagination, locale = 'en') {
  return load(
    nunjucksEnv.render('pagination/template.njk', { pagination, locale })
  )
}

describe('Pagination component', () => {
  test('Should not render when totalPages is 1', () => {
    const $ = renderPagination({
      totalPages: 1,
      currentPage: 1,
      baseUrl: '/foo'
    })

    expect($('.govuk-pagination').length).toBe(0)
  })

  test('Should render when totalPages is greater than 1', () => {
    const $ = renderPagination({
      totalPages: 3,
      currentPage: 1,
      baseUrl: '/foo'
    })

    expect($('.govuk-pagination').length).toBe(1)
  })

  test('Should not show previous link on page 1', () => {
    const $ = renderPagination({
      totalPages: 3,
      currentPage: 1,
      baseUrl: '/foo'
    })

    expect($('[rel="prev"]').length).toBe(0)
  })

  test('Should show previous link on pages after the first', () => {
    const $ = renderPagination({
      totalPages: 3,
      currentPage: 2,
      baseUrl: '/foo'
    })

    expect($('[rel="prev"]').length).toBe(1)
  })

  test('Should not show next link on the last page', () => {
    const $ = renderPagination({
      totalPages: 3,
      currentPage: 3,
      baseUrl: '/foo'
    })

    expect($('[rel="next"]').length).toBe(0)
  })

  test('Should show next link when not on the last page', () => {
    const $ = renderPagination({
      totalPages: 3,
      currentPage: 2,
      baseUrl: '/foo'
    })

    expect($('[rel="next"]').length).toBe(1)
  })

  test('Should show both previous and next links on a middle page', () => {
    const $ = renderPagination({
      totalPages: 6,
      currentPage: 3,
      baseUrl: '/foo'
    })

    expect($('[rel="prev"]').length).toBe(1)
    expect($('[rel="next"]').length).toBe(1)
  })

  test('Should render a page number link for each page where there are less than 7 total pages', () => {
    const $ = renderPagination({
      totalPages: 4,
      currentPage: 1,
      baseUrl: '/foo'
    })

    expect($('.govuk-pagination__list .govuk-pagination__link').length).toBe(4)
  })

  test.each([
    [9, 1, 4, 3, 0, false, true],
    [9, 2, 5, 4, 1, false, true],
    [9, 3, 6, 5, 2, false, true],
    [9, 4, 7, 6, 3, false, true],
    [9, 5, 7, 5, 3, true, true],
    [9, 6, 7, 6, 3, true, false],
    [9, 7, 6, 5, 3, true, false],
    [9, 8, 5, 4, 3, true, false],
    [9, 9, 4, 3, 3, true, false],
    [7, 4, 7, 7, 3, false, false],
    [8, 4, 7, 6, 3, false, true]
  ])(
    '%i total pages, current page = %i should have %i pagination items of which %i are links and the %i (0 based index) link is the current page. previous ellipsis = %s, next ellipsis = %s',
    (
      totalPages,
      currentPage,
      numPaginationItems,
      numPaginationLinks,
      currentPageIndex,
      previousEllipsis,
      nextEllipsis
    ) => {
      const $ = renderPagination({
        totalPages,
        currentPage,
        baseUrl: '/foo'
      })

      const paginationItems = $(
        '.govuk-pagination__list .govuk-pagination__item'
      )

      expect(paginationItems.length).toBe(numPaginationItems)
      expect($('.govuk-pagination__list .govuk-pagination__link').length).toBe(
        numPaginationLinks
      )
      expect(paginationItems[currentPageIndex].attribs.class).toContain(
        'govuk-pagination__item--current'
      )

      if (previousEllipsis) {
        expect(paginationItems[1].attribs.class).toContain(
          'govuk-pagination__item--ellipsis'
        )
      } else {
        expect(paginationItems[1].attribs.class).not.toContain(
          'govuk-pagination__item--ellipsis'
        )
      }

      if (nextEllipsis) {
        expect(
          paginationItems[paginationItems.length - 2].attribs.class
        ).toContain('govuk-pagination__item--ellipsis')
      } else {
        expect(
          paginationItems[paginationItems.length - 2].attribs.class
        ).not.toContain('govuk-pagination__item--ellipsis')
      }
    }
  )

  test('Should mark the current page as active', () => {
    const $ = renderPagination({
      totalPages: 3,
      currentPage: 2,
      baseUrl: '/foo'
    })

    expect($('.govuk-pagination__item--current').text().trim()).toBe('2')
  })

  test('Should include baseUrl and page param in pagination links', () => {
    const $ = renderPagination({
      totalPages: 3,
      currentPage: 2,
      baseUrl:
        '/certificates-of-compliance?type=compliance-schemes&amp;tab=pending'
    })

    const prevHref = $('[rel="prev"]').attr('href')
    const nextHref = $('[rel="next"]').attr('href')

    expect(prevHref).toContain(
      '/certificates-of-compliance?type=compliance-schemes'
    )
    expect(prevHref).toContain('&page=1')
    expect(nextHref).toContain('&page=3')
  })
})
