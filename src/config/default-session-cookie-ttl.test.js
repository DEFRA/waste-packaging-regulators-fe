import {
  defaultSessionCookieTtlMs,
  fourHoursMs,
  tenSecondsMs
} from './default-session-cookie-ttl.js'

describe('#defaultSessionCookieTtlMs', () => {
  it('returns 10 seconds for production with real B2C', () => {
    expect(
      defaultSessionCookieTtlMs({
        NODE_ENV: 'production',
        MOCK_AUTH: 'false'
      })
    ).toBe(tenSecondsMs)
  })

  it('returns 10 seconds for production when MOCK_AUTH is unset', () => {
    expect(
      defaultSessionCookieTtlMs({
        NODE_ENV: 'production'
      })
    ).toBe(tenSecondsMs)
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
