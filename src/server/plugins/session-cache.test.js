import { config } from '#config/config.js'
import { fourHoursMs } from '#config/default-session-cookie-ttl.js'

import { sessionCache } from './session-cache.js'

describe('#sessionCache', () => {
  it('defaults the session cookie ttl to 4 hours under test and mock auth', () => {
    expect(config.default('session.cookie.ttl')).toBe(fourHoursMs)
  })

  it('applies the configured session cookie ttl to the yar cookie', () => {
    expect(sessionCache.options.cookieOptions.ttl).toBe(
      config.get('session.cookie.ttl')
    )
  })
})
