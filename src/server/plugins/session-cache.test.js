import { config } from '#config/config.js'

import { sessionCache } from './session-cache.js'

describe('#sessionCache', () => {
  it('defaults the session cookie ttl to 10 seconds', () => {
    expect(config.default('session.cookie.ttl')).toBe(10000)
  })

  it('applies the configured session cookie ttl to the yar cookie', () => {
    expect(sessionCache.options.cookieOptions.ttl).toBe(
      config.get('session.cookie.ttl')
    )
  })
})
