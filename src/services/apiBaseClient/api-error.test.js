import { describe, expect, test } from 'vitest'
import { ApiError } from './api-error.js'

describe('ApiError', () => {
  test('from maps problem+json fields and upstream context', () => {
    const error = ApiError.from({
      message: 'waste-organisations API request failed with status 500',
      status: 500,
      body: {
        type: 'https://tools.ietf.org/html/rfc9110#section-15.6.1',
        title: 'Internal Server Error',
        detail: 'upstream failed',
        instance: '/organisations/org-1',
        traceId: 'trace-500',
        errors: [{ code: 'ERR_500' }]
      },
      serviceName: 'waste-organisations',
      method: 'GET',
      url: 'http://localhost:9090/organisations'
    })

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({
      name: 'ApiError',
      status: 500,
      title: 'Internal Server Error',
      detail: 'upstream failed',
      instance: '/organisations/org-1',
      traceId: 'trace-500',
      errors: [{ code: 'ERR_500' }],
      serviceName: 'waste-organisations',
      method: 'GET',
      url: 'http://localhost:9090/organisations'
    })
  })

  test('networkFailure carries cause, service and request context', () => {
    const cause = Object.assign(
      new Error('connect ECONNREFUSED 127.0.0.1:8080'),
      {
        code: 'ECONNREFUSED'
      }
    )

    const error = ApiError.networkFailure({
      serviceName: 'waste-obligations',
      method: 'GET',
      url: 'http://localhost:8080/compliance-declarations',
      cause
    })

    expect(error).toBeInstanceOf(ApiError)
    expect(error.message).toBe(
      'waste-obligations GET http://localhost:8080/compliance-declarations failed: ECONNREFUSED'
    )
    expect(error.cause).toBe(cause)
    expect(error).toMatchObject({
      serviceName: 'waste-obligations',
      method: 'GET',
      url: 'http://localhost:8080/compliance-declarations',
      status: null
    })
  })

  test('networkFailure falls back to cause.message when code is absent', () => {
    const cause = new Error('socket hang up')

    const error = ApiError.networkFailure({
      serviceName: 'foo',
      method: 'POST',
      url: 'http://example.test/x',
      cause
    })

    expect(error.message).toBe(
      'foo POST http://example.test/x failed: socket hang up'
    )
  })
})
