import {
  appendLangQuery,
  clearAuthLocale,
  persistAuthLocale
} from './locale-url.js'

describe('appendLangQuery', () => {
  test('appends lang=cy for Welsh locale', () => {
    expect(appendLangQuery('/foo', 'cy')).toBe('/foo?lang=cy')
  })

  test('does not append lang for English', () => {
    expect(appendLangQuery('/foo', 'en')).toBe('/foo')
  })

  test('preserves existing query params', () => {
    expect(appendLangQuery('/foo?tab=pending', 'cy')).toBe(
      '/foo?tab=pending&lang=cy'
    )
  })

  test('does not duplicate lang when already present', () => {
    expect(appendLangQuery('/foo?lang=cy', 'cy')).toBe('/foo?lang=cy')
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
