import { renderComponent } from '#test-helpers/component-helpers.js'

describe('Producer Subnavigation Component', () => {
  test('renders nav with default aria-label and no items when params are empty', () => {
    const $ = renderComponent('producer-subnavigation', {})

    const nav = $(
      'nav.moj-sub-navigation.govuk-\\!-margin-bottom-5.govuk-\\!-margin-top-6'
    )
    expect(nav).toHaveLength(1)
    expect(nav.attr('aria-label')).toBe('Sub navigation')
    expect($('ul.moj-sub-navigation__list')).toHaveLength(1)
    expect($('li.moj-sub-navigation__item')).toHaveLength(0)
  })

  test('renders custom ariaLabel when provided', () => {
    const $ = renderComponent('producer-subnavigation', {
      ariaLabel: 'Filter by producer type'
    })

    expect($('nav').attr('aria-label')).toBe('Filter by producer type')
  })

  test.each([
    [
      'single item',
      [
        {
          text: 'Direct producers',
          href: '/?type=direct-producers',
          current: true
        }
      ],
      1,
      ['Direct producers']
    ],
    [
      'two items with current on second item',
      [
        { text: 'Direct producers', href: '/?type=direct-producers' },
        {
          text: 'Compliance schemes',
          href: '/?type=compliance-schemes',
          current: true
        }
      ],
      2,
      ['Compliance schemes']
    ],
    [
      'four items',
      [
        { text: 'One', href: '/one', current: false },
        { text: 'Two', href: '/two', current: true },
        { text: 'Three', href: '/three' },
        { text: 'Four', href: '/four', current: true }
      ],
      4,
      ['Two', 'Four']
    ]
  ])(
    'renders %s dynamically from items array',
    (_label, items, expectedCount, expectedCurrentTexts) => {
      const $ = renderComponent('producer-subnavigation', { items })

      const listItems = $('li.moj-sub-navigation__item')
      expect(listItems).toHaveLength(expectedCount)

      items.forEach((item, index) => {
        const link = listItems.eq(index).find('a.moj-sub-navigation__link')
        expect(link).toHaveLength(1)
        expect(link.text().trim()).toBe(item.text)
        expect(link.attr('href')).toBe(item.href)
      })

      const currentLinks = $('a.moj-sub-navigation__link[aria-current="page"]')
      expect(currentLinks).toHaveLength(expectedCurrentTexts.length)
      expectedCurrentTexts.forEach((text, index) => {
        expect(currentLinks.eq(index).text().trim()).toBe(text)
      })
    }
  )
})
