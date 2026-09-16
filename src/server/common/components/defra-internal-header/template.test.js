import { renderComponent } from '../../../../../test-helpers/component-helpers.js'

describe('Defra Internal Header Component', () => {
  let $header

  const renderHeader = (params) => {
    return renderComponent('defra-internal-header', params, null, {
      macroName: 'defraInternalHeader'
    })
  }

  describe('Default', () => {
    beforeEach(() => {
      $header = renderHeader({})
    })

    test('Should render header component', () => {
      expect($header('.defra-internal-header')).toHaveLength(1)
    })

    test('Should render default organisation name', () => {
      const link = $header('.defra-internal-header__logo-link')
      expect(link.html()).toContain(
        'Department for Environment,<br>Food &amp; Rural Affairs'
      )
    })

    test('Should link to default homepageUrl', () => {
      const link = $header('.defra-internal-header__logo-link')
      expect(link.attr('href')).toBe('/')
    })

    test('Should not render navigation menu if none provided', () => {
      expect($header('.defra-internal-header__account-menu')).toHaveLength(0)
    })
  })

  describe('With custom params', () => {
    beforeEach(() => {
      $header = renderHeader({
        organisationName: 'Custom Org',
        homepageUrl: '/custom',
        navigation: [
          { text: 'User Name' },
          {
            text: 'Sign out',
            href: '/logout',
            current: true,
            visuallyHiddenText: 'Sign out of '
          }
        ]
      })
    })

    test('Should render custom organisation name', () => {
      const link = $header('.defra-internal-header__logo-link')
      expect(link.html()).toContain('Custom Org')
    })

    test('Should link to custom homepageUrl', () => {
      const link = $header('.defra-internal-header__logo-link')
      expect(link.attr('href')).toBe('/custom')
    })

    test('Should render navigation menu', () => {
      expect($header('.defra-internal-header__account-menu')).toHaveLength(1)
      const listItems = $header('.defra-internal-header__account-menu li')
      expect(listItems).toHaveLength(2)

      // First item: text only
      expect(listItems.eq(0).text().trim()).toBe('User Name')
      expect(listItems.eq(0).find('a')).toHaveLength(0)

      // Second item: link with current, visually hidden text
      const link = listItems.eq(1).find('a')
      expect(link).toHaveLength(1)
      expect(link.attr('href')).toBe('/logout')
      expect(link.attr('aria-current')).toBe('page')
      expect(link.find('.govuk-visually-hidden').text()).toBe('Sign out of ')
      expect(link.text().trim()).toBe('Sign out of Sign out')
    })
  })
})
