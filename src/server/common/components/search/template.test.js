import { renderComponent } from '#test-helpers/component-helpers.js'

describe('Search Component', () => {
  const baseParams = {
    hiddenFields: {
      type: 'direct-producers',
      tab: 'pending',
      sort: 'DateSubmitted[desc]'
    },
    label: 'Search by organisation name or ID',
    searchTerm: 'acme'
  }

  test('renders sensible defaults when called with empty params', () => {
    const $ = renderComponent('search', {})

    expect($('.v3-search-panel.govuk-\\!-margin-bottom-4')).toHaveLength(1)
    expect($('search.moj-search')).toHaveLength(1)

    const form = $('form')
    expect(form).toHaveLength(1)
    expect(form.attr('action')).toBe('/')
    expect(form.attr('method')).toBe('get')
    expect(form.attr('novalidate')).toBe('')

    expect($('input[type="hidden"]')).toHaveLength(0)

    expect($('.moj-search__input-wrapper')).toHaveLength(1)

    expect($('label')).toHaveLength(0)

    const input = $('input#search')
    expect(input).toHaveLength(1)
    expect(input.attr('name')).toBe('search')
    expect(input.attr('type')).toBe('search')
    expect(input.attr('value')).toBeUndefined()
    expect(input.hasClass('moj-search__input')).toBe(true)

    const button = $(
      'button.moj-search__button.govuk-\\!-margin-bottom-0.govuk-\\!-margin-left-2'
    )
    expect(button).toHaveLength(1)
    expect(button.text().trim()).toBe('Search')

    expect($('#search-error')).toHaveLength(0)
  })

  test('renders search panel, form, hidden fields, input, and default submit button', () => {
    const $ = renderComponent('search', baseParams)

    expect($('input[type="hidden"][name="lang"]')).toHaveLength(0)
    expect($('input[type="hidden"][name="type"]').attr('value')).toBe(
      'direct-producers'
    )
    expect($('input[type="hidden"][name="tab"]').attr('value')).toBe('pending')
    expect($('input[type="hidden"][name="sort"]').attr('value')).toBe(
      'DateSubmitted[desc]'
    )

    const label = $('label.moj-search__label.govuk-\\!-font-weight-bold')
    expect(label).toHaveLength(1)
    expect(label.attr('for')).toBe('search')
    expect(label.text().trim()).toBe('Search by organisation name or ID')

    const input = $('input#search')
    expect(input.attr('value')).toBe('acme')
  })

  test('renders arbitrary hiddenFields and omits nullish or empty ones', () => {
    const $withFields = renderComponent('search', {
      label: 'Search',
      hiddenFields: {
        year: '2026',
        filter: 'active',
        empty: null,
        missing: undefined
      }
    })

    expect($withFields('input[type="hidden"]')).toHaveLength(2)
    expect($withFields('input[type="hidden"][name="year"]').attr('value')).toBe(
      '2026'
    )
    expect(
      $withFields('input[type="hidden"][name="filter"]').attr('value')
    ).toBe('active')
    expect($withFields('input[type="hidden"][name="empty"]')).toHaveLength(0)
    expect($withFields('input[type="hidden"][name="missing"]')).toHaveLength(0)

    const $emptyFields = renderComponent('search', {
      label: 'Search',
      hiddenFields: {}
    })
    expect($emptyFields('input[type="hidden"]')).toHaveLength(0)

    const $withoutFields = renderComponent('search', {
      label: 'Search'
    })
    expect($withoutFields('input[type="hidden"]')).toHaveLength(0)
  })

  test('renders custom action, id, name, and buttonText', () => {
    const $ = renderComponent('search', {
      ...baseParams,
      action: '/certificates-of-compliance',
      id: 'org-search',
      name: 'query',
      buttonText: 'Find'
    })

    expect($('form').attr('action')).toBe('/certificates-of-compliance')
    expect($('label.moj-search__label').attr('for')).toBe('org-search')
    expect($('input#org-search')).toHaveLength(1)
    expect($('input#org-search').attr('name')).toBe('query')
    expect($('button.moj-search__button').text().trim()).toBe('Find')
  })

  test('renders Welsh hidden lang input and translated button text when locale is cy', () => {
    const $defaultCy = renderComponent('search', {
      ...baseParams,
      locale: 'cy'
    })

    expect($defaultCy('input[type="hidden"][name="lang"]').attr('value')).toBe(
      'cy'
    )
    expect($defaultCy('input[type="hidden"][name="type"]').attr('value')).toBe(
      'direct-producers'
    )
    expect($defaultCy('button.moj-search__button').text().trim()).toBe(
      'Chwilio'
    )

    const $customCy = renderComponent('search', {
      ...baseParams,
      locale: 'cy',
      hiddenFields: {
        ...baseParams.hiddenFields,
        lang: 'en'
      },
      buttonText: 'Canfod'
    })

    expect($customCy('input[type="hidden"][name="lang"]')).toHaveLength(1)
    expect($customCy('input[type="hidden"][name="lang"]').attr('value')).toBe(
      'cy'
    )
    expect($customCy('button.moj-search__button').text().trim()).toBe('Canfod')
  })

  test('renders error message and error styling when errorMessage is provided', () => {
    const $ = renderComponent('search', {
      ...baseParams,
      searchTerm: 'ab',
      errorMessage: { text: 'Enter at least 3 characters' }
    })

    expect($('#search-error').text()).toContain('Enter at least 3 characters')
    expect($('input#search').hasClass('govuk-input--error')).toBe(true)
  })
})
