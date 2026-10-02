import { describe, expect, it, vi } from 'vitest'
import {
  enrichRegulatorSessionUser,
  getSessionUser
} from './get-session-user.js'

function makeRequest({ user, profile } = {}) {
  const store = { user }
  return {
    yar: {
      id: user === undefined ? null : 'session-id',
      get: (key) => store[key] ?? null,
      set: vi.fn((key, value) => {
        store[key] = value
      })
    },
    auth: profile ? { credentials: { profile } } : null
  }
}

describe('get-session-user.js', () => {
  it('getSessionUser returns null when yar is not initialised', () => {
    expect(getSessionUser({ yar: {} })).toBeNull()
  })

  it('enrichRegulatorSessionUser merges Bell profile oid and email into the session user', () => {
    const request = makeRequest({
      user: {
        firstName: 'Jane',
        lastName: 'Smith',
        contactEmail: 'jane.smith@test.gov.uk'
      },
      profile: {
        oid: '33333333-3333-4333-8333-333333333333',
        email: 'jane@example.com'
      }
    })

    const enriched = enrichRegulatorSessionUser(request)

    expect(enriched).toEqual(
      expect.objectContaining({
        id: '33333333-3333-4333-8333-333333333333',
        email: 'jane@example.com'
      })
    )
    expect(request.yar.set).toHaveBeenCalledWith('user', enriched)
  })

  it('enrichRegulatorSessionUser uses stored authProfile when Bell credentials are absent', () => {
    const request = makeRequest({
      user: {
        firstName: 'Jane',
        lastName: 'Smith',
        authProfile: {
          sub: '44444444-4444-4444-8444-444444444444',
          emails: ['stored@example.com']
        }
      }
    })

    const enriched = enrichRegulatorSessionUser(request)

    expect(enriched?.id).toBe('44444444-4444-4444-8444-444444444444')
    expect(enriched?.email).toBe('stored@example.com')
  })
})
