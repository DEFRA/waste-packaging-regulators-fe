import { createLogger } from '#server/common/helpers/logging/logger.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { ApiError } from './api-error.js'
import { getServiceOAuthAccessToken } from './oauth-token.js'

const DEFAULT_CACHE_TTL_MS = 300000
const DEFAULT_ACCEPT_HEADER = 'application/json'
const AUTH_MODE_BASIC = 'basic'
const AUTH_MODE_BEARER = 'bearer'

function trimTrailingSlash(value) {
  const text = String(value)
  let endIndex = text.length - 1

  while (endIndex >= 0 && text[endIndex] === '/') {
    endIndex -= 1
  }

  return text.slice(0, endIndex + 1)
}

function coalesce(value, fallback) {
  return value ?? fallback
}

export class BaseApiService {
  constructor(options = {}) {
    this.serviceName = coalesce(options.serviceName, 'base-api')
    this.baseUrl = trimTrailingSlash(coalesce(options.baseUrl, ''))
    this.fetchImpl = coalesce(options.fetchImpl, fetch)
    this.cacheTtlMs = coalesce(options.cacheTtlMs, DEFAULT_CACHE_TTL_MS)
    this.cacheClient = coalesce(options.cacheClient, null)
    this.logger = coalesce(options.logger, createLogger())
    this.headers = this.#buildDefaultHeaders(options.headers)
    this.tracingHeader = coalesce(options.tracingHeader, 'x-cdp-request-id')
    this.clientId = coalesce(options.clientId, '')
    this.clientSecret = coalesce(options.clientSecret, '')
    this.scope = coalesce(options.scope, '')
    this.tokenEndpoint = coalesce(options.tokenEndpoint, '')
    this.authMode = coalesce(options.authMode, AUTH_MODE_BASIC)
    this.xApiKey = coalesce(options.xApiKey, null)
  }

  buildCacheKey(...parts) {
    return [this.serviceName, ...parts].join(':')
  }

  buildUrl(path) {
    return `${this.baseUrl}${path}`
  }

  async getHeaders(extraHeaders = {}) {
    return {
      ...this.headers,
      ...(await this.#getAuthHeader()),
      ...extraHeaders
    }
  }

  getBasicAuthHeader() {
    const basicToken = Buffer.from(
      `${this.clientId}:${this.clientSecret}`
    ).toString('base64')

    return {
      Authorization: `Basic ${basicToken}`
    }
  }

  getTracingHeader(headerValue) {
    return !headerValue || !this.tracingHeader
      ? {}
      : {
          [this.tracingHeader]: headerValue
        }
  }

  async getJson(path, headers, cacheKey) {
    const cachedData = cacheKey ? await this.getCachedJson(cacheKey) : null

    if (cachedData) {
      return cachedData
    }

    const response = await this.#fetchResponse('GET', path, {
      headers: await this.getHeaders(headers)
    })

    const data = await response.json()

    if (cacheKey) {
      await this.setCachedJson(cacheKey, data)
    }

    return data
  }

  async postJson(path, body, headers) {
    const response = await this.#fetchResponse('POST', path, {
      headers: {
        ...(await this.getHeaders(headers)),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body ?? {})
    })

    return this.#readJsonBodyIfPresent(response)
  }

  async putJson(path, body, headers) {
    const response = await this.#fetchResponse('PUT', path, {
      headers: {
        ...(await this.getHeaders(headers)),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body ?? {})
    })

    return this.#readJsonBodyIfPresent(response)
  }

  async patchJson(path, body, headers) {
    const response = await this.#fetchResponse('PATCH', path, {
      headers: {
        ...(await this.getHeaders(headers)),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body ?? {})
    })

    return this.#readJsonBodyIfPresent(response)
  }

  async deleteJson(path, headers) {
    const response = await this.#fetchResponse('DELETE', path, {
      headers: await this.getHeaders(headers)
    })

    return this.#readJsonBodyIfPresent(response)
  }

  async #fetchResponse(method, path, init) {
    const url = this.buildUrl(path)
    const startedAt = performance.now()
    let response

    try {
      response = await this.fetchImpl(url, { method, ...init })
    } catch (cause) {
      this.#logUpstreamCall({
        method,
        url,
        durationMs: this.#elapsedMs(startedAt),
        error: cause
      })
      throw ApiError.networkFailure({
        serviceName: this.serviceName,
        method,
        url,
        cause
      })
    }

    this.#logUpstreamCall({
      method,
      url,
      durationMs: this.#elapsedMs(startedAt),
      statusCode: response.status
    })

    if (!response.ok) {
      const errorBody = await this.#parseProblemJsonBody(response)

      throw ApiError.from({
        message: `${this.serviceName} API request failed with status ${response.status}`,
        status: response.status,
        body: errorBody,
        serviceName: this.serviceName,
        method,
        url
      })
    }

    return response
  }

  #elapsedMs(startedAt) {
    return Math.round(performance.now() - startedAt)
  }

  #resolveUpstreamLogLevel(statusCode, error) {
    if (
      error ||
      (statusCode !== null && statusCode >= statusCodes.internalServerError)
    ) {
      return 'error'
    }
    if (statusCode !== null && statusCode >= statusCodes.badRequest) {
      return 'warn'
    }
    return 'info'
  }

  #logUpstreamCall({
    method,
    url,
    durationMs,
    statusCode = null,
    error = null
  }) {
    const ok =
      !error && statusCode !== null && statusCode < statusCodes.badRequest
    const level = this.#resolveUpstreamLogLevel(statusCode, error)

    const upper = method.toUpperCase()
    const statusLabel = statusCode ?? 'network-error'

    this.logger[level](
      {
        service: { target: { name: this.serviceName } },
        http: {
          request: { method: upper },
          ...(statusCode !== null
            ? { response: { status_code: statusCode } }
            : {})
        },
        url: { full: url },
        event: {
          category: 'http',
          kind: 'event',
          action: 'upstream-request',
          outcome: ok ? 'success' : 'failure',
          duration: durationMs * 1_000_000
        }
      },
      `${this.serviceName} ${upper} ${url} ${statusLabel} (${durationMs}ms)`
    )
  }

  async #readJsonBodyIfPresent(response) {
    const contentType = this.#getResponseContentType(response)
    const hasJsonBody =
      typeof response.json === 'function' &&
      (contentType.includes('application/json') ||
        contentType.includes('application/problem+json'))

    if (!hasJsonBody) {
      return null
    }

    return response.json()
  }

  async getCachedJson(cacheKey) {
    if (!this.cacheClient) {
      return null
    }

    try {
      const value = await this.cacheClient.get(cacheKey)
      if (!value) {
        return null
      }

      return JSON.parse(value)
    } catch (error) {
      this.logger.warn({ err: error, cacheKey }, 'Unable to read cache entry')
      return null
    }
  }

  async setCachedJson(cacheKey, value) {
    if (!this.cacheClient) {
      return
    }

    try {
      await this.cacheClient.set(
        cacheKey,
        JSON.stringify(value),
        'PX',
        this.cacheTtlMs
      )
    } catch (error) {
      this.logger.warn({ err: error, cacheKey }, 'Unable to set cache entry')
    }
  }

  #getResponseContentType(response) {
    if (typeof response?.headers?.get === 'function') {
      return String(response.headers.get('content-type') ?? '').toLowerCase()
    }

    return ''
  }

  #buildDefaultHeaders(headers) {
    return headers
      ? { ...headers, Accept: DEFAULT_ACCEPT_HEADER }
      : { Accept: DEFAULT_ACCEPT_HEADER }
  }

  async #getAuthHeader() {
    if (this.authMode === AUTH_MODE_BASIC) {
      return this.getBasicAuthHeader()
    }

    if (this.authMode === AUTH_MODE_BEARER) {
      const accessToken = await getServiceOAuthAccessToken({
        clientId: this.clientId,
        clientSecret: this.clientSecret,
        scope: this.scope,
        tokenEndpoint: this.tokenEndpoint,
        fetchImpl: this.fetchImpl,
        logger: this.logger
      })

      return { Authorization: `Bearer ${accessToken}` }
    }

    return {}
  }

  async #parseProblemJsonBody(response) {
    const contentType = this.#getResponseContentType(response)
    const isProblemJson = contentType.includes('application/problem+json')

    if (!isProblemJson || typeof response.json !== 'function') {
      return null
    }

    try {
      return await response.json()
    } catch {
      return null
    }
  }
}
