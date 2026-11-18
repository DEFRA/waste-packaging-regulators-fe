import { describe, expect, test } from 'vitest'

import { getRegulatorCaseManagementNation } from './regulator-case-management-nation.js'

describe('getRegulatorCaseManagementNation', () => {
  test('maps EA nationId 1 to ENGLAND', () => {
    expect(getRegulatorCaseManagementNation({ nationId: 1 })).toBe('ENGLAND')
  })

  test('maps NIEA nationId 2 to N_IRELAND', () => {
    expect(getRegulatorCaseManagementNation({ nationId: 2 })).toBe('N_IRELAND')
  })

  test('maps SEPA nationId 3 to SCOTLAND', () => {
    expect(getRegulatorCaseManagementNation({ nationId: 3 })).toBe('SCOTLAND')
  })

  test('maps NRW nationId 4 to WALES', () => {
    expect(getRegulatorCaseManagementNation({ nationId: 4 })).toBe('WALES')
  })

  test('returns null when nationId is missing or unknown', () => {
    expect(getRegulatorCaseManagementNation(null)).toBeNull()
    expect(getRegulatorCaseManagementNation({})).toBeNull()
    expect(getRegulatorCaseManagementNation({ nationId: 99 })).toBeNull()
  })
})
