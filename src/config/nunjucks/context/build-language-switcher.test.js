import { buildLanguageSwitcherUrls } from './build-language-switcher.js'

describe('buildLanguageSwitcherUrls', () => {
  test('builds English and Welsh URLs preserving query params', () => {
    const request = {
      path: '/certificates-of-compliance',
      url: { search: '?type=direct-producers&tab=pending' }
    }

    expect(buildLanguageSwitcherUrls(request)).toEqual({
      en: '/certificates-of-compliance?type=direct-producers&tab=pending&lang=en',
      cy: '/certificates-of-compliance?type=direct-producers&tab=pending&lang=cy'
    })
  })

  test('defaults path to root when missing', () => {
    expect(buildLanguageSwitcherUrls({})).toEqual({
      en: '/?lang=en',
      cy: '/?lang=cy'
    })
  })
})
