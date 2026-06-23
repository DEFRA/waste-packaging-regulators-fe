import { vi } from 'vitest'
import hapi from '@hapi/hapi'
import boom from '@hapi/boom'

import { boomErrorLogger, serializeError } from './boom-error-logger.js'
import { statusCodes } from '../common/constants/status-codes.js'

describe('#serializeError', () => {
  test('returns undefined for non-Error values', () => {
    expect(serializeError('boom')).toBeUndefined()
    expect(serializeError(null)).toBeUndefined()
    expect(serializeError({ message: 'nope' })).toBeUndefined()
  })

  test('extracts type, message and stack_trace from a plain Error', () => {
    const err = new Error('something broke')

    expect(serializeError(err)).toEqual({
      type: 'Error',
      message: 'something broke',
      stack_trace: expect.stringContaining('Error: something broke')
    })
  })

  test('includes code and errno when present', () => {
    const err = Object.assign(new Error('connect failed'), {
      code: 'ECONNREFUSED',
      errno: -111
    })

    const out = serializeError(err)

    expect(out).toMatchObject({
      type: 'Error',
      message: 'connect failed',
      code: 'ECONNREFUSED',
      errno: -111
    })
  })

  test('includes upstream context (status, service_name, method, url) when present', () => {
    const err = Object.assign(new Error('upstream broke'), {
      status: 502,
      serviceName: 'waste-obligations',
      method: 'GET',
      url: 'http://localhost:8080/things'
    })

    expect(serializeError(err)).toMatchObject({
      message: 'upstream broke',
      status: 502,
      service_name: 'waste-obligations',
      method: 'GET',
      url: 'http://localhost:8080/things'
    })
  })

  test('walks AggregateError.errors[] (e.g. undici multi-IP connect)', () => {
    const v4 = Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:8080'), {
      code: 'ECONNREFUSED'
    })
    const v6 = Object.assign(new Error('connect ECONNREFUSED ::1:8080'), {
      code: 'ECONNREFUSED'
    })
    const aggregate = new AggregateError([v4, v6], '')
    aggregate.code = 'ECONNREFUSED'

    const out = serializeError(aggregate)

    expect(out.type).toBe('AggregateError')
    expect(out.code).toBe('ECONNREFUSED')
    expect(out.errors).toHaveLength(2)
    expect(out.errors[0]).toMatchObject({
      message: 'connect ECONNREFUSED 127.0.0.1:8080',
      code: 'ECONNREFUSED'
    })
    expect(out.errors[1]).toMatchObject({
      message: 'connect ECONNREFUSED ::1:8080',
      code: 'ECONNREFUSED'
    })
  })

  test('walks .cause recursively', () => {
    const root = Object.assign(
      new Error('connect ECONNREFUSED 127.0.0.1:8080'),
      {
        code: 'ECONNREFUSED',
        errno: -111
      }
    )
    const wrapped = new TypeError('fetch failed', { cause: root })
    const outer = new Error('upstream request failed', { cause: wrapped })

    const out = serializeError(outer)

    expect(out.message).toBe('upstream request failed')
    expect(out.cause).toBeDefined()
    expect(out.cause.type).toBe('TypeError')
    expect(out.cause.message).toBe('fetch failed')
    expect(out.cause.cause).toBeDefined()
    expect(out.cause.cause).toMatchObject({
      message: 'connect ECONNREFUSED 127.0.0.1:8080',
      code: 'ECONNREFUSED',
      errno: -111
    })
  })
})

describe('#boomErrorLogger', () => {
  let server
  let errorLog
  let warnLog

  beforeEach(async () => {
    errorLog = vi.fn()
    warnLog = vi.fn()

    server = hapi.server()
    server.decorate('request', 'logger', {
      error: errorLog,
      warn: warnLog
    })

    await server.register(boomErrorLogger)

    server.route([
      {
        method: 'GET',
        path: '/throws-fetch-failed',
        handler: () => {
          const root = Object.assign(
            new Error('connect ECONNREFUSED 127.0.0.1:8080'),
            { code: 'ECONNREFUSED', errno: -111 }
          )
          throw new TypeError('fetch failed', { cause: root })
        }
      },
      {
        method: 'GET',
        path: '/throws-not-found',
        handler: (_request, h) => h.response().code(statusCodes.notFound)
      },
      {
        method: 'GET',
        path: '/ok',
        handler: () => ({ ok: true })
      },
      {
        method: 'GET',
        path: '/unauthorized',
        handler: () => {
          throw boom.unauthorized('nope')
        }
      }
    ])
  })

  test('logs 500s at error level with the full cause chain on error.cause', async () => {
    await server.inject({ method: 'GET', url: '/throws-fetch-failed' })

    expect(errorLog).toHaveBeenCalledTimes(1)
    expect(warnLog).not.toHaveBeenCalled()

    const [payload, message] = errorLog.mock.calls[0]

    expect(message).toBe('fetch failed')
    expect(payload.error).toMatchObject({
      type: 'TypeError',
      message: 'fetch failed'
    })
    expect(payload.error.cause).toMatchObject({
      message: 'connect ECONNREFUSED 127.0.0.1:8080',
      code: 'ECONNREFUSED',
      errno: -111
    })
    expect(payload.http.response.status_code).toBe(
      statusCodes.internalServerError
    )
    expect(payload.http.request.id).toBeDefined()
    expect(payload.event).toMatchObject({
      category: 'http',
      kind: 'event',
      outcome: 'failure'
    })
  })

  test('does not log anything when the response is not a Boom error', async () => {
    await server.inject({ method: 'GET', url: '/ok' })

    expect(errorLog).not.toHaveBeenCalled()
    expect(warnLog).not.toHaveBeenCalled()
  })

  test('skips 401s so they do not double-log against the catchAll redirect', async () => {
    await server.inject({ method: 'GET', url: '/unauthorized' })

    expect(errorLog).not.toHaveBeenCalled()
    expect(warnLog).not.toHaveBeenCalled()
  })
})
