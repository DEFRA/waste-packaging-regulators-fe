import { renderComponent } from '#test-helpers/component-helpers.js'

describe('Status Tag Component', () => {
  test.each([
    [true, 'govuk-tag--green', 'Pending'],
    [false, 'govuk-tag--red', 'Rejected']
  ])('When value = %s', (value, expectedClass, expectedText) => {
    const $ = renderComponent('status-tag', {
      trueText: 'Pending',
      falseText: 'Rejected',
      value
    })

    expect($('strong').hasClass(expectedClass)).toBe(true)
    expect($('strong').text().trim()).toBe(expectedText)
  })

  test('renders bare "No data" text (no tag) when value is null', () => {
    const $ = renderComponent('status-tag', {
      trueText: 'Pending',
      falseText: 'Rejected',
      value: null
    })

    expect($('strong')).toHaveLength(0)
    expect($.root().text().trim()).toBe('No data')
  })
})
