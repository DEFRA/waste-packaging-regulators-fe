import { describe, test, expect, vi } from 'vitest'

import {
  MOCK_AUTH_USER_OIDS,
  resolveMockAccountUser,
  resolveMockAuthProfile
} from './mock-auth-users.js'

describe('resolveMockAuthProfile', () => {
  test('returns the English EA regulator by default', () => {
    expect(resolveMockAuthProfile({ query: {} })).toEqual({
      oid: MOCK_AUTH_USER_OIDS.en,
      email: 'mock-user@test.local'
    })
  })

  test('returns the English EA regulator when lang=cy is on the sign-in request', () => {
    expect(resolveMockAuthProfile({ query: { lang: 'cy' } })).toEqual({
      oid: MOCK_AUTH_USER_OIDS.en,
      email: 'mock-user@test.local'
    })
  })

  test('returns the Welsh NRW regulator when MOCK_AUTH_USER=cy', () => {
    vi.stubEnv('MOCK_AUTH_USER', 'cy')

    expect(resolveMockAuthProfile({ query: {} })).toEqual({
      oid: MOCK_AUTH_USER_OIDS.cy,
      email: 'elin.evans@cyfoethnaturiolcymru.gov.uk'
    })

    vi.unstubAllEnvs()
  })

  test('returns the Scottish SEPA regulator when MOCK_AUTH_USER=sct', () => {
    vi.stubEnv('MOCK_AUTH_USER', 'sct')

    expect(resolveMockAuthProfile({ query: {} })).toEqual({
      oid: MOCK_AUTH_USER_OIDS.sct,
      email: 'fiona.macleod@sepa.org.uk'
    })

    vi.unstubAllEnvs()
  })

  test('returns the Northern Ireland NIEA regulator when MOCK_AUTH_USER=nir', () => {
    vi.stubEnv('MOCK_AUTH_USER', 'nir')

    expect(resolveMockAuthProfile({ query: {} })).toEqual({
      oid: MOCK_AUTH_USER_OIDS.nir,
      email: 'patrick.oneill@daera-ni.gov.uk'
    })

    vi.unstubAllEnvs()
  })

  test('ignores authLocale in the session', () => {
    const request = {
      query: {},
      yar: { get: (key) => (key === 'authLocale' ? 'cy' : null) }
    }

    expect(resolveMockAuthProfile(request).oid).toBe(MOCK_AUTH_USER_OIDS.en)
  })
})

describe('resolveMockAccountUser', () => {
  test('returns the Welsh account profile for the Welsh mock oid', () => {
    const user = resolveMockAccountUser(MOCK_AUTH_USER_OIDS.cy)

    expect(user.organisations[0]).toEqual({
      name: 'Natural Resources Wales',
      nationId: 4
    })
  })

  test('returns the Scottish account profile for the Scottish mock oid', () => {
    const user = resolveMockAccountUser(MOCK_AUTH_USER_OIDS.sct)

    expect(user.organisations[0]).toEqual({
      name: 'Scottish Environment Protection Agency',
      nationId: 3
    })
  })

  test('returns the Northern Ireland account profile for the NIEA mock oid', () => {
    const user = resolveMockAccountUser(MOCK_AUTH_USER_OIDS.nir)

    expect(user.organisations[0]).toEqual({
      name: 'Northern Ireland Environment Agency',
      nationId: 2
    })
  })

  test('falls back to the English account profile for unknown oids', () => {
    const user = resolveMockAccountUser('unknown-user-id')

    expect(user.organisations[0].nationId).toBe(1)
  })
})
