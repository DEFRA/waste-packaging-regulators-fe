import { nunjucksTestEnv } from '#test-helpers/component-helpers.js'
import { load } from 'cheerio'

describe('Sorting Column Header Component', () => {
  test.each([
    [true, 'testColumnName', 'Test column name', 'ascending', 'testColumnName'],
    [true, 'testColumnName', 'Test column name', 'descending', 'testColumnName'],
    [false, 'testColumnName', 'Test column name', 'ascending', 'testColumnName'],
    [false, 'testColumnName', 'Test column name', 'descending', 'testColumnName'],
    [true, 'testColumnName', 'Test column name', 'ascending', 'column2Name'],
    [true, 'testColumnName', 'Test column name', 'descending', 'column2Name'],
    [false, 'testColumnName', 'Test column name', 'ascending', 'column2Name'],
    [false, 'testColumnName', 'Test column name', 'descending', 'column2Name'],
  ])('When first column = %s, column name = %s, column label = %s, sort direction = %s, sort column = %s', (firstColumn, columnName, columnLabel, sortDirection, sortColumn) => {
    const params = {
      firstColumn,
      columnName,
      columnLabel,
      sort: {
        direction: sortDirection,
        column: sortColumn,
        baseUrl: '/test-base-url'
      }
    }

    const html = nunjucksTestEnv.renderString(`
      {% from "sorting-column-header/macro.njk" import appSortingColumnHeader %}
      <table><tr>{{ appSortingColumnHeader(params) }}</tr></table>
    `, { params })

    const $ = load(html)

    expect($('th')).toHaveLength(1)
    expect($('th').hasClass('govuk-table__header')).toBe(true)
    expect($('th').hasClass(`govuk-!-width-one-quarter`)).toBe(firstColumn)
    expect($('a').text()).toContain(columnLabel)

    if (columnName === sortColumn) {
      expect($('th').attr('aria-sort')).toBe(sortDirection)
      expect($('path')).toHaveLength(1)
      expect($('path').attr('desc')).toContain(columnLabel)
      expect($('path').attr('desc')).toContain(sortDirection)
    } else {
      expect($('th').attr('aria-sort')).toBe('none')
      expect($('path')).toHaveLength(2)
    }
  })
});