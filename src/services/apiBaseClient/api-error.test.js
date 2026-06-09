import { describe, expect, test } from 'vitest'
import { ApiError } from './api-error.js'

describe('ApiError', () => {
  test('from maps problem+json fields', () => {
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
      }
    })

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({
      name: 'ApiError',
      status: 500,
      title: 'Internal Server Error',
      detail: 'upstream failed',
      instance: '/organisations/org-1',
      traceId: 'trace-500',
      errors: [{ code: 'ERR_500' }]
    })
  })
})
