import { renderComponent } from '../../../../../test-helpers/component-helpers.js'

describe('Defra Internal Service Header Component', () => {
  const renderServiceHeader = (params) => {
    return renderComponent('defra-internal-service-header', params, null, {
      macroName: 'defraInternalServiceHeader'
    })
  }

  const baseParams = {
    serviceName: "pEPR: Regulators' Service",
    serviceUrl: '/home',
    navigation: [
      { text: 'Home', href: '/home', current: true },
      { text: 'About', href: '/about', current: false }
    ],
    regulatorContext:
      '<div class="defra-internal-service-navigation__context">Environment Agency</div>',
    locale: 'en',
    languageSwitcher: {
      en: '/home?lang=en',
      cy: '/home?lang=cy'
    }
  }

  describe('English locale (default)', () => {
    let $serviceHeader

    beforeEach(() => {
      $serviceHeader = renderServiceHeader(baseParams)
    })

    test('Should render service header wrapper', () => {
      expect($serviceHeader('.defra-internal-service-header')).toHaveLength(1)
    })

    test('Should render service navigation with serviceName, serviceUrl, and navigation items', () => {
      const serviceLink = $serviceHeader(
        '.govuk-service-navigation__service-name a'
      )
      expect(serviceLink.text().trim()).toBe("pEPR: Regulators' Service")
      expect(serviceLink.attr('href')).toBe('/home')

      const navLinks = $serviceHeader('.govuk-service-navigation__wrapper li a')
      expect(navLinks).toHaveLength(2)
      expect(navLinks.eq(0).text().trim()).toBe('Home')
      expect(navLinks.eq(0).attr('href')).toBe('/home')
      expect(navLinks.eq(0).attr('aria-current')).toBe('page')
      expect(navLinks.eq(1).text().trim()).toBe('About')
      expect(navLinks.eq(1).attr('href')).toBe('/about')
    })

    test('Should render regulatorContext in the service navigation end slot', () => {
      const context = $serviceHeader(
        '.defra-internal-service-navigation__context'
      )
      expect(context).toHaveLength(1)
      expect(context.text().trim()).toBe('Environment Agency')
    })

    test('Should render English as active span and Welsh as link when locale is en', () => {
      const nav = $serviceHeader('.language-toggle-nav')
      expect(nav.attr('aria-label')).toBe('Language')

      const options = $serviceHeader('.language-toggle__option')
      expect(options).toHaveLength(2)

      const enSpan = options.eq(0).find('span.language-toggle__active')
      expect(enSpan).toHaveLength(1)
      expect(enSpan.attr('lang')).toBe('en')
      expect(enSpan.text().trim()).toBe('English')
      expect(options.eq(0).find('a')).toHaveLength(0)

      const cyLink = options.eq(1).find('a')
      expect(cyLink).toHaveLength(1)
      expect(cyLink.attr('href')).toBe('/home?lang=cy')
      expect(cyLink.attr('lang')).toBe('cy')
      expect(cyLink.text().trim()).toBe('Cymraeg')
    })
  })

  describe('Welsh locale (cy)', () => {
    test('Should render English as link and Welsh as active span when locale is cy', () => {
      const $serviceHeader = renderServiceHeader({
        ...baseParams,
        locale: 'cy'
      })

      const options = $serviceHeader('.language-toggle__option')
      expect(options).toHaveLength(2)

      const enLink = options.eq(0).find('a')
      expect(enLink).toHaveLength(1)
      expect(enLink.attr('href')).toBe('/home?lang=en')
      expect(enLink.attr('lang')).toBe('en')
      expect(enLink.text().trim()).toBe('English')

      const cySpan = options.eq(1).find('span.language-toggle__active')
      expect(cySpan).toHaveLength(1)
      expect(cySpan.attr('lang')).toBe('cy')
      expect(cySpan.text().trim()).toBe('Cymraeg')
      expect(options.eq(1).find('a')).toHaveLength(0)
    })
  })
})
