import {
  defaultSessionCookieTtlMs,
  fourHoursMs,
  thirtySecondsMs
} from './default-session-cookie-ttl.js'

describe('#defaultSessionCookieTtlMs', () => {
  it('returns 30 seconds for production with real B2C', () => {
    expect(
      defaultSessionCookieTtlMs({
        NODE_ENV: 'production',
        MOCK_AUTH: 'false'
      })
    ).toBe(thirtySecondsMs)
  })

  it('returns 30 seconds for production when MOCK_AUTH is unset', () => {
    expect(
      defaultSessionCookieTtlMs({
        NODE_ENV: 'production'
      })
    ).toBe(thirtySecondsMs)
  })

  it('returns 4 hours when MOCK_AUTH is true', () => {
    expect(
      defaultSessionCookieTtlMs({
        NODE_ENV: 'production',
        MOCK_AUTH: 'true'
      })
    ).toBe(fourHoursMs)
  })

  it('returns 4 hours for non-production when MOCK_AUTH is not false', () => {
    expect(
      defaultSessionCookieTtlMs({
        NODE_ENV: 'development'
      })
    ).toBe(fourHoursMs)
  })
})
