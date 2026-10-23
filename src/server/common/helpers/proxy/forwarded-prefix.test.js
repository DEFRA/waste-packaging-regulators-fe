import { vi } from 'vitest'
import {
  applyForwardedPrefixToCookiePath,
  getExternalPublicPath,
  getForwardedPrefix,
  getProxyPrefix,
  rewriteDirectPrefix,
  withForwardedPrefix
} from './forwarded-prefix.js'

function createRequest(prefix, path = '/', app = {}) {
  return {
    path,
    headers: prefix === undefined ? {} : { 'x-forwarded-prefix': prefix },
    app
  }
}

describe('forwarded prefix helpers', () => {
  describe('rewriteDirectPrefix', () => {
    test('rewrites /certificates-of-compliance to / and sets request.app.inferredPrefix', () => {
      const request = {
        path: '/certificates-of-compliance',
        url: {
          pathname: '/certificates-of-compliance',
          search: '?type=direct-producers'
        },
        app: {},
        setUrl: vi.fn()
      }
      const h = { continue: Symbol('continue') }

      const result = rewriteDirectPrefix(request, h)

      expect(result).toBe(h.continue)
      expect(request.app.inferredPrefix).toBe('/certificates-of-compliance')
      expect(request.setUrl).toHaveBeenCalledWith('/?type=direct-producers')
    })

    test('rewrites exact /certificates-of-compliance with trailing slash', () => {
      const request = {
        path: '/certificates-of-compliance/',
        url: { pathname: '/certificates-of-compliance/', search: '' },
        app: {},
        setUrl: vi.fn()
      }
      const h = { continue: Symbol('continue') }

      const result = rewriteDirectPrefix(request, h)

      expect(result).toBe(h.continue)
      expect(request.app.inferredPrefix).toBe('/certificates-of-compliance')
      expect(request.setUrl).toHaveBeenCalledWith('/')
    })

    test('rewrites nested /certificates-of-compliance paths', () => {
      const request = {
        path: '/certificates-of-compliance/org-1/certificate/decl-1',
        url: {
          pathname: '/certificates-of-compliance/org-1/certificate/decl-1',
          search: ''
        },
        app: {},
        setUrl: vi.fn()
      }
      const h = { continue: Symbol('continue') }

      const result = rewriteDirectPrefix(request, h)

      expect(result).toBe(h.continue)
      expect(request.app.inferredPrefix).toBe('/certificates-of-compliance')
      expect(request.setUrl).toHaveBeenCalledWith('/org-1/certificate/decl-1')
    })

    test('leaves non-prefixed paths unchanged', () => {
      const request = {
        path: '/health',
        url: { pathname: '/health', search: '' },
        app: {},
        setUrl: vi.fn()
      }
      const h = { continue: Symbol('continue') }

      const result = rewriteDirectPrefix(request, h)

      expect(result).toBe(h.continue)
      expect(request.app.inferredPrefix).toBeUndefined()
      expect(request.setUrl).not.toHaveBeenCalled()
    })

    test('does not rewrite unrelated paths that start with the prefix string', () => {
      const request = {
        path: '/certificates-of-compliance-other',
        url: { pathname: '/certificates-of-compliance-other', search: '' },
        app: {},
        setUrl: vi.fn()
      }
      const h = { continue: Symbol('continue') }

      const result = rewriteDirectPrefix(request, h)

      expect(result).toBe(h.continue)
      expect(request.app.inferredPrefix).toBeUndefined()
      expect(request.setUrl).not.toHaveBeenCalled()
    })
  })

  describe('getForwardedPrefix', () => {
    test('returns a valid proxy prefix without trailing slashes', () => {
      expect(
        getForwardedPrefix(createRequest('/certificates-of-compliance///'))
      ).toBe('/certificates-of-compliance')
    })

    test.each([
      undefined,
      '',
      '/',
      'certificates-of-compliance',
      '//certificates-of-compliance',
      '/certificates-of-compliance/..',
      '/certificates-of-compliance?q=1',
      '/certificates-of-compliance, /another-path'
    ])('ignores an invalid forwarded prefix: %s', (prefix) => {
      expect(getForwardedPrefix(createRequest(prefix))).toBe('')
    })

    test('returns prefix when request.app.inferredPrefix is set', () => {
      const request = createRequest(undefined, '/', {
        inferredPrefix: '/certificates-of-compliance'
      })
      expect(getForwardedPrefix(request)).toBe('/certificates-of-compliance')
    })

    test('infers prefix from a request path nested under /certificates-of-compliance', () => {
      expect(
        getForwardedPrefix(
          createRequest(undefined, '/certificates-of-compliance/list')
        )
      ).toBe('/certificates-of-compliance')
    })

    test('infers prefix from the exact /certificates-of-compliance path', () => {
      expect(
        getForwardedPrefix(
          createRequest(undefined, '/certificates-of-compliance')
        )
      ).toBe('/certificates-of-compliance')
    })

    test('returns empty string for an unrecognised path when no header is present', () => {
      expect(getForwardedPrefix(createRequest(undefined, '/home'))).toBe('')
    })
  })

  describe('getExternalPublicPath', () => {
    test('returns /public when no proxy header is present', () => {
      expect(
        getExternalPublicPath(
          createRequest(undefined, '/certificates-of-compliance/list')
        )
      ).toBe('/public')
    })

    test('prefixes /public when X-Forwarded-Prefix is set', () => {
      expect(
        getExternalPublicPath(createRequest('/certificates-of-compliance'))
      ).toBe('/certificates-of-compliance/public')
    })
  })

  describe('getProxyPrefix', () => {
    test('returns a valid proxy prefix from the header', () => {
      expect(getProxyPrefix(createRequest('/certificates-of-compliance'))).toBe(
        '/certificates-of-compliance'
      )
    })

    test('returns empty string when no header is present, even if path matches', () => {
      expect(
        getProxyPrefix(
          createRequest(undefined, '/certificates-of-compliance/list')
        )
      ).toBe('')
    })

    test('returns empty string for an invalid header value', () => {
      expect(getProxyPrefix(createRequest('https://attacker.example'))).toBe('')
    })
  })

  describe('withForwardedPrefix', () => {
    test('adds the prefix to application-local rooted paths', () => {
      const request = createRequest('/certificates-of-compliance')

      expect(withForwardedPrefix(request, '/signin-oidc?lang=cy')).toBe(
        '/certificates-of-compliance/signin-oidc?lang=cy'
      )
    })

    test('collapses root path to the prefix without a trailing slash', () => {
      const request = createRequest('/certificates-of-compliance')

      expect(withForwardedPrefix(request, '/')).toBe(
        '/certificates-of-compliance'
      )
    })

    test('does not double-prefix an already-prefixed path', () => {
      const request = createRequest('/certificates-of-compliance')

      expect(
        withForwardedPrefix(request, '/certificates-of-compliance/list')
      ).toBe('/certificates-of-compliance/list')
    })

    test('does not alter external or protocol-relative URLs', () => {
      const request = createRequest('/certificates-of-compliance')

      expect(withForwardedPrefix(request, 'https://example.com/sign-in')).toBe(
        'https://example.com/sign-in'
      )
      expect(withForwardedPrefix(request, '//example.com/sign-in')).toBe(
        '//example.com/sign-in'
      )
    })
  })

  describe('applyForwardedPrefixToCookiePath', () => {
    test('scopes a cookie to the proxy prefix when the header is set', () => {
      const definition = { path: '/' }

      applyForwardedPrefixToCookiePath(
        definition,
        createRequest('/certificates-of-compliance')
      )

      expect(definition.path).toBe('/certificates-of-compliance')
    })

    test('preserves the cookie path for direct access (no header)', () => {
      const definition = { path: '/' }

      applyForwardedPrefixToCookiePath(definition, createRequest())

      expect(definition.path).toBe('/')
    })

    test('preserves the cookie path when the prefix is inferred from the path but no header is set', () => {
      const definition = { path: '/' }

      applyForwardedPrefixToCookiePath(
        definition,
        createRequest(undefined, '/certificates-of-compliance/list')
      )

      expect(definition.path).toBe('/')
    })

    test('preserves the cookie path for an invalid proxy prefix', () => {
      const definition = { path: '/' }

      applyForwardedPrefixToCookiePath(
        definition,
        createRequest('https://attacker.example')
      )

      expect(definition.path).toBe('/')
    })
  })
})
