import {
  buildPageViewModel,
  clearLocaleCacheForTests,
  pageI18n,
  seedLocaleDictionaryForTests,
  translate,
  translateComponent
} from './translate.js'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const en = require('#server/locales/en.json')

describe('translate', () => {
  beforeEach(() => {
    clearLocaleCacheForTests()
  })

  test('returns English string for known key', () => {
    expect(translate('en', 'common.serviceName')).toBe(en.common.serviceName)
  })

  test('interpolates params', () => {
    expect(
      translate('en', 'certificatesOfCompliance.list.relevantYearCaption', {
        complianceYear: '2026'
      })
    ).toBe('2026 relevant year')
  })

  test('falls back to English when Welsh key missing', () => {
    expect(translate('cy', 'common.serviceName')).toBe(en.common.serviceName)
  })

  test('falls back to English when Welsh value is blank', () => {
    clearLocaleCacheForTests()
    seedLocaleDictionaryForTests('cy', {
      common: { serviceName: '   ' }
    })

    expect(translate('cy', 'common.serviceName')).toBe(en.common.serviceName)
  })

  test('uses Welsh translation when present in cy.json', () => {
    expect(translate('cy', 'common.nav.home')).toBe('Hafan')
  })

  test('returns raw key when missing from both locales', () => {
    expect(translate('en', 'missing.key.path')).toBe('missing.key.path')
  })

  test('pageI18n scopes keys to page namespace', () => {
    const i18n = pageI18n('en', 'certificatesOfCompliance.list')
    expect(i18n.t('heading')).toBe(
      'View certificates and statements of compliance'
    )
  })

  test('translateComponent resolves shared component keys', () => {
    expect(
      translateComponent(
        'en',
        'certificatesOfCompliance.list',
        'statusTag',
        'met'
      )
    ).toBe('Met')
  })

  test('pageI18n ct and ck resolve component keys', () => {
    const i18n = pageI18n('en', 'certificatesOfCompliance.list')

    expect(i18n.ct('statusTag', 'met')).toBe('Met')
    expect(i18n.ck('statusTag', 'met')).toBe(
      'compliance.components.statusTag.met'
    )
  })

  test('buildPageViewModel reads page title and heading from locale', () => {
    const viewModel = buildPageViewModel(
      { query: { lang: 'en' }, headers: {}, yar: { get: () => null } },
      'home'
    )

    expect(viewModel).toEqual({
      pageTitle: 'Home',
      heading: 'Home'
    })
  })
})
