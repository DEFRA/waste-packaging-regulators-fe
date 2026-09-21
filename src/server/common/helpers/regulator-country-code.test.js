import { describe, expect, test } from 'vitest'

import { getRegulatorCountryCode } from './regulator-country-code.js'

describe('getRegulatorCountryCode', () => {
  test('maps EA nationId 1 to GB-ENG', () => {
    expect(getRegulatorCountryCode({ nationId: 1 })).toBe('GB-ENG')
  })

  test('maps NIEA nationId 2 to GB-NIR', () => {
    expect(getRegulatorCountryCode({ nationId: 2 })).toBe('GB-NIR')
  })

  test('maps SEPA nationId 3 to GB-SCT', () => {
    expect(getRegulatorCountryCode({ nationId: 3 })).toBe('GB-SCT')
  })

  test('maps NRW nationId 4 to GB-WLS', () => {
    expect(getRegulatorCountryCode({ nationId: 4 })).toBe('GB-WLS')
  })

  test('returns null when nationId is missing or unknown', () => {
    expect(getRegulatorCountryCode({})).toBeNull()
    expect(getRegulatorCountryCode(null)).toBeNull()
    expect(getRegulatorCountryCode({ nationId: 99 })).toBeNull()
  })
})
