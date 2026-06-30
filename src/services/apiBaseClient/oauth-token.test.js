import { afterEach, describe, expect, test, vi } from 'vitest'

import {
  getServiceOAuthAccessToken,
  resetServiceOAuthTokenCacheForTests
} from './oauth-token.js'

function tokenResponse(data) {
  return {
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue(data)
  }
}

const baseOptions = {
  clientId: 'client-1',
  clientSecret: 'secret-1',
  scope: 'api://account/.default',
  tokenEndpoint: 'https://login.example/token'
}

afterEach(() => {
  resetServiceOAuthTokenCacheForTests()
})

describe('getServiceOAuthAccessToken', () => {
  test('requests a client_credentials token and returns the access token', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        tokenResponse({ access_token: 'tok-abc', expires_in: 3600 })
      )

    const token = await getServiceOAuthAccessToken({
      ...baseOptions,
      fetchImpl
    })

    expect(token).toBe('tok-abc')
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toBe('https://login.example/token')
    expect(init.method).toBe('POST')
    expect(init.headers['Content-Type']).toBe(
      'application/x-www-form-urlencoded'
    )
    const body = init.body.toString()
    expect(body).toContain('grant_type=client_credentials')
    expect(body).toContain('client_id=client-1')
    expect(body).toContain('scope=api')
  })

  test('caches the token across calls and only fetches once', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        tokenResponse({ access_token: 'tok-cached', expires_in: 3600 })
      )

    const first = await getServiceOAuthAccessToken({
      ...baseOptions,
      fetchImpl
    })
    const second = await getServiceOAuthAccessToken({
      ...baseOptions,
      fetchImpl
    })

    expect(first).toBe('tok-cached')
    expect(second).toBe('tok-cached')
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  test('coalesces concurrent refreshes into a single token request', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        tokenResponse({ access_token: 'tok-single', expires_in: 3600 })
      )

    const [a, b] = await Promise.all([
      getServiceOAuthAccessToken({ ...baseOptions, fetchImpl }),
      getServiceOAuthAccessToken({ ...baseOptions, fetchImpl })
    ])

    expect(a).toBe('tok-single')
    expect(b).toBe('tok-single')
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  test('throws when required options are missing', async () => {
    await expect(
      getServiceOAuthAccessToken({ ...baseOptions, scope: '' })
    ).rejects.toThrow(/scope/)
  })

  test('throws when the token endpoint responds with an error', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized'
    })

    await expect(
      getServiceOAuthAccessToken({ ...baseOptions, fetchImpl })
    ).rejects.toThrow(/OAuth token request failed \(401 Unauthorized\)/)
  })

  test('throws when the token response has no access_token', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(tokenResponse({ expires_in: 3600 }))

    await expect(
      getServiceOAuthAccessToken({ ...baseOptions, fetchImpl })
    ).rejects.toThrow(/did not include access_token/)
  })
})
