import { vi } from 'vitest'

import { forwardedPrefixRedirects } from './forwarded-prefix-redirects.js'

function createServerStub() {
  const handlers = []

  return {
    ext: vi.fn((event, handler) => {
      handlers.push({ event, handler })
    }),
    handlers
  }
}

describe('forwarded-prefix-redirects plugin', () => {
  test('prefixes a local redirect location', () => {
    const server = createServerStub()
    forwardedPrefixRedirects.plugin.register(server)
    const handler = server.handlers[0].handler
    const response = {
      statusCode: 302,
      headers: { location: '/signin-oidc?lang=cy' },
      header: vi.fn()
    }
    const h = { continue: Symbol('continue') }

    const result = handler(
      {
        headers: { 'x-forwarded-prefix': '/certificates-of-compliance' },
        response
      },
      h
    )

    expect(response.header).toHaveBeenCalledWith(
      'location',
      '/certificates-of-compliance/signin-oidc?lang=cy'
    )
    expect(result).toBe(h.continue)
  })

  test('prefixes the root redirect to the prefix path', () => {
    const server = createServerStub()
    forwardedPrefixRedirects.plugin.register(server)
    const handler = server.handlers[0].handler
    const response = {
      statusCode: 302,
      headers: { location: '/' },
      header: vi.fn()
    }

    handler(
      {
        headers: { 'x-forwarded-prefix': '/certificates-of-compliance' },
        response
      },
      { continue: Symbol('continue') }
    )

    expect(response.header).toHaveBeenCalledWith(
      'location',
      '/certificates-of-compliance'
    )
  })

  test('does not double-prefix an already-prefixed location', () => {
    const server = createServerStub()
    forwardedPrefixRedirects.plugin.register(server)
    const handler = server.handlers[0].handler
    const response = {
      statusCode: 302,
      headers: { location: '/certificates-of-compliance/list' },
      header: vi.fn()
    }

    handler(
      {
        headers: { 'x-forwarded-prefix': '/certificates-of-compliance' },
        response
      },
      { continue: Symbol('continue') }
    )

    expect(response.header).not.toHaveBeenCalled()
  })

  test('does not alter an external redirect location', () => {
    const server = createServerStub()
    forwardedPrefixRedirects.plugin.register(server)
    const handler = server.handlers[0].handler
    const response = {
      statusCode: 302,
      headers: { location: 'https://example.com/Account/SignIn' },
      header: vi.fn()
    }

    handler(
      {
        headers: { 'x-forwarded-prefix': '/certificates-of-compliance' },
        response
      },
      { continue: Symbol('continue') }
    )

    expect(response.header).not.toHaveBeenCalled()
  })

  test('does not alter a non-redirect response', () => {
    const server = createServerStub()
    forwardedPrefixRedirects.plugin.register(server)
    const handler = server.handlers[0].handler
    const response = {
      statusCode: 200,
      headers: { location: '/signin-oidc' },
      header: vi.fn()
    }

    handler(
      {
        headers: { 'x-forwarded-prefix': '/certificates-of-compliance' },
        response
      },
      { continue: Symbol('continue') }
    )

    expect(response.header).not.toHaveBeenCalled()
  })

  test('does not prefix when no x-forwarded-prefix header is present', () => {
    const server = createServerStub()
    forwardedPrefixRedirects.plugin.register(server)
    const handler = server.handlers[0].handler
    const response = {
      statusCode: 302,
      headers: { location: '/signin-oidc' },
      header: vi.fn()
    }

    handler(
      {
        headers: {},
        response,
        path: '/certificates-of-compliance/signin-oidc'
      },
      { continue: Symbol('continue') }
    )

    expect(response.header).not.toHaveBeenCalled()
  })
})
