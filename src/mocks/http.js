// Shared HTTP helpers for the backend mocks.

import { HttpResponse } from 'msw'

import { config } from '#config/config.js'

export function trimTrailingSlash(value) {
  return String(value).replace(/\/+$/, '')
}

export function notFound(title) {
  return HttpResponse.json(
    { title, status: 404 },
    { status: 404, headers: { 'content-type': 'application/problem+json' } }
  )
}

// When MOCK_ERROR_STATUS is set (mock mode only), every mocked backend call
// returns that HTTP status instead of data, so a developer can walk a mock-mode
// journey into the real error pages — the failure travels the normal
// service → boomify → onPreResponse path — without a backend that actually fails.
function configuredErrorResponse() {
  const status = config.get('mockErrorStatus')
  if (!Number.isFinite(status)) {
    return null
  }
  return HttpResponse.json(
    { title: `Mock failure (MOCK_ERROR_STATUS=${status})`, status },
    { status, headers: { 'content-type': 'application/problem+json' } }
  )
}

// Wraps a resolver so MOCK_ERROR_STATUS short-circuits it with the configured
// error before any data is served.
export const dataHandler = (resolver) => (info) =>
  configuredErrorResponse() ?? resolver(info)
