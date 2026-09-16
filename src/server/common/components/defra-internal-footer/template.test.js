import { renderComponent } from '../../../../../test-helpers/component-helpers.js'

describe('Defra Internal Footer Component', () => {
  let $footer

  const renderFooter = (params) => {
    return renderComponent('defra-internal-footer', params, null, {
      macroName: 'defraInternalFooter'
    })
  }

  describe('Default', () => {
    beforeEach(() => {
      $footer = renderFooter({})
    })

    test('Should render footer component', () => {
      expect($footer('.defra-internal-footer')).toHaveLength(1)
    })

    test('Should render licence by default', () => {
      expect($footer('.govuk-footer__licence-logo')).toHaveLength(1)
      expect($footer('.govuk-footer__licence-description').text()).toContain(
        'Open Government Licence v3.0'
      )
    })

    test('Should render copyright by default', () => {
      expect($footer('.govuk-footer__copyright-logo').text()).toContain(
        '© Crown copyright'
      )
    })

    test('Should not render getHelp, meta, or links if not provided', () => {
      expect($footer('.govuk-heading-s').text()).not.toContain('Get help')
      expect($footer('.govuk-footer__inline-list')).toHaveLength(0)
    })
  })

  describe('With custom params', () => {
    beforeEach(() => {
      $footer = renderFooter({
        getHelp: {
          email: 'test@example.com',
          telephone: '01234 567890',
          hours: 'Monday to Friday, 9am to 5pm'
        },
        meta: 'This is a test service.',
        links: [
          { text: 'Privacy Policy', href: '/privacy' },
          { text: 'Terms and Conditions', href: '/terms' }
        ],
        licence: false,
        copyright: false
      })
    })

    test('Should not render licence if licence is false', () => {
      expect($footer('.govuk-footer__licence-logo')).toHaveLength(0)
    })

    test('Should not render copyright if copyright is false', () => {
      expect($footer('.govuk-footer__copyright-logo')).toHaveLength(0)
    })

    test('Should render getHelp block', () => {
      const getHelpText = $footer('h2:contains("Get help")').parent().text()
      expect(getHelpText).toContain('Get help')
      expect(getHelpText).toContain('test@example.com')
      expect(getHelpText).toContain('01234 567890')
      expect(getHelpText).toContain('Monday to Friday, 9am to 5pm')
    })

    test('Should render meta text', () => {
      expect($footer('.govuk-footer__meta-item--grow').text()).toContain(
        'This is a test service.'
      )
    })

    test('Should render links', () => {
      const listItems = $footer('.govuk-footer__inline-list-item a')
      expect(listItems).toHaveLength(2)

      expect(listItems.eq(0).text()).toBe('Privacy Policy')
      expect(listItems.eq(0).attr('href')).toBe('/privacy')

      expect(listItems.eq(1).text()).toBe('Terms and Conditions')
      expect(listItems.eq(1).attr('href')).toBe('/terms')
    })
  })
})
