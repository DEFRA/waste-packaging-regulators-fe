import { vi } from 'vitest'

import { getLocale } from './get-locale.js'

function mockRequest({
  query = {},
  headers = {},
  sessionLocale = null,
  yar
} = {}) {
  const defaultYar = {
    get(key) {
      if (key === 'authLocale') {
        return sessionLocale
      }
      return null
    }
  }

  return { query, headers, yar: yar ?? defaultYar }
}

describe('getLocale', () => {
  test('returns query lang when supported', () => {
    expect(getLocale(mockRequest({ query: { lang: 'cy' } }))).toBe('cy')
  })

  test('normalises cy-GB to cy', () => {
    expect(getLocale(mockRequest({ query: { lang: 'cy-GB' } }))).toBe('cy')
  })

  test('falls back to en for unsupported lang', () => {
    expect(getLocale(mockRequest({ query: { lang: 'fr' } }))).toBe('en')
  })

  test('uses authLocale from session when query absent', () => {
    expect(getLocale(mockRequest({ sessionLocale: 'cy' }))).toBe('cy')
  })

  test('uses Accept-Language when no query or session', () => {
    expect(
      getLocale(
        mockRequest({ headers: { 'accept-language': 'cy-GB,en;q=0.9' } })
      )
    ).toBe('cy')
  })

  test('defaults to en', () => {
    expect(getLocale(mockRequest())).toBe('en')
  })

  test('does not throw when session is unavailable', () => {
    expect(getLocale({ query: {}, headers: {} })).toBe('en')
  })

  test('skips session read when yar has not been initialised (_store is null)', () => {
    // Reproduces the maintenance-mode scenario: maintenance plugin intercepts at
    // onRequest before yar's onPreAuth initialises _store, leaving _store as null.
    const yar = { _store: null, get: vi.fn() }
    expect(getLocale(mockRequest({ yar }))).toBe('en')
    expect(yar.get).not.toHaveBeenCalled()
  })

  test('logs when reading authLocale from session fails', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const yar = {
      get() {
        throw new Error('session unavailable')
      }
    }

    expect(getLocale(mockRequest({ yar }))).toBe('en')
    expect(warnSpy).toHaveBeenCalledWith(
      'Failed to read authLocale from session',
      expect.any(Error)
    )
    warnSpy.mockRestore()
  })
})
