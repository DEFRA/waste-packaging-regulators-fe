import { describe, it, expect, vi } from 'vitest'
import hapi from '@hapi/hapi'
import {
  SESSION_USER_STRATEGY,
  redirectToSignIn,
  registerSessionUserStrategy,
  sessionUserScheme
} from './session-user.js'

const buildRequest = ({ user = null, search = '', query = {} } = {}) => {
  const store = new Map(user ? [['user', user]] : [])
  return {
    yar: {
      id: 'session-id',
      get: vi.fn((key) => store.get(key) ?? null),
      set: vi.fn((key, value) => store.set(key, value))
    },
    store,
    url: { pathname: '/some/path', search },
    query,
    headers: {}
  }
}

const buildToolkit = () => {
  const takeover = vi.fn(() => 'takeover-response')
  return {
    takeover,
    redirect: vi.fn((url) => ({ url, takeover })),
    authenticated: vi.fn((data) => ({ authenticated: data }))
  }
}

describe('redirectToSignIn', () => {
  it('stores the path and query as returnTo in the session', () => {
    const request = buildRequest({ search: '?tab=pending&page=2' })

    redirectToSignIn(request, buildToolkit())

    expect(request.store.get('returnTo')).toBe('/some/path?tab=pending&page=2')
  })

  it('redirects to /signin-oidc', () => {
    const h = buildToolkit()

    const result = redirectToSignIn(buildRequest(), h)

    expect(h.redirect).toHaveBeenCalledWith('/signin-oidc')
    expect(result.url).toBe('/signin-oidc')
  })

  it('persists Welsh locale and appends lang query', () => {
    const request = buildRequest({ search: '?lang=cy', query: { lang: 'cy' } })
    const h = buildToolkit()

    redirectToSignIn(request, h)

    expect(request.store.get('authLocale')).toBe('cy')
    expect(h.redirect).toHaveBeenCalledWith('/signin-oidc?lang=cy')
  })

  it('prefixes returnTo and the sign-in URL behind the proxy', () => {
    const request = buildRequest()
    request.headers['x-forwarded-prefix'] = '/certificates-of-compliance'
    const h = buildToolkit()

    redirectToSignIn(request, h)

    expect(request.store.get('returnTo')).toBe(
      '/certificates-of-compliance/some/path'
    )
    expect(h.redirect).toHaveBeenCalledWith(
      '/certificates-of-compliance/signin-oidc'
    )
  })
})

describe('sessionUserScheme', () => {
  const { authenticate } = sessionUserScheme()

  it('authenticates with the session user as credentials', () => {
    const user = { id: 'user-1' }
    const h = buildToolkit()

    const result = authenticate(buildRequest({ user }), h)

    expect(h.authenticated).toHaveBeenCalledWith({ credentials: { user } })
    expect(result).toEqual({ authenticated: { credentials: { user } } })
    expect(h.redirect).not.toHaveBeenCalled()
  })

  it('takes over with a sign-in redirect when there is no session user', () => {
    const request = buildRequest()
    const h = buildToolkit()

    const result = authenticate(request, h)

    expect(h.redirect).toHaveBeenCalledWith('/signin-oidc')
    expect(h.takeover).toHaveBeenCalled()
    expect(result).toBe('takeover-response')
    expect(request.store.get('returnTo')).toBe('/some/path')
    expect(h.authenticated).not.toHaveBeenCalled()
  })

  it('takes over with a sign-in redirect when Yar has no session yet', () => {
    const request = buildRequest()
    request.yar.id = undefined
    const h = buildToolkit()

    expect(authenticate(request, h)).toBe('takeover-response')
    expect(h.authenticated).not.toHaveBeenCalled()
  })
})

describe('registerSessionUserStrategy', () => {
  it('registers a strategy routes can require', async () => {
    const server = hapi.server()
    registerSessionUserStrategy(server)
    server.route({
      method: 'GET',
      path: '/guarded',
      options: { auth: SESSION_USER_STRATEGY, handler: () => 'ok' }
    })

    await expect(server.initialize()).resolves.toBeUndefined()
    expect(server.auth.settings.default).toBeNull()
  })
})
