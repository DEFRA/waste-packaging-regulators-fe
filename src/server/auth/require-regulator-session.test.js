import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('#config/config.js', () => ({
  config: { get: vi.fn() }
}))

vi.mock(
  '#server/routes/certificatesOfCompliance/detail/actions-controller.js',
  () => ({
    redirectToSignIn: vi.fn(() => 'redirect-response')
  })
)

import { config } from '#config/config.js'
import { redirectToSignIn } from '#server/routes/certificatesOfCompliance/detail/actions-controller.js'
import { requireRegulatorSession } from './require-regulator-session.js'

function mockConfig({ useMockAuth = false, revalidationTtlMs = 10000 } = {}) {
  config.get.mockImplementation((key) => {
    if (key === 'useMockAuth') {
      return useMockAuth
    }
    if (key === 'auth.revalidationTtlMs') {
      return revalidationTtlMs
    }
    return undefined
  })
}

describe('requireRegulatorSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects to sign-in when yar has no user', () => {
    mockConfig()
    const request = {
      yar: {
        get: vi.fn(() => null),
        clear: vi.fn()
      }
    }

    expect(requireRegulatorSession(request, {})).toBe('redirect-response')
    expect(redirectToSignIn).toHaveBeenCalledWith(request, {})
  })

  it('returns null when user is present and revalidation is disabled', () => {
    mockConfig({ revalidationTtlMs: 0 })
    const request = {
      yar: {
        get: vi.fn((key) => (key === 'user' ? { id: 'u1' } : undefined)),
        clear: vi.fn()
      }
    }

    expect(requireRegulatorSession(request, {})).toBeNull()
    expect(redirectToSignIn).not.toHaveBeenCalled()
  })

  it('redirects when authValidatedAt is older than the revalidation TTL', () => {
    mockConfig({ revalidationTtlMs: 10000 })
    const request = {
      yar: {
        get: vi.fn((key) => {
          if (key === 'user') {
            return { id: 'u1' }
          }
          if (key === 'authValidatedAt') {
            return Date.now() - 20000
          }
          return undefined
        }),
        clear: vi.fn()
      }
    }

    expect(requireRegulatorSession(request, {})).toBe('redirect-response')
    expect(request.yar.clear).toHaveBeenCalledWith('user')
  })

  it('returns null when auth was validated within the TTL window', () => {
    mockConfig({ revalidationTtlMs: 10000 })
    const request = {
      yar: {
        get: vi.fn((key) => {
          if (key === 'user') {
            return { id: 'u1' }
          }
          if (key === 'authValidatedAt') {
            return Date.now() - 5000
          }
          return undefined
        }),
        clear: vi.fn()
      }
    }

    expect(requireRegulatorSession(request, {})).toBeNull()
  })

  it('skips revalidation TTL when mock auth is enabled', () => {
    mockConfig({ useMockAuth: true, revalidationTtlMs: 10000 })
    const request = {
      yar: {
        get: vi.fn((key) => {
          if (key === 'user') {
            return { id: 'u1' }
          }
          if (key === 'authValidatedAt') {
            return Date.now() - 20000
          }
          return undefined
        }),
        clear: vi.fn()
      }
    }

    expect(requireRegulatorSession(request, {})).toBeNull()
  })
})
