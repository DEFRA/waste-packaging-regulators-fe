import { fileURLToPath } from 'node:url'
import path from 'path'
import nunjucks from 'nunjucks'
import { load } from 'cheerio'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const nunjucksEnv = nunjucks.configure(
  [path.normalize(path.resolve(dirname, '..'))],
  { trimBlocks: true, lstripBlocks: true }
)

function renderPagination(pagination) {
  return load(nunjucksEnv.render('pagination/template.njk', { pagination }))
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

  test('Should render first two page number links, an ellipsis, and last page number link where there are more than 6 total pages and current page is 1', () => {
    const $ = renderPagination({
      totalPages: 9,
      currentPage: 1,
      baseUrl: '/foo'
    })

    const paginationItems = $('.govuk-pagination__list .govuk-pagination__item')

    expect(paginationItems.length).toBe(4)
    expect($('.govuk-pagination__list .govuk-pagination__link').length).toBe(3)
    expect(paginationItems[0].attribs.class).toContain(
      'govuk-pagination__item--current'
    )
    expect(paginationItems[1].attribs.class).not.toContain(
      'govuk-pagination__item--ellipsis'
    )
    expect(paginationItems[paginationItems.length - 2].attribs.class).toContain(
      'govuk-pagination__item--ellipsis'
    )
  })

  test('Should render first three page number links, an ellipsis, and last page number link where there are more than 6 total pages and current page is 2', () => {
    const $ = renderPagination({
      totalPages: 9,
      currentPage: 2,
      baseUrl: '/foo'
    })

    const paginationItems = $('.govuk-pagination__list .govuk-pagination__item')

    expect(paginationItems.length).toBe(5)
    expect($('.govuk-pagination__list .govuk-pagination__link').length).toBe(4)
    expect(paginationItems[1].attribs.class).toContain(
      'govuk-pagination__item--current'
    )
    expect(paginationItems[1].attribs.class).not.toContain(
      'govuk-pagination__item--ellipsis'
    )
    expect(paginationItems[paginationItems.length - 2].attribs.class).toContain(
      'govuk-pagination__item--ellipsis'
    )
  })

  test('Should render first four page number links, an ellipsis, and last page number link where there are more than 6 total pages and current page is 3', () => {
    const $ = renderPagination({
      totalPages: 9,
      currentPage: 3,
      baseUrl: '/foo'
    })

    const paginationItems = $('.govuk-pagination__list .govuk-pagination__item')

    expect(paginationItems.length).toBe(6)
    expect($('.govuk-pagination__list .govuk-pagination__link').length).toBe(5)
    expect(paginationItems[2].attribs.class).toContain(
      'govuk-pagination__item--current'
    )
    expect(paginationItems[1].attribs.class).not.toContain(
      'govuk-pagination__item--ellipsis'
    )
    expect(paginationItems[paginationItems.length - 2].attribs.class).toContain(
      'govuk-pagination__item--ellipsis'
    )
  })

  test('Should render first four page number links, no ellipses, and last four page number links where there are 7 total pages and current page is the middle', () => {
    const $ = renderPagination({
      totalPages: 7,
      currentPage: 4,
      baseUrl: '/foo'
    })

    const paginationItems = $('.govuk-pagination__list .govuk-pagination__item')

    expect(paginationItems.length).toBe(7)
    expect($('.govuk-pagination__list .govuk-pagination__link').length).toBe(7)
    expect(paginationItems[3].attribs.class).toContain(
      'govuk-pagination__item--current'
    )
    expect(paginationItems[1].attribs.class).not.toContain(
      'govuk-pagination__item--ellipsis'
    )
    expect(
      paginationItems[paginationItems.length - 2].attribs.class
    ).not.toContain('govuk-pagination__item--ellipsis')
  })

  test('Should render first four page number links, an ellipsis, and last page number link where there are 8 total pages and current page is the middle', () => {
    const $ = renderPagination({
      totalPages: 8,
      currentPage: 4,
      baseUrl: '/foo'
    })

    const paginationItems = $('.govuk-pagination__list .govuk-pagination__item')

    expect(paginationItems.length).toBe(7)
    expect($('.govuk-pagination__list .govuk-pagination__link').length).toBe(6)
    expect(paginationItems[3].attribs.class).toContain(
      'govuk-pagination__item--current'
    )
    expect(paginationItems[1].attribs.class).not.toContain(
      'govuk-pagination__item--ellipsis'
    )
    expect(paginationItems[paginationItems.length - 2].attribs.class).toContain(
      'govuk-pagination__item--ellipsis'
    )
  })

  test('Should render first page number link, an ellipsis, and last four page numbers link where there are at least 6 total pages and current page is 4 and not middle', () => {
    const $ = renderPagination({
      totalPages: 9,
      currentPage: 4,
      baseUrl: '/foo'
    })

    const paginationItems = $('.govuk-pagination__list .govuk-pagination__item')

    expect(paginationItems.length).toBe(7)
    expect($('.govuk-pagination__list .govuk-pagination__link').length).toBe(6)
    expect(paginationItems[3].attribs.class).toContain(
      'govuk-pagination__item--current'
    )
    expect(paginationItems[1].attribs.class).not.toContain(
      'govuk-pagination__item--ellipsis'
    )
    expect(paginationItems[paginationItems.length - 2].attribs.class).toContain(
      'govuk-pagination__item--ellipsis'
    )
  })

  test('Should render first page number link, an ellipsis, current page with one either side, an ellipsis and last number link where there are more than 6 total pages and current page is more than 3 from either end', () => {
    const $ = renderPagination({
      totalPages: 9,
      currentPage: 5,
      baseUrl: '/foo'
    })

    const paginationItems = $('.govuk-pagination__list .govuk-pagination__item')

    expect(paginationItems.length).toBe(7)
    expect($('.govuk-pagination__list .govuk-pagination__link').length).toBe(5)
    expect(paginationItems[3].attribs.class).toContain(
      'govuk-pagination__item--current'
    )
    expect(paginationItems[1].attribs.class).toContain(
      'govuk-pagination__item--ellipsis'
    )
    expect(paginationItems[paginationItems.length - 2].attribs.class).toContain(
      'govuk-pagination__item--ellipsis'
    )
  })

  test('Should render first page number link, an ellipsis, and last four page number links where there are more than 6 total pages and current page is 3 from the end', () => {
    const $ = renderPagination({
      totalPages: 9,
      currentPage: 6,
      baseUrl: '/foo'
    })

    const paginationItems = $('.govuk-pagination__list .govuk-pagination__item')

    expect(paginationItems.length).toBe(7)
    expect($('.govuk-pagination__list .govuk-pagination__link').length).toBe(6)
    expect(paginationItems[3].attribs.class).toContain(
      'govuk-pagination__item--current'
    )
    expect(paginationItems[1].attribs.class).toContain(
      'govuk-pagination__item--ellipsis'
    )
    expect(
      paginationItems[paginationItems.length - 2].attribs.class
    ).not.toContain('govuk-pagination__item--ellipsis')
  })

  test('Should render first page number link, an ellipsis, and last three page number links where there are more than 6 total pages and current page is 2 from the end', () => {
    const $ = renderPagination({
      totalPages: 9,
      currentPage: 7,
      baseUrl: '/foo'
    })

    const paginationItems = $('.govuk-pagination__list .govuk-pagination__item')

    expect(paginationItems.length).toBe(6)
    expect($('.govuk-pagination__list .govuk-pagination__link').length).toBe(5)
    expect(paginationItems[3].attribs.class).toContain(
      'govuk-pagination__item--current'
    )
    expect(paginationItems[1].attribs.class).toContain(
      'govuk-pagination__item--ellipsis'
    )
    expect(
      paginationItems[paginationItems.length - 2].attribs.class
    ).not.toContain('govuk-pagination__item--ellipsis')
  })

  test('Should render first page number link, an ellipsis, and last three page number links where there are more than 6 total pages and current page is 1 from the end', () => {
    const $ = renderPagination({
      totalPages: 9,
      currentPage: 8,
      baseUrl: '/foo'
    })

    const paginationItems = $('.govuk-pagination__list .govuk-pagination__item')

    expect(paginationItems.length).toBe(5)
    expect($('.govuk-pagination__list .govuk-pagination__link').length).toBe(4)
    expect(paginationItems[3].attribs.class).toContain(
      'govuk-pagination__item--current'
    )
    expect(paginationItems[1].attribs.class).toContain(
      'govuk-pagination__item--ellipsis'
    )
    expect(
      paginationItems[paginationItems.length - 2].attribs.class
    ).not.toContain('govuk-pagination__item--ellipsis')
  })

  test('Should render first page number link, an ellipsis, and last two page number links where there are more than 6 total pages and current page is the last', () => {
    const $ = renderPagination({
      totalPages: 9,
      currentPage: 9,
      baseUrl: '/foo'
    })

    const paginationItems = $('.govuk-pagination__list .govuk-pagination__item')

    expect(paginationItems.length).toBe(4)
    expect($('.govuk-pagination__list .govuk-pagination__link').length).toBe(3)
    expect(paginationItems[3].attribs.class).toContain(
      'govuk-pagination__item--current'
    )
    expect(paginationItems[1].attribs.class).toContain(
      'govuk-pagination__item--ellipsis'
    )
    expect(
      paginationItems[paginationItems.length - 2].attribs.class
    ).not.toContain('govuk-pagination__item--ellipsis')
  })

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
