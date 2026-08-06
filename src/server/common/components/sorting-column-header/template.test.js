import { nunjucksTestEnv } from '#test-helpers/component-helpers.js'
import { load } from 'cheerio'

describe('Sorting Column Header Component', () => {
  test.each([
    [true, 'testColumnName', 'Test column name', 'asc', 'testColumnName', true],
    [
      true,
      'testColumnName',
      'Test column name',
      'desc',
      'testColumnName',
      true
    ],
    [
      false,
      'testColumnName',
      'Test column name',
      'asc',
      'testColumnName',
      true
    ],
    [
      false,
      'testColumnName',
      'Test column name',
      'desc',
      'testColumnName',
      true
    ],
    [true, 'testColumnName', 'Test column name', 'asc', 'column2Name', true],
    [true, 'testColumnName', 'Test column name', 'desc', 'column2Name', true],
    [false, 'testColumnName', 'Test column name', 'asc', 'column2Name', true],
    [false, 'testColumnName', 'Test column name', 'desc', 'column2Name', true],
    [true, 'testColumnName', 'Test column name', 'asc', 'column2Name', false],
    [true, 'testColumnName', 'Test column name', 'desc', 'column2Name', false],
    [false, 'testColumnName', 'Test column name', 'asc', 'column2Name', false],
    [false, 'testColumnName', 'Test column name', 'desc', 'column2Name', false]
  ])(
    'When first column = %s, column name = %s, column label = %s, sort direction = %s, sort column = %s, is sortable = %s',
    (
      firstColumn,
      columnName,
      columnLabel,
      sortDirection,
      sortColumn,
      sortable
    ) => {
      const params = {
        firstColumn,
        columnName,
        columnLabel,
        sort: {
          direction: sortDirection,
          column: sortColumn,
          baseUrl: '/test-base-url'
        },
        sortable
      }

      const html = nunjucksTestEnv.renderString(
        `
      {% from "sorting-column-header/macro.njk" import appSortingColumnHeader %}
      <table><tr>{{ appSortingColumnHeader(params) }}</tr></table>
    `,
        { params }
      )

      const $ = load(html)

      expect($('th')).toHaveLength(1)
      expect($('th').hasClass('govuk-table__header')).toBe(true)
      expect($('th').hasClass(`govuk-!-width-one-quarter`)).toBe(firstColumn)
      expect($('th').text()).toContain(columnLabel)

      if (sortable) {
        expect($('a')).toHaveLength(1)

        if (columnName === sortColumn) {
          expect($('th').attr('aria-sort')).toBe(
            sortDirection === 'asc' ? 'ascending' : 'descending'
          )
          expect($('path')).toHaveLength(1)
          expect($('path').attr('desc')).toContain(columnLabel)
          expect($('path').attr('desc')).toContain(sortDirection)
        } else {
          expect($('th').attr('aria-sort')).toBe('none')
          expect($('path')).toHaveLength(2)
        }
      } else {
        expect($('th').attr('aria-sort')).toBe('none')
        expect($('a')).toHaveLength(0)
        expect($('path')).toHaveLength(0)
      }
    }
  )
})
