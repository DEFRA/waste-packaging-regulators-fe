/**
 * Gateway API HTTP client helpers.
 *
 * Provides a small wrapper around `fetch` for performing GET requests to the
 * configured gateway API and parsing JSON responses.
 *
 * Configuration:
 * - `services.gatewayApi.baseUrl`: Base URL for the gateway API (defaults to
 *   `http://localhost:8085` when not set/blank)
 * - `services.gatewayApi.basicAuth.username` / `services.gatewayApi.basicAuth.password`:
 *   Optional Basic Auth credentials (when both are set)
 *
 * Notes:
 * - Caller may pass additional headers (merged into the request).
 * - Caller may pass a logger supporting `debug`/`error` for request diagnostics.
 */
import { config } from '../../../config/config.js'

function buildBaseForUrl(baseUrl) {
  if (typeof baseUrl !== 'string' || baseUrl.trim() === '') {
    return 'http://localhost:8085/'
  }
  return baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
}

function getGatewayBasicAuthValue() {
  const username = String(
    config.get('services.gatewayApi.basicAuth.username') ?? ''
  ).trim()
  const password = String(
    config.get('services.gatewayApi.basicAuth.password') ?? ''
  ).trim()

  if (!username || !password) return ''
  const credentials = `${username}:${password}`
  const encoded = Buffer.from(credentials, 'utf8').toString('base64')
  return `Basic ${encoded}`
}

/**
 * Fetch JSON from the configured gateway API.
 * @param {string} path Relative gateway path e.g. `api/account/123`
 * @param {{ headers?: any, logger?: any }} [options]
 */
export async function gatewayGetJson(path, { headers, logger } = {}) {
  const baseUrl =
    config.get('services.gatewayApi.baseUrl') || 'http://localhost:8085'
  const baseForUrl = buildBaseForUrl(baseUrl)
  const url = new URL(path, baseForUrl)

  const fetchFn = globalThis.fetch
  if (typeof fetchFn !== 'function') {
    throw new TypeError('fetch is not available in this runtime')
  }

  const basicAuthValue = getGatewayBasicAuthValue()

  logger?.debug?.(
    {
      baseUrl,
      url: url.toString(),
      hasHeaders: Boolean(headers && typeof headers === 'object'),
      hasBasicAuth: Boolean(basicAuthValue)
    },
    'Fetching from gateway'
  )

  const requestHeaders = { accept: 'application/json' }
  if (basicAuthValue) requestHeaders.authorization = basicAuthValue
  if (headers && typeof headers === 'object') {
    // If the caller provided extra headers (e.g. correlation ID), merge them.
    Object.assign(requestHeaders, headers)
  }

  const res = await fetchFn(url, {
    method: 'GET',
    headers: requestHeaders
  })

  if (!res.ok) {
    const msg = `Gateway request failed (${res.status} ${res.statusText})`
    logger?.error?.(
      {
        url: url.toString(),
        statusCode: res.status,
        statusText: res.statusText
      },
      'Gateway request failed'
    )

    const err = new Error(`${msg}: ${url.toString()}`)
    err.statusCode = res.status
    throw err
  }

  return await res.json()
}
