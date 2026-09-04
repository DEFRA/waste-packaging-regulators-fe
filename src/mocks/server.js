import { setupServer } from 'msw/node'

import { config } from '#config/config.js'

import { backendHandlers, defaultBackends } from './backends.js'

let mockServer

// The Account API defaults to bearer (OAuth client credentials). The OAuth client
// throws if clientSecret / scope / tokenEndpoint are empty — before any request is
// made — so in mock mode we point them at a stub the token handler intercepts,
// keeping the bearer path exercised rather than special-casing auth away.
function applyMockOAuthConfig() {
  if (config.get('accountApi.authMode') !== 'bearer') {
    return
  }

  const accountBase = String(config.get('accountApi.baseUrl')).replace(
    /\/+$/,
    ''
  )

  if (!config.get('accountApi.tokenEndpoint')) {
    config.set('accountApi.tokenEndpoint', `${accountBase}/oauth/mock-token`)
  }
  if (!config.get('accountApi.clientSecret')) {
    config.set('accountApi.clientSecret', 'mock-account-api-secret')
  }
  if (!config.get('accountApi.scope')) {
    config.set('accountApi.scope', 'mock-account-api-scope')
  }
}

// Starts the in-process MSW server that intercepts the backend calls. Idempotent:
// the server is a process singleton, so repeated calls (e.g. once per test that
// builds a server) are safe.
export async function startMockApi() {
  if (mockServer) {
    return mockServer
  }

  applyMockOAuthConfig()
  mockServer = setupServer(...backendHandlers(defaultBackends))
  mockServer.listen({ onUnhandledRequest: 'warn' })
  return mockServer
}

export function getMockServer() {
  return mockServer
}
