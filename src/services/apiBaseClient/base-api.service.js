import { createLogger } from '#/server/common/helpers/logging/logger.js'
import { ApiError } from './api-error.js'

const DEFAULT_CACHE_TTL_MS = 300000
const DEFAULT_ACCEPT_HEADER = 'application/json'
const AUTH_MODE_BASIC = 'basic'

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
    this.authMode = coalesce(options.authMode, AUTH_MODE_BASIC)
    this.xApiKey = coalesce(options.xApiKey, null)
  }

  buildCacheKey(...parts) {
    return [this.serviceName, ...parts].join(':')
  }

  buildUrl(path) {
    return `${this.baseUrl}${path}`
  }

  getHeaders(extraHeaders = {}) {
    return {
      ...this.headers,
      ...this.#getAuthHeader(),
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
      headers: this.getHeaders(headers)
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
        ...this.getHeaders(headers),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body ?? {})
    })

    return this.#readJsonBodyIfPresent(response)
  }

  async putJson(path, body, headers) {
    const response = await this.#fetchResponse('PUT', path, {
      headers: {
        ...this.getHeaders(headers),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body ?? {})
    })

    return this.#readJsonBodyIfPresent(response)
  }

  async patchJson(path, body, headers) {
    const response = await this.#fetchResponse('PATCH', path, {
      headers: {
        ...this.getHeaders(headers),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body ?? {})
    })

    return this.#readJsonBodyIfPresent(response)
  }

  async deleteJson(path, headers) {
    const response = await this.#fetchResponse('DELETE', path, {
      headers: this.getHeaders(headers)
    })

    return this.#readJsonBodyIfPresent(response)
  }

  async #fetchResponse(method, path, init) {
    const response = await this.fetchImpl(this.buildUrl(path), {
      method,
      ...init
    })

    if (!response.ok) {
      const errorBody = await this.#parseProblemJsonBody(response)

      throw ApiError.from({
        message: `${this.serviceName} API request failed with status ${response.status}`,
        status: response.status,
        body: errorBody
      })
    }

    return response
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

  #getAuthHeader() {
    if (this.authMode === AUTH_MODE_BASIC) {
      return this.getBasicAuthHeader()
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
