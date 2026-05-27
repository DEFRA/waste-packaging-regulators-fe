import { vi } from 'vitest'

import { createServer } from '../server.js'
import { statusCodes } from '../common/constants/status-codes.js'

describe('#homeController', () => {
  describe('with default config', () => {
    let server
    let originalFetch

    beforeAll(async () => {
      server = await createServer()
      await server.initialize()
    })

    beforeEach(() => {
      originalFetch = globalThis.fetch
      const mockFetch = vi.fn(async () => ({
        ok: true,
        status: 200,
        statusText: 'OK',
        async json() {
          return {
            firstName: 'Carl',
            lastName: 'Mason',
            contactEmail: 'eprqatest+RegulatorNation1@gmail.com',
            serviceRoleId: 4,
            serviceRole: 'Regulator Admin',
            organisationName: 'Carl_BUG_TESTING',
            nationId: 1
          }
        }
      }))
      globalThis.fetch = mockFetch
      global.fetch = mockFetch
    })

    afterEach(() => {
      globalThis.fetch = originalFetch
      global.fetch = originalFetch
    })

    afterAll(async () => {
      await server.stop({ timeout: 0 })
    })

    test('Should redirect to signin when no session user', async () => {
      const { statusCode, headers } = await server.inject({
        method: 'GET',
        url: '/'
      })

      expect(statusCode).toBe(statusCodes.found)
      expect(headers.location).toBe('/regulators/signin-oidc')
    })

    test('Should render dashboard when authenticated', async () => {
      const signinResponse = await server.inject({
        method: 'GET',
        url: '/regulators/signin-oidc'
      })
      const setCookie = signinResponse.headers['set-cookie'] ?? []
      const sessionCookie = []
        .concat(setCookie)
        .map((c) => c.split(';')[0])
        .join('; ')

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/',
        headers: { cookie: sessionCookie }
      })

      expect(result).toEqual(expect.stringContaining('Regulator Dashboard'))
      expect(result).toEqual(
        expect.stringContaining('regulator-home__account-details')
      )
      expect(result).toEqual(expect.stringContaining('Carl'))
      expect(result).toEqual(expect.stringContaining('Mason'))
      expect(result).toEqual(expect.stringContaining('Carl_BUG_TESTING'))
      expect(result).toEqual(expect.stringContaining('Log out'))
      expect(result).toEqual(expect.stringContaining('href="/logout"'))
      expect(result).not.toEqual(
        expect.stringContaining('Certificate of Compliance placeholder')
      )
      expect(statusCode).toBe(statusCodes.ok)
    })
  })

  describe('with FEATURE_CERTIFICATE_OF_COMPLIANCE=true', () => {
    let server
    let originalFetch

    beforeAll(async () => {
      vi.stubEnv('FEATURE_CERTIFICATE_OF_COMPLIANCE', 'true')
      vi.resetModules()
      const { createServer: createFreshServer } = await import('../server.js')
      server = await createFreshServer()
      await server.initialize()
    })

    beforeEach(() => {
      originalFetch = globalThis.fetch
      const mockFetch = vi.fn(async () => ({
        ok: true,
        status: 200,
        statusText: 'OK',
        async json() {
          return {
            firstName: 'Carl',
            lastName: 'Mason',
            contactEmail: 'eprqatest+RegulatorNation1@gmail.com',
            serviceRoleId: 4,
            serviceRole: 'Regulator Admin',
            organisationName: 'Carl_BUG_TESTING',
            nationId: 1
          }
        }
      }))
      globalThis.fetch = mockFetch
      global.fetch = mockFetch
    })

    afterEach(() => {
      globalThis.fetch = originalFetch
      global.fetch = originalFetch
    })

    afterAll(async () => {
      await server.stop({ timeout: 0 })
      vi.unstubAllEnvs()
    })

    test('Should render Certificate of Compliance placeholder', async () => {
      const signinResponse = await server.inject({
        method: 'GET',
        url: '/regulators/signin-oidc'
      })
      const setCookie = signinResponse.headers['set-cookie'] ?? []
      const sessionCookie = []
        .concat(setCookie)
        .map((c) => c.split(';')[0])
        .join('; ')

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/',
        headers: { cookie: sessionCookie }
      })

      expect(result).toEqual(
        expect.stringContaining('Certificate of Compliance placeholder')
      )
      expect(statusCode).toBe(statusCodes.ok)
    })
  })
})
