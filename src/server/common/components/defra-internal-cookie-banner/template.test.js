import { renderComponent } from '../../../../../test-helpers/component-helpers.js'

describe('Defra Internal Cookie Banner Component', () => {
  const renderCookieBanner = (params) => {
    return renderComponent('defra-internal-cookie-banner', params, null, {
      macroName: 'defraInternalCookieBanner'
    })
  }

  const baseParams = {
    hideCookieBanner: false,
    hasCookiePolicy: false,
    cookiePreferenceSet: false,
    allowGoogleAnalytics: false,
    CSRFToken: 'test-csrf-token',
    serviceName: "pEPR: Regulators' Service",
    locale: 'en',
    bannerActionUrl: '/cookies/banner',
    hideBannerActionUrl: '/cookies/hide-banner',
    cookiesUrl: '/cookies'
  }

  test('Should not render anything when hideCookieBanner is true', () => {
    const $ = renderCookieBanner({
      ...baseParams,
      hideCookieBanner: true
    })

    expect($('.govuk-cookie-banner')).toHaveLength(0)
    expect($('form')).toHaveLength(0)
  })

  test('Should not render anything when hasCookiePolicy is true and cookiePreferenceSet is false', () => {
    const $ = renderCookieBanner({
      ...baseParams,
      hasCookiePolicy: true,
      cookiePreferenceSet: false
    })

    expect($('.govuk-cookie-banner')).toHaveLength(0)
    expect($('form')).toHaveLength(0)
  })

  test('Should render initial cookie consent form when hasCookiePolicy and cookiePreferenceSet are false', () => {
    const $ = renderCookieBanner(baseParams)

    const form = $('form')
    expect(form).toHaveLength(1)
    expect(form.attr('action')).toBe('/cookies/banner')
    expect(form.attr('method')).toBe('post')

    const csrfInput = form.find('#cookie-banner-csrf-crumb')
    expect(csrfInput).toHaveLength(1)
    expect(csrfInput.attr('value')).toBe('test-csrf-token')

    const banner = $('.govuk-cookie-banner')
    expect(banner).toHaveLength(1)
    expect(banner.attr('aria-label')).toBe(
      "Cookies on pEPR: Regulators' Service"
    )
    expect(banner.find('.govuk-cookie-banner__heading').text().trim()).toBe(
      "Cookies on pEPR: Regulators' Service"
    )

    const buttons = banner.find('button')
    expect(buttons).toHaveLength(2)
    expect(buttons.eq(0).text().trim()).toBe('Accept analytics cookies')
    expect(buttons.eq(0).attr('name')).toBe('analytics')
    expect(buttons.eq(0).attr('value')).toBe('yes')
    expect(buttons.eq(1).text().trim()).toBe('Reject analytics cookies')
    expect(buttons.eq(1).attr('name')).toBe('analytics')
    expect(buttons.eq(1).attr('value')).toBe('no')

    const viewCookiesLink = banner.find('a.govuk-link')
    expect(viewCookiesLink.text().trim()).toBe('View cookies')
    expect(viewCookiesLink.attr('href')).toBe('/cookies')
  })

  test('Should render accepted confirmation banner when cookiePreferenceSet is true and allowGoogleAnalytics is true', () => {
    const $ = renderCookieBanner({
      ...baseParams,
      hasCookiePolicy: true,
      cookiePreferenceSet: true,
      allowGoogleAnalytics: true
    })

    const form = $('form')
    expect(form).toHaveLength(1)
    expect(form.attr('action')).toBe('/cookies/hide-banner')

    const csrfInput = form.find('#cookie-hide-banner-csrf-crumb')
    expect(csrfInput).toHaveLength(1)
    expect(csrfInput.attr('value')).toBe('test-csrf-token')

    const banner = $('.govuk-cookie-banner')
    expect(banner).toHaveLength(1)
    expect(banner.text()).toContain('You’ve accepted analytics cookies.')
    expect(banner.find('a.govuk-link').attr('href')).toBe('/cookies')

    const hideButton = banner.find('button')
    expect(hideButton).toHaveLength(1)
    expect(hideButton.text().trim()).toBe('Hide cookie message')
    expect(hideButton.attr('name')).toBe('cookies[hide]')
    expect(hideButton.attr('value')).toBe('hide')
  })

  test('Should render rejected confirmation banner when cookiePreferenceSet is true and allowGoogleAnalytics is false', () => {
    const $ = renderCookieBanner({
      ...baseParams,
      hasCookiePolicy: true,
      cookiePreferenceSet: true,
      allowGoogleAnalytics: false
    })

    const banner = $('.govuk-cookie-banner')
    expect(banner).toHaveLength(1)
    expect(banner.text()).toContain('You’ve rejected analytics cookies.')
    expect(banner.find('a.govuk-link').attr('href')).toBe('/cookies')
  })
})
