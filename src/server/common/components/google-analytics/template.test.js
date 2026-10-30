import { renderComponent } from '../../../../../test-helpers/component-helpers.js'

describe('Google Analytics Component', () => {
  const baseParams = {
    ga4: 'G-TEST1234',
    gtm: 'GTM-TEST5678',
    useGoogleAnalytics: true,
    allowGoogleAnalytics: false,
    cspNonce: 'test-nonce-123'
  }

  describe('Head scripts (default)', () => {
    test('Should not render anything when ga4 is missing', () => {
      const $ = renderComponent('google-analytics', {
        ...baseParams,
        ga4: ''
      })

      expect($('script')).toHaveLength(0)
    })

    test('Should not render anything when gtm is missing', () => {
      const $ = renderComponent('google-analytics', {
        ...baseParams,
        gtm: ''
      })

      expect($('script')).toHaveLength(0)
    })

    test('Should not render anything when useGoogleAnalytics is false', () => {
      const $ = renderComponent('google-analytics', {
        ...baseParams,
        useGoogleAnalytics: false
      })

      expect($('script')).toHaveLength(0)
    })

    test('Should render GA4 and GTM scripts with default denied consent when allowGoogleAnalytics is false', () => {
      const $ = renderComponent('google-analytics', baseParams)
      const scripts = $('script')

      expect(scripts).toHaveLength(4)
      expect(scripts.eq(0).attr('nonce')).toBe('test-nonce-123')
      expect(scripts.eq(0).html()).toContain("gtag('consent', 'default'")
      expect(scripts.eq(0).html()).not.toContain("gtag('consent', 'update'")

      expect(scripts.eq(1).attr('src')).toBe(
        'https://www.googletagmanager.com/gtag/js?id=G-TEST1234'
      )
      expect(scripts.eq(1).attr('nonce')).toBe('test-nonce-123')

      expect(scripts.eq(2).attr('nonce')).toBe('test-nonce-123')
      expect(scripts.eq(2).html()).toContain("gtag('config', 'G-TEST1234')")

      expect(scripts.eq(3).attr('nonce')).toBe('test-nonce-123')
      expect(scripts.eq(3).html()).toContain("'GTM-TEST5678'")
      expect(scripts.eq(3).html()).toContain(
        "j.setAttribute('nonce', 'test-nonce-123')"
      )
    })

    test('Should include consent update when allowGoogleAnalytics is true', () => {
      const $ = renderComponent('google-analytics', {
        ...baseParams,
        allowGoogleAnalytics: true
      })
      const scripts = $('script')

      expect(scripts).toHaveLength(4)
      expect(scripts.eq(0).html()).toContain("gtag('consent', 'update'")
      expect(scripts.eq(0).html()).toContain("'analytics_storage': 'granted'")
    })
  })

  describe('Noscript iframe (noscript: true)', () => {
    test('Should render noscript iframe when allowGoogleAnalytics, ga4, gtm, and useGoogleAnalytics are truthy', () => {
      const $ = renderComponent('google-analytics', {
        ...baseParams,
        allowGoogleAnalytics: true,
        noscript: true
      })

      const noscript = $('noscript')
      expect(noscript).toHaveLength(1)
      expect(noscript.html()).toContain(
        'src="https://www.googletagmanager.com/ns.html?id=GTM-TEST5678"'
      )
      expect($('script')).toHaveLength(0)
    })

    test('Should not render noscript when allowGoogleAnalytics is false', () => {
      const $ = renderComponent('google-analytics', {
        ...baseParams,
        allowGoogleAnalytics: false,
        noscript: true
      })

      expect($('noscript')).toHaveLength(0)
    })

    test('Should not render noscript when useGoogleAnalytics is false', () => {
      const $ = renderComponent('google-analytics', {
        ...baseParams,
        allowGoogleAnalytics: true,
        useGoogleAnalytics: false,
        noscript: true
      })

      expect($('noscript')).toHaveLength(0)
    })
  })
})
