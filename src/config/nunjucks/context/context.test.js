import { vi } from 'vitest'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const en = require('#server/locales/en.json')

const mockReadFileSync = vi.fn()
const mockLoggerError = vi.fn()
const mockConfigGet = vi.fn((key, configObj) => {
  if (key === 'isProduction') return true
  return configObj.get(key)
})

vi.mock('node:fs', async () => {
  const nodeFs = await import('node:fs')

  return {
    ...nodeFs,
    readFileSync: (filePath, ...args) => {
      if (String(filePath).includes('manifest.json')) {
        return mockReadFileSync()
      }
      return nodeFs.readFileSync(filePath, ...args)
    }
  }
})
vi.mock('../../../server/common/helpers/logging/logger.js', () => ({
  createLogger: () => ({ error: (...args) => mockLoggerError(...args) })
}))
vi.mock(import('#config/config.js'), async (importOriginal) => {
  const originalModule = await importOriginal()
  return {
    config: {
      get(key) {
        return mockConfigGet(key, originalModule.config)
      }
    }
  }
})

describe('context and cache', () => {
  beforeEach(() => {
    mockReadFileSync.mockReset()
    mockLoggerError.mockReset()
    mockConfigGet.mockReset()
    mockConfigGet.mockImplementation((key, configObj) => {
      if (key === 'isProduction') return true
      return configObj.get(key)
    })
    vi.resetModules()
  })

  describe('#context', () => {
    const mockRequest = {
      path: '/',
      query: {},
      headers: {},
      yar: { get: () => null },
      plugins: { blankie: { nonces: { script: 'test-nonce' } } }
    }

    describe('When Vite manifest file read succeeds', () => {
      let contextImport
      let contextResult

      beforeAll(async () => {
        contextImport = await import('./context.js')
      })

      beforeEach(() => {
        // Return JSON string
        mockReadFileSync.mockReturnValue(`{
        "application.js": "javascripts/application.js",
        "stylesheets/application.scss": "stylesheets/application.css"
      }`)

        contextResult = contextImport.context(mockRequest)
      })

      test('Should provide expected context', () => {
        expect(contextResult).toEqual({
          publicPath: '/public',
          assetPath: '/public/assets',
          breadcrumbs: [],
          getAssetPath: expect.any(Function),
          locale: 'en',
          localeUrl: expect.any(Function),
          languageSwitcher: expect.objectContaining({
            en: expect.any(String),
            cy: expect.any(String)
          }),
          backlinkText: 'Back',
          navigation: [],
          accountNavigation: [],
          regulatorContext: `<div class="defra-internal-service-navigation__context">\n    <a class="govuk-service-navigation__link" href="/signin-oidc">Sign in</a>\n  </div>`,
          routePrefix: '',
          serviceName: en.common.serviceName,
          serviceUrl: '/dashboard',
          helpDeskEmail: 'eprcustomerservice@defra.gov.uk',
          ga4: '',
          gtm: '',
          hasCookiePolicy: false,
          cookiePreferenceSet: false,
          allowGoogleAnalytics: false,
          cspNonce: 'test-nonce'
        })
      })

      describe('With valid asset path', () => {
        test('Should provide expected asset path', () => {
          expect(contextResult.getAssetPath('application.js')).toBe(
            '/public/application.js'
          )
        })
      })

      describe('With invalid asset path', () => {
        test('Should provide expected asset', () => {
          expect(contextResult.getAssetPath('an-image.png')).toBe(
            '/public/an-image.png'
          )
        })
      })

      describe('When not in production', () => {
        test('Should use direct asset path', () => {
          mockConfigGet.mockImplementation((key, configObj) => {
            if (key === 'isProduction') return false
            return configObj.get(key)
          })
          const res = contextImport.context(mockRequest)
          expect(res.getAssetPath('application.js')).toBe(
            '/public/application.js'
          )
        })
      })
    })

    describe('When Vite manifest file read fails', () => {
      let contextImport

      beforeAll(async () => {
        contextImport = await import('./context.js')
      })

      beforeEach(() => {
        mockReadFileSync.mockReturnValue(new Error('File not found'))

        contextImport.context(mockRequest)
      })

      test('Should log that the Vite Manifest file is not available', () => {
        expect(mockLoggerError).toHaveBeenCalledWith(
          expect.any(SyntaxError),
          'Vite manifest.json not found'
        )
      })
    })
  })

  describe('cookies_policy parsing', () => {
    let contextImport
    const mockRequest = {
      path: '/',
      query: {},
      headers: {},
      yar: { get: () => null },
      plugins: { blankie: { nonces: { script: 'test-nonce' } } }
    }

    beforeAll(async () => {
      contextImport = await import('./context.js')
    })

    test('Should parse string cookies_policy correctly', () => {
      const req = {
        ...mockRequest,
        state: { cookies_policy: '{"usage": true}' }
      }
      const res = contextImport.context(req)
      expect(res.allowGoogleAnalytics).toBe(true)
      expect(res.hasCookiePolicy).toBe(true)
    })

    test('Should use object cookies_policy correctly', () => {
      const req = {
        ...mockRequest,
        state: { cookies_policy: { usage: false } }
      }
      const res = contextImport.context(req)
      expect(res.allowGoogleAnalytics).toBe(false)
      expect(res.hasCookiePolicy).toBe(true)
    })

    test('Should handle invalid JSON string in cookies_policy', () => {
      const req = { ...mockRequest, state: { cookies_policy: 'invalid json' } }
      const res = contextImport.context(req)
      expect(res.allowGoogleAnalytics).toBe(false)
      expect(res.hasCookiePolicy).toBe(true)
      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.any(SyntaxError),
        'Failed to parse cookies_policy from request state'
      )
    })
  })

  describe('#context cache', () => {
    const mockRequest = {
      path: '/',
      query: {},
      headers: {},
      yar: { get: () => null },
      plugins: { blankie: { nonces: { script: 'test-nonce' } } }
    }
    let contextResult

    describe('Vite manifest file cache', () => {
      let contextImport

      beforeAll(async () => {
        contextImport = await import('./context.js')
      })

      beforeEach(() => {
        // Return JSON string
        mockReadFileSync.mockReturnValue(`{
        "application.js": "javascripts/application.js",
        "stylesheets/application.scss": "stylesheets/application.css"
      }`)

        contextResult = contextImport.context(mockRequest)
      })

      test('Should read file', () => {
        expect(mockReadFileSync).toHaveBeenCalled()
      })

      test('Should use cache', () => {
        expect(mockReadFileSync).not.toHaveBeenCalled()
      })

      test('Should provide expected context', () => {
        expect(contextResult).toEqual({
          publicPath: '/public',
          assetPath: '/public/assets',
          breadcrumbs: [],
          getAssetPath: expect.any(Function),
          locale: 'en',
          localeUrl: expect.any(Function),
          languageSwitcher: expect.objectContaining({
            en: expect.any(String),
            cy: expect.any(String)
          }),
          backlinkText: 'Back',
          navigation: [],
          accountNavigation: [],
          regulatorContext: `<div class="defra-internal-service-navigation__context">\n    <a class="govuk-service-navigation__link" href="/signin-oidc">Sign in</a>\n  </div>`,
          routePrefix: '',
          serviceName: en.common.serviceName,
          serviceUrl: '/dashboard',
          helpDeskEmail: 'eprcustomerservice@defra.gov.uk',
          ga4: '',
          gtm: '',
          hasCookiePolicy: false,
          cookiePreferenceSet: false,
          allowGoogleAnalytics: false,
          cspNonce: 'test-nonce'
        })
      })
    })
  })
})
