import { vi } from 'vitest'

import {
  bindLocaleUrl,
  clearAuthLocale,
  localeUrl,
  persistAuthLocale,
  redirectWithLocale
} from './locale-url.js'

describe('localeUrl', () => {
  test('appends lang=cy for Welsh locale', () => {
    expect(localeUrl('/foo', 'cy')).toBe('/foo?lang=cy')
  })

  test('does not append lang for English', () => {
    expect(localeUrl('/foo', 'en')).toBe('/foo')
  })

  test('preserves existing query params', () => {
    expect(localeUrl('/foo?tab=pending', 'cy')).toBe('/foo?tab=pending&lang=cy')
  })

  test('does not duplicate lang when already present', () => {
    expect(localeUrl('/foo?lang=cy', 'cy')).toBe('/foo?lang=cy')
  })
})

describe('bindLocaleUrl', () => {
  test('returns a function bound to the locale', () => {
    const url = bindLocaleUrl('cy')
    expect(url('/foo')).toBe('/foo?lang=cy')
  })
})

describe('redirectWithLocale', () => {
  test('redirects with lang query for Welsh requests', () => {
    const request = {
      query: { lang: 'cy' },
      headers: {},
      yar: { get: () => null }
    }
    const redirect = vi.fn()
    const h = { redirect }

    redirectWithLocale(h, request, '/certificates-of-compliance')

    expect(redirect).toHaveBeenCalledWith('/certificates-of-compliance?lang=cy')
  })

  test('redirects with lang query from authLocale when query param is absent', () => {
    const request = {
      query: {},
      headers: { 'accept-language': 'en-GB' },
      yar: { get: (key) => (key === 'authLocale' ? 'cy' : null) }
    }
    const redirect = vi.fn()
    const h = { redirect }

    redirectWithLocale(h, request, '/certificates-of-compliance/download')

    expect(redirect).toHaveBeenCalledWith(
      '/certificates-of-compliance/download?lang=cy'
    )
  })
})

describe('auth locale session helpers', () => {
  test('persistAuthLocale stores Welsh locale', () => {
    const store = new Map()
    const request = {
      yar: {
        set(key, value) {
          store.set(key, value)
        }
      }
    }

    persistAuthLocale(request, 'cy')
    expect(store.get('authLocale')).toBe('cy')
  })

  test('persistAuthLocale skips English', () => {
    const store = new Map()
    const request = {
      yar: {
        set(key, value) {
          store.set(key, value)
        }
      }
    }

    persistAuthLocale(request, 'en')
    expect(store.has('authLocale')).toBe(false)
  })

  test('clearAuthLocale removes stored locale', () => {
    let cleared = false
    const request = {
      yar: {
        clear(key) {
          if (key === 'authLocale') {
            cleared = true
          }
        }
      }
    }

    clearAuthLocale(request)
    expect(cleared).toBe(true)
  })
})
