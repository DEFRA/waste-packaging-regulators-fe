import { describe, it, expect } from 'vitest'
import {
  BELL_AZURE_AD_B2C_COOKIE,
  getB2cAuthorityPrefix,
  buildB2cLogoutUrl,
  resolvePostLogoutAbsoluteUri
} from './azure-ad-b2c.js'

describe('BELL_AZURE_AD_B2C_COOKIE', () => {
  it('equals bell-azure-ad-b2c', () => {
    expect(BELL_AZURE_AD_B2C_COOKIE).toBe('bell-azure-ad-b2c')
  })
})

describe('getB2cAuthorityPrefix', () => {
  it('returns null when cfg is falsy', () => {
    expect(getB2cAuthorityPrefix(null)).toBeNull()
    expect(getB2cAuthorityPrefix(undefined)).toBeNull()
  })

  it('returns null when config has none of the required fields', () => {
    expect(getB2cAuthorityPrefix({})).toBeNull()
  })

  it('builds prefix from instance + domain + userFlow (strips trailing slash from instance)', () => {
    const cfg = {
      instance: 'https://login.example.com/',
      domain: 'example.onmicrosoft.com',
      userFlow: 'B2C_1_signupsignin'
    }
    expect(getB2cAuthorityPrefix(cfg)).toBe(
      'https://login.example.com/example.onmicrosoft.com/B2C_1_signupsignin'
    )
  })

  it('does not double-strip trailing slash when instance has none', () => {
    const cfg = {
      instance: 'https://login.example.com',
      domain: 'example.onmicrosoft.com',
      userFlow: 'B2C_1_signupsignin'
    }
    expect(getB2cAuthorityPrefix(cfg)).toBe(
      'https://login.example.com/example.onmicrosoft.com/B2C_1_signupsignin'
    )
  })

  it('prefers instance/domain/userFlow over tenantName/userFlow', () => {
    const cfg = {
      instance: 'https://login.example.com',
      domain: 'example.onmicrosoft.com',
      userFlow: 'B2C_1_signupsignin',
      tenantName: 'mytenant'
    }
    expect(getB2cAuthorityPrefix(cfg)).toBe(
      'https://login.example.com/example.onmicrosoft.com/B2C_1_signupsignin'
    )
  })

  it('builds prefix from tenantName + userFlow when instance/domain absent', () => {
    const cfg = { tenantName: 'mytenant', userFlow: 'B2C_1_signupsignin' }
    expect(getB2cAuthorityPrefix(cfg)).toBe(
      'https://mytenant.b2clogin.com/mytenant.onmicrosoft.com/B2C_1_signupsignin'
    )
  })

  it('returns null when only userFlow is provided', () => {
    expect(getB2cAuthorityPrefix({ userFlow: 'B2C_1_signupsignin' })).toBeNull()
  })

  it('returns null when only tenantName is provided', () => {
    expect(getB2cAuthorityPrefix({ tenantName: 'mytenant' })).toBeNull()
  })
})

describe('buildB2cLogoutUrl', () => {
  const prefix =
    'https://mytenant.b2clogin.com/mytenant.onmicrosoft.com/B2C_1_signupsignin'

  it('returns base logout URL when no redirect is provided', () => {
    expect(buildB2cLogoutUrl(prefix)).toBe(`${prefix}/oauth2/v2.0/logout`)
  })

  it('returns base logout URL when redirect is undefined', () => {
    expect(buildB2cLogoutUrl(prefix, undefined)).toBe(
      `${prefix}/oauth2/v2.0/logout`
    )
  })

  it('appends post_logout_redirect_uri when provided', () => {
    const redirect = 'https://example.com/signed-out'
    const result = buildB2cLogoutUrl(prefix, redirect)
    expect(result).toBe(
      `${prefix}/oauth2/v2.0/logout?post_logout_redirect_uri=https%3A%2F%2Fexample.com%2Fsigned-out`
    )
  })

  it('URL-encodes special characters in redirect URI', () => {
    const redirect = 'https://example.com/signed-out?foo=bar&baz=qux'
    const result = buildB2cLogoutUrl(prefix, redirect)
    expect(result).toContain('post_logout_redirect_uri=')
    expect(result).toContain(encodeURIComponent(redirect))
  })
})

describe('resolvePostLogoutAbsoluteUri', () => {
  function makeRequest({
    protocol = 'http',
    host = 'localhost:3000',
    xForwardedProto,
    xForwardedHost
  } = {}) {
    return {
      headers: {
        ...(xForwardedProto ? { 'x-forwarded-proto': xForwardedProto } : {}),
        ...(xForwardedHost ? { 'x-forwarded-host': xForwardedHost } : {}),
        host
      },
      server: { info: { protocol } },
      info: { host }
    }
  }

  describe('when pathOrUrl is an absolute URL', () => {
    it('returns the URL as-is when already https', () => {
      const request = makeRequest({ protocol: 'http' })
      const result = resolvePostLogoutAbsoluteUri(
        request,
        'https://example.com/signed-out',
        {}
      )
      expect(result).toBe('https://example.com/signed-out')
    })

    it('upgrades http to https when request is https via x-forwarded-proto', () => {
      const request = makeRequest({ xForwardedProto: 'https' })
      const result = resolvePostLogoutAbsoluteUri(
        request,
        'http://example.com/signed-out',
        {}
      )
      expect(result).toBe('https://example.com/signed-out')
    })

    it('upgrades http to https when server protocol is https', () => {
      const request = makeRequest({ protocol: 'https' })
      const result = resolvePostLogoutAbsoluteUri(
        request,
        'http://example.com/signed-out',
        {}
      )
      expect(result).toBe('https://example.com/signed-out')
    })

    it('does not upgrade when request is http', () => {
      const request = makeRequest({ protocol: 'http' })
      const result = resolvePostLogoutAbsoluteUri(
        request,
        'http://example.com/signed-out',
        {}
      )
      expect(result).toBe('http://example.com/signed-out')
    })
  })

  describe('when pathOrUrl is a path and azureConfig.redirectUri is set', () => {
    it('uses redirectUri origin to build the absolute URL', () => {
      const request = makeRequest()
      const azureConfig = { redirectUri: 'https://myapp.com/auth/callback' }
      const result = resolvePostLogoutAbsoluteUri(
        request,
        '/signed-out',
        azureConfig
      )
      expect(result).toBe('https://myapp.com/signed-out')
    })

    it('upgrades redirectUri origin to https when request is https', () => {
      const request = makeRequest({ xForwardedProto: 'https' })
      const azureConfig = { redirectUri: 'http://myapp.com/auth/callback' }
      const result = resolvePostLogoutAbsoluteUri(
        request,
        '/signed-out',
        azureConfig
      )
      expect(result).toBe('https://myapp.com/signed-out')
    })

    it('prepends leading slash to path when missing', () => {
      const request = makeRequest()
      const azureConfig = { redirectUri: 'https://myapp.com/auth/callback' }
      const result = resolvePostLogoutAbsoluteUri(
        request,
        'signed-out',
        azureConfig
      )
      expect(result).toBe('https://myapp.com/signed-out')
    })
  })

  describe('when pathOrUrl is a path and no redirectUri is configured', () => {
    it('uses x-forwarded-host and x-forwarded-proto headers', () => {
      const request = makeRequest({
        xForwardedProto: 'https',
        xForwardedHost: 'proxy.example.com'
      })
      const result = resolvePostLogoutAbsoluteUri(request, '/signed-out', {})
      expect(result).toBe('https://proxy.example.com/signed-out')
    })

    it('falls back to request host and server protocol', () => {
      const request = makeRequest({ protocol: 'http', host: 'localhost:3000' })
      const result = resolvePostLogoutAbsoluteUri(request, '/signed-out', {})
      expect(result).toBe('http://localhost:3000/signed-out')
    })

    it('uses first value from comma-separated x-forwarded-proto', () => {
      const request = makeRequest({
        xForwardedProto: 'https, http',
        xForwardedHost: 'proxy.example.com'
      })
      const result = resolvePostLogoutAbsoluteUri(request, '/signed-out', {})
      expect(result).toBe('https://proxy.example.com/signed-out')
    })

    it('uses first value from comma-separated x-forwarded-host', () => {
      const request = makeRequest({
        xForwardedProto: 'https',
        xForwardedHost: 'first.example.com, second.example.com'
      })
      const result = resolvePostLogoutAbsoluteUri(request, '/signed-out', {})
      expect(result).toBe('https://first.example.com/signed-out')
    })
  })

  describe('defaults', () => {
    it('defaults to /signed-out when pathOrUrl is empty', () => {
      const request = makeRequest({ protocol: 'http', host: 'localhost:3000' })
      const result = resolvePostLogoutAbsoluteUri(request, '', {})
      expect(result).toBe('http://localhost:3000/signed-out')
    })

    it('defaults to /signed-out when pathOrUrl is null', () => {
      const request = makeRequest({ protocol: 'http', host: 'localhost:3000' })
      const result = resolvePostLogoutAbsoluteUri(request, null, {})
      expect(result).toBe('http://localhost:3000/signed-out')
    })
  })
})
