import { describe, expect, test, vi } from 'vitest'

import { BaseApiService } from './base-api.service.js'

describe('BaseApiService', () => {
  test('getJson returns cached payload without calling fetch', async () => {
    const fetchImpl = vi.fn()
    const cacheClient = {
      get: vi.fn().mockResolvedValue(JSON.stringify({ from: 'cache' })),
      set: vi.fn()
    }
    const service = new BaseApiService({
      baseUrl: 'http://localhost',
      fetchImpl,
      cacheClient,
      serviceName: 'test-api'
    })

    const data = await service.getJson('/resource', {}, 'cache-key')

    expect(data).toEqual({ from: 'cache' })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  test('getJson fetches, parses json, and writes cache when cache misses', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ live: true })
    })
    const cacheClient = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined)
    }
    const service = new BaseApiService({
      baseUrl: 'http://localhost',
      fetchImpl,
      cacheClient,
      serviceName: 'test-api'
    })

    const data = await service.getJson('/resource', {}, 'cache-key')

    expect(data).toEqual({ live: true })
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://localhost/resource',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Accept: 'application/json',
          Authorization: expect.stringMatching(/^Basic /)
        })
      })
    )
    expect(cacheClient.set).toHaveBeenCalled()
  })

  test('getJson throws ApiError when response is not ok', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      headers: {
        get: vi.fn().mockReturnValue('application/problem+json')
      },
      json: vi.fn().mockResolvedValue({
        title: 'Bad Gateway',
        status: 502
      })
    })
    const service = new BaseApiService({
      baseUrl: 'http://localhost',
      fetchImpl,
      serviceName: 'upstream'
    })

    await expect(service.getJson('/fail', {}, 'ck')).rejects.toMatchObject({
      name: 'ApiError',
      status: 502,
      title: 'Bad Gateway',
      serviceName: 'upstream',
      method: 'GET',
      url: 'http://localhost/fail'
    })
  })

  test('getJson wraps fetch network failures with upstream context', async () => {
    const cause = Object.assign(new TypeError('fetch failed'), {
      cause: Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:8080'), {
        code: 'ECONNREFUSED'
      })
    })
    const fetchImpl = vi.fn().mockRejectedValue(cause)
    const service = new BaseApiService({
      baseUrl: 'http://localhost:8080',
      fetchImpl,
      serviceName: 'waste-obligations'
    })

    await expect(service.getJson('/things', {}, null)).rejects.toMatchObject({
      name: 'ApiError',
      serviceName: 'waste-obligations',
      method: 'GET',
      url: 'http://localhost:8080/things',
      cause
    })
  })

  describe('upstream call logging', () => {
    function makeLogger() {
      return { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
    }

    test('logs a successful GET at info with ECS shape', async () => {
      const fetchImpl = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({})
      })
      const logger = makeLogger()
      const service = new BaseApiService({
        baseUrl: 'http://localhost:8080',
        fetchImpl,
        logger,
        serviceName: 'waste-obligations'
      })

      await service.getJson('/things?q=1', {}, null)

      expect(logger.info).toHaveBeenCalledTimes(1)
      const [payload, message] = logger.info.mock.calls[0]

      expect(message).toMatch(
        /^waste-obligations GET http:\/\/localhost:8080\/things\?q=1 200 \(\d+ms\)$/
      )
      expect(payload).toMatchObject({
        service: { target: { name: 'waste-obligations' } },
        http: { request: { method: 'GET' }, response: { status_code: 200 } },
        url: { full: 'http://localhost:8080/things?q=1' },
        event: {
          category: 'http',
          kind: 'event',
          action: 'upstream-request',
          outcome: 'success'
        }
      })
      expect(typeof payload.event.duration).toBe('number')
    })

    test('logs a 4xx response at warn', async () => {
      const fetchImpl = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        headers: { get: vi.fn().mockReturnValue('application/json') },
        json: vi.fn().mockResolvedValue({})
      })
      const logger = makeLogger()
      const service = new BaseApiService({
        baseUrl: 'http://localhost',
        fetchImpl,
        logger,
        serviceName: 'upstream'
      })

      await expect(service.getJson('/missing', {}, null)).rejects.toMatchObject({
        status: 404
      })

      expect(logger.warn).toHaveBeenCalledTimes(1)
      expect(logger.warn.mock.calls[0][0]).toMatchObject({
        http: { response: { status_code: 404 } },
        event: { outcome: 'failure' }
      })
      expect(logger.error).not.toHaveBeenCalled()
    })

    test('logs a network failure at error and rethrows ApiError', async () => {
      const cause = new TypeError('fetch failed')
      const fetchImpl = vi.fn().mockRejectedValue(cause)
      const logger = makeLogger()
      const service = new BaseApiService({
        baseUrl: 'http://localhost:8080',
        fetchImpl,
        logger,
        serviceName: 'waste-obligations'
      })

      await expect(
        service.getJson('/things', {}, null)
      ).rejects.toMatchObject({ name: 'ApiError', cause })

      expect(logger.error).toHaveBeenCalledTimes(1)
      const [payload, message] = logger.error.mock.calls[0]
      expect(message).toContain('network-error')
      expect(payload).toMatchObject({
        service: { target: { name: 'waste-obligations' } },
        url: { full: 'http://localhost:8080/things' },
        event: { outcome: 'failure', action: 'upstream-request' }
      })
      expect(payload.http.response).toBeUndefined()
    })
  })

  test('postJson returns parsed json when content-type is application/json', async () => {
    const created = { id: '1' }
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      headers: {
        get: vi.fn().mockReturnValue('application/json; charset=utf-8')
      },
      json: vi.fn().mockResolvedValue(created)
    })
    const service = new BaseApiService({
      baseUrl: 'http://localhost',
      fetchImpl,
      serviceName: 'upstream'
    })

    const body = { a: 1 }
    const result = await service.postJson('/create', body, {})

    expect(result).toEqual(created)
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://localhost/create',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(body),
        headers: expect.objectContaining({
          'Content-Type': 'application/json'
        })
      })
    )
  })

  test('postJson returns null when response has no JSON content-type', async () => {
    const json = vi.fn()
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      headers: {
        get: vi.fn().mockReturnValue('text/plain')
      },
      json
    })
    const service = new BaseApiService({
      baseUrl: 'http://localhost',
      fetchImpl,
      serviceName: 'upstream'
    })

    await expect(service.postJson('/noop', {}, {})).resolves.toBeNull()
    expect(json).not.toHaveBeenCalled()
  })

  test('postJson serialises null body as empty object', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: {
        get: vi.fn().mockReturnValue('application/json')
      },
      json: vi.fn().mockResolvedValue({})
    })
    const service = new BaseApiService({
      baseUrl: 'http://localhost',
      fetchImpl,
      serviceName: 'upstream'
    })

    await service.postJson('/x', null, {})

    expect(fetchImpl.mock.calls[0][1].body).toBe(JSON.stringify({}))
  })

  test('postJson throws ApiError when response is not ok', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      headers: {
        get: vi.fn().mockReturnValue('application/problem+json')
      },
      json: vi.fn().mockResolvedValue({
        title: 'Conflict',
        status: 409
      })
    })
    const service = new BaseApiService({
      baseUrl: 'http://localhost',
      fetchImpl,
      serviceName: 'upstream'
    })

    await expect(service.postJson('/x', {}, {})).rejects.toMatchObject({
      name: 'ApiError',
      status: 409,
      title: 'Conflict'
    })
  })

  test('postJson reads application/problem+json body on success', async () => {
    const problem = { type: 'about:blank', title: 'Accepted', status: 202 }
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 202,
      headers: {
        get: vi.fn().mockReturnValue('application/problem+json')
      },
      json: vi.fn().mockResolvedValue(problem)
    })
    const service = new BaseApiService({
      baseUrl: 'http://localhost',
      fetchImpl,
      serviceName: 'upstream'
    })

    await expect(service.postJson('/x', {}, {})).resolves.toEqual(problem)
  })

  test('putJson sends PUT with JSON body', async () => {
    const updated = { id: '1', name: 'v2' }
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: {
        get: vi.fn().mockReturnValue('application/json')
      },
      json: vi.fn().mockResolvedValue(updated)
    })
    const service = new BaseApiService({
      baseUrl: 'http://localhost',
      fetchImpl,
      serviceName: 'upstream'
    })

    const body = { name: 'v2' }
    const result = await service.putJson('/resource/1', body, {})

    expect(result).toEqual(updated)
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://localhost/resource/1',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify(body),
        headers: expect.objectContaining({
          'Content-Type': 'application/json'
        })
      })
    )
  })

  test('patchJson sends PATCH with JSON body', async () => {
    const updated = { id: 'decl-1', status: 'Accepted' }
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: {
        get: vi.fn().mockReturnValue('application/json')
      },
      json: vi.fn().mockResolvedValue(updated)
    })
    const service = new BaseApiService({
      baseUrl: 'http://localhost',
      fetchImpl,
      serviceName: 'upstream'
    })

    const body = { status: 'Accepted', user: { id: 'user-1', email: 'a@b.c' } }
    const result = await service.patchJson('/resource/1', body, {})

    expect(result).toEqual(updated)
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://localhost/resource/1',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify(body),
        headers: expect.objectContaining({
          'Content-Type': 'application/json'
        })
      })
    )
  })

  test('getCachedJson returns null when cache read fails', async () => {
    const logger = { warn: vi.fn() }
    const cacheClient = {
      get: vi.fn().mockRejectedValue(new Error('redis-read-failed')),
      set: vi.fn()
    }
    const service = new BaseApiService({
      baseUrl: 'http://localhost',
      fetchImpl: vi.fn(),
      cacheClient,
      logger,
      serviceName: 'test-api'
    })

    await expect(service.getCachedJson('cache-key')).resolves.toBeNull()
    expect(logger.warn).toHaveBeenCalledWith(
      { err: expect.any(Error), cacheKey: 'cache-key' },
      'Unable to read cache entry'
    )
  })

  test('setCachedJson logs when cache write fails', async () => {
    const logger = { warn: vi.fn() }
    const cacheClient = {
      get: vi.fn(),
      set: vi.fn().mockRejectedValue(new Error('redis-write-failed'))
    }
    const service = new BaseApiService({
      baseUrl: 'http://localhost',
      fetchImpl: vi.fn(),
      cacheClient,
      logger,
      serviceName: 'test-api'
    })

    await service.setCachedJson('cache-key', { ok: true })

    expect(logger.warn).toHaveBeenCalledWith(
      { err: expect.any(Error), cacheKey: 'cache-key' },
      'Unable to set cache entry'
    )
  })

  test('omits auth header when auth mode is not basic', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ ok: true })
    })
    const service = new BaseApiService({
      baseUrl: 'http://localhost',
      fetchImpl,
      authMode: 'none',
      serviceName: 'test-api'
    })

    await service.getJson('/resource', {}, null)

    expect(fetchImpl.mock.calls[0][1].headers.Authorization).toBeUndefined()
  })

  test('postJson returns null when problem+json body cannot be parsed', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      headers: {
        get: vi.fn().mockReturnValue('application/problem+json')
      },
      json: vi.fn().mockRejectedValue(new Error('invalid json'))
    })
    const service = new BaseApiService({
      baseUrl: 'http://localhost',
      fetchImpl,
      serviceName: 'upstream'
    })

    await expect(service.postJson('/x', {}, {})).rejects.toMatchObject({
      name: 'ApiError',
      status: 400
    })
  })

  test('deleteJson returns null for 204 with no JSON body', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      headers: {
        get: vi.fn().mockReturnValue('')
      },
      json: vi.fn()
    })
    const service = new BaseApiService({
      baseUrl: 'http://localhost',
      fetchImpl,
      serviceName: 'upstream'
    })

    await expect(service.deleteJson('/resource/1', {})).resolves.toBeNull()
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://localhost/resource/1',
      expect.objectContaining({ method: 'DELETE' })
    )
  })
})
