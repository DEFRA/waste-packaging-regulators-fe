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

  test('Should render a page number link for each page', () => {
    const $ = renderPagination({
      totalPages: 4,
      currentPage: 1,
      baseUrl: '/foo'
    })

    expect($('.govuk-pagination__list .govuk-pagination__item').length).toBe(4)
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
