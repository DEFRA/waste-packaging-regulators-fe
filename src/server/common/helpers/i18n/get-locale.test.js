import { getLocale } from './get-locale.js'

function mockRequest({ query = {}, headers = {}, sessionLocale = null } = {}) {
  const yar = {
    get(key) {
      if (key === 'authLocale') {
        return sessionLocale
      }
      return null
    }
  }

  return { query, headers, yar }
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
})
