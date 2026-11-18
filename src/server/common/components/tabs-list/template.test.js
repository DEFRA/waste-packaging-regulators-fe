import { renderComponent } from '#test-helpers/component-helpers.js'

describe('Tabs List Component', () => {
  test('renders empty govuk-tabs__list when params are empty', () => {
    const $ = renderComponent('tabs-list', {})

    const list = $('ul.govuk-tabs__list')
    expect(list).toHaveLength(1)
    expect($('li.govuk-tabs__list-item')).toHaveLength(0)
  })

  test.each([
    [
      'single current item',
      [
        {
          text: 'Pending (4)',
          href: '?type=direct-producers&tab=pending&clearSort=true',
          current: true
        }
      ],
      1,
      ['Pending (4)']
    ],
    [
      'multiple items with second item selected',
      [
        {
          text: 'Pending (4)',
          href: '?type=direct-producers&tab=pending&clearSort=true',
          current: false
        },
        {
          text: 'Accepted (2)',
          href: '?type=direct-producers&tab=accepted&clearSort=true',
          current: true
        },
        {
          text: 'Not submitted (1)',
          href: '?type=direct-producers&tab=not-submitted&clearSort=true'
        }
      ],
      3,
      ['Accepted (2)']
    ],
    [
      'multiple items with none selected',
      [
        { text: 'Tab 1', href: '/tab-1' },
        { text: 'Tab 2', href: '/tab-2', current: false }
      ],
      2,
      []
    ]
  ])(
    'renders %s dynamically from items array',
    (_label, items, expectedCount, expectedCurrentTexts) => {
      const $ = renderComponent('tabs-list', { items })

      const listItems = $('li.govuk-tabs__list-item')
      expect(listItems).toHaveLength(expectedCount)

      items.forEach((item, index) => {
        const listItem = listItems.eq(index)
        const link = listItem.find('a.govuk-tabs__tab')

        expect(link).toHaveLength(1)
        expect(link.text()).toBe(item.text)
        expect(link.attr('href')).toBe(item.href)
        expect(listItem.hasClass('govuk-tabs__list-item--selected')).toBe(
          Boolean(item.current)
        )
        expect(link.attr('aria-current')).toBe(
          item.current ? 'page' : undefined
        )
      })

      const currentLinks = $('a.govuk-tabs__tab[aria-current="page"]')
      expect(currentLinks).toHaveLength(expectedCurrentTexts.length)
      expectedCurrentTexts.forEach((text, index) => {
        expect(currentLinks.eq(index).text()).toBe(text)
      })
    }
  )
})
