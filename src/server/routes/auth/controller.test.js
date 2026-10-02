import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { signinOidcController, signOutController } from './controller.js'

const {
  mockGetAccountDetailsById,
  mockConfigGet,
  mockGetB2cAuthorityPrefix,
  mockBuildB2cLogoutUrl,
  mockResolvePostLogoutAbsoluteUri
} = vi.hoisted(() => ({
  mockGetAccountDetailsById: vi.fn(),
  mockConfigGet: vi.fn(),
  mockGetB2cAuthorityPrefix: vi.fn(),
  mockBuildB2cLogoutUrl: vi.fn(),
  mockResolvePostLogoutAbsoluteUri: vi.fn()
}))

vi.mock('#services/account-api.service.js', () => ({
  createAccountApiService: () => ({
    getAccountDetailsById: mockGetAccountDetailsById
  })
}))

vi.mock('#config/config.js', () => ({
  config: { get: mockConfigGet }
}))

vi.mock('#server/auth/azure-ad-b2c.js', () => ({
  BELL_AZURE_AD_B2C_COOKIE: 'bell-azure-ad-b2c',
  getB2cAuthorityPrefix: mockGetB2cAuthorityPrefix,
  buildB2cLogoutUrl: mockBuildB2cLogoutUrl,
  resolvePostLogoutAbsoluteUri: mockResolvePostLogoutAbsoluteUri
}))

const mockAccountDetails = {
  firstName: 'Jane',
  lastName: 'Smith',
  organisationName: 'Test Agency',
  serviceRole: 'Regulator Admin',
  serviceRoleId: 4,
  contactEmail: 'jane.smith@test.gov.uk',
  nationId: 1
}

// Credentials shape after Bell parses the Azure AD B2C id_token into a profile
const credentials = {
  profile: {
    oid: 'user-oid-123',
    email: 'jane@example.com'
  }
}

function makeYar({ returnTo = null, authLocale = null } = {}) {
  const store = {
    ...(returnTo ? { returnTo } : {}),
    ...(authLocale ? { authLocale } : {})
  }
  return {
    get: vi.fn((key) => store[key] ?? null),
    set: vi.fn((key, val) => {
      store[key] = val
    }),
    clear: vi.fn((key) => {
      delete store[key]
    }),
    _store: store
  }
}

function makeH() {
  return {
    redirect: vi.fn((url) => `redirect:${url}`),
    unstate: vi.fn()
  }
}

describe('signinOidcController', () => {
  describe('with valid credentials', () => {
    beforeEach(() => {
      mockGetAccountDetailsById.mockResolvedValue({ ...mockAccountDetails })
    })

    it('calls getAccountDetailsById with the oid from credentials profile', async () => {
      await signinOidcController.handler(
        { auth: { credentials }, yar: makeYar() },
        makeH()
      )

      expect(mockGetAccountDetailsById).toHaveBeenCalledWith('user-oid-123')
    })

    it('stores the user in yar with id from credentials profile oid', async () => {
      const yar = makeYar()
      await signinOidcController.handler(
        { auth: { credentials }, yar },
        makeH()
      )

      const stored = yar.set.mock.calls.find(([key]) => key === 'user')?.[1]
      expect(stored?.id).toBe('user-oid-123')
      expect(stored?.authProfile).toEqual({
        oid: 'user-oid-123',
        sub: undefined,
        email: 'jane@example.com',
        emails: undefined
      })
    })

    it('stores the user in yar with email from credentials profile', async () => {
      const yar = makeYar()
      await signinOidcController.handler(
        { auth: { credentials }, yar },
        makeH()
      )

      const stored = yar.set.mock.calls.find(([key]) => key === 'user')?.[1]
      expect(stored?.email).toBe('jane@example.com')
    })

    it('uses profile sub when oid is absent and falls back to contactEmail', async () => {
      const yar = makeYar()
      await signinOidcController.handler(
        {
          auth: {
            credentials: {
              profile: {
                sub: '22222222-2222-4222-8222-222222222222',
                emails: ['jane.smith@test.gov.uk']
              }
            }
          },
          yar
        },
        makeH()
      )

      expect(mockGetAccountDetailsById).toHaveBeenCalledWith(
        '22222222-2222-4222-8222-222222222222'
      )

      const stored = yar.set.mock.calls.find(([key]) => key === 'user')?.[1]
      expect(stored?.id).toBe('22222222-2222-4222-8222-222222222222')
      expect(stored?.email).toBe('jane.smith@test.gov.uk')
    })

    it('stores the user in yar with name derived from firstName and lastName', async () => {
      const yar = makeYar()
      await signinOidcController.handler(
        { auth: { credentials }, yar },
        makeH()
      )

      const stored = yar.set.mock.calls.find(([key]) => key === 'user')?.[1]
      expect(stored?.name).toBe('Jane Smith')
    })

    it('stores the full account details alongside id, email, and name', async () => {
      const yar = makeYar()
      await signinOidcController.handler(
        { auth: { credentials }, yar },
        makeH()
      )

      const stored = yar.set.mock.calls.find(([key]) => key === 'user')?.[1]
      expect(stored).toMatchObject(mockAccountDetails)
    })

    it('redirects to / when no returnTo is set', async () => {
      const h = makeH()
      await signinOidcController.handler(
        { auth: { credentials }, yar: makeYar() },
        h
      )

      expect(h.redirect).toHaveBeenCalledWith('/')
    })

    it('redirects to the returnTo URL when one is set', async () => {
      const h = makeH()
      await signinOidcController.handler(
        {
          auth: { credentials },
          yar: makeYar({ returnTo: '/certificates-of-compliance?tab=pending' })
        },
        h
      )

      expect(h.redirect).toHaveBeenCalledWith(
        '/certificates-of-compliance?tab=pending'
      )
    })

    it('clears returnTo from the session after redirecting', async () => {
      const yar = makeYar({ returnTo: '/some-path' })
      await signinOidcController.handler(
        { auth: { credentials }, yar },
        makeH()
      )

      expect(yar.clear).toHaveBeenCalledWith('returnTo')
    })

    it('appends lang=cy to returnTo from authLocale after OAuth sign-in', async () => {
      const h = makeH()
      await signinOidcController.handler(
        {
          auth: { credentials },
          query: {},
          headers: { 'accept-language': 'en-GB' },
          yar: makeYar({
            returnTo: '/certificates-of-compliance/download',
            authLocale: 'cy'
          })
        },
        h
      )

      expect(h.redirect).toHaveBeenCalledWith(
        '/certificates-of-compliance/download?lang=cy'
      )
    })

    it('clears authLocale from the session after redirecting', async () => {
      const yar = makeYar({ authLocale: 'cy' })
      await signinOidcController.handler(
        {
          auth: { credentials },
          query: {},
          headers: {},
          yar
        },
        makeH()
      )

      expect(yar.clear).toHaveBeenCalledWith('authLocale')
    })
  })

  describe('without a regulator service role', () => {
    const nonRegulatorAccount = {
      firstName: 'Percy',
      lastName: 'Producer',
      serviceRole: 'Basic User',
      serviceRoleId: 3
    }

    it('responds with 403 forbidden for a non-regulator account', async () => {
      mockGetAccountDetailsById.mockResolvedValue(nonRegulatorAccount)
      const result = await signinOidcController.handler(
        { auth: { credentials }, yar: makeYar() },
        makeH()
      )

      expect(result.isBoom).toBe(true)
      expect(result.output.statusCode).toBe(403)
    })

    it('responds with 403 forbidden when the account lookup returns no details', async () => {
      mockGetAccountDetailsById.mockResolvedValue({})
      const result = await signinOidcController.handler(
        { auth: { credentials }, yar: makeYar() },
        makeH()
      )

      expect(result.output.statusCode).toBe(403)
    })

    it('does not store a user in the session for a non-regulator', async () => {
      mockGetAccountDetailsById.mockResolvedValue(nonRegulatorAccount)
      const yar = makeYar()
      await signinOidcController.handler(
        { auth: { credentials }, yar },
        makeH()
      )

      expect(yar.set).not.toHaveBeenCalledWith('user', expect.anything())
    })

    it('does not redirect a non-regulator into the service', async () => {
      mockGetAccountDetailsById.mockResolvedValue(nonRegulatorAccount)
      const h = makeH()
      await signinOidcController.handler(
        { auth: { credentials }, yar: makeYar() },
        h
      )

      expect(h.redirect).not.toHaveBeenCalled()
    })
  })

  describe('without credentials', () => {
    it('does not call the account API', async () => {
      await signinOidcController.handler(
        { auth: null, yar: makeYar() },
        makeH()
      )

      expect(mockGetAccountDetailsById).not.toHaveBeenCalled()
    })

    it('does not set user in the session', async () => {
      const yar = makeYar()
      await signinOidcController.handler({ auth: null, yar }, makeH())

      expect(yar.set).not.toHaveBeenCalledWith('user', expect.anything())
    })

    it('still redirects to / when there are no credentials', async () => {
      const h = makeH()
      await signinOidcController.handler({ auth: null, yar: makeYar() }, h)

      expect(h.redirect).toHaveBeenCalledWith('/')
    })

    it('still redirects to returnTo when one is set and there are no credentials', async () => {
      const h = makeH()
      await signinOidcController.handler(
        { auth: null, yar: makeYar({ returnTo: '/dashboard' }) },
        h
      )

      expect(h.redirect).toHaveBeenCalledWith('/dashboard')
    })
  })
})

describe('signOutController', () => {
  const azureConfig = {
    postLogoutRedirectPath: '/signed-out',
    redirectUri: 'https://myapp.com/auth/callback'
  }

  function makeSignOutRequest(overrides = {}) {
    return {
      yar: { reset: vi.fn() },
      query: {},
      headers: { host: 'localhost:3000' },
      server: { info: { protocol: 'http' } },
      info: { host: 'localhost:3000' },
      log: vi.fn(),
      ...overrides
    }
  }

  beforeEach(() => {
    mockConfigGet.mockImplementation((key) => {
      if (key === 'useMockAuth') return false
      if (key === 'auth.azureAdB2c') return azureConfig
      return undefined
    })
    mockGetB2cAuthorityPrefix.mockReturnValue(
      'https://mytenant.b2clogin.com/mytenant.onmicrosoft.com/B2C_1_signupsignin'
    )
    mockResolvePostLogoutAbsoluteUri.mockReturnValue(
      'https://myapp.com/signed-out'
    )
    mockBuildB2cLogoutUrl.mockReturnValue(
      'https://mytenant.b2clogin.com/mytenant.onmicrosoft.com/B2C_1_signupsignin/oauth2/v2.0/logout?post_logout_redirect_uri=https%3A%2F%2Fmyapp.com%2Fsigned-out'
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('session and cookie cleanup', () => {
    it('resets the yar session', async () => {
      const request = makeSignOutRequest()
      await signOutController.handler(request, makeH())

      expect(request.yar.reset).toHaveBeenCalled()
    })

    it('unstates auth cookies across known path variants', async () => {
      const h = makeH()
      await signOutController.handler(makeSignOutRequest(), h)

      expect(h.unstate).toHaveBeenCalledWith('session', { path: '/' })
      expect(h.unstate).toHaveBeenCalledWith('session', {
        path: '/certificates-of-compliance'
      })
      expect(h.unstate).toHaveBeenCalledWith('session', { path: '/dashboard' })
      expect(h.unstate).toHaveBeenCalledWith('bell-azure-ad-b2c', {
        path: '/'
      })
      expect(h.unstate).toHaveBeenCalledWith('bell-azure-ad-b2c', {
        path: '/certificates-of-compliance'
      })
      expect(h.unstate).toHaveBeenCalledWith('bell-azure-ad-b2c', {
        path: '/dashboard'
      })
    })

    it('also clears cookies for x-forwarded-prefix path', async () => {
      const h = makeH()
      await signOutController.handler(
        makeSignOutRequest({
          headers: {
            host: 'localhost:3000',
            'x-forwarded-prefix': '/packaging-waste-regulators'
          }
        }),
        h
      )

      expect(h.unstate).toHaveBeenCalledWith('session', {
        path: '/packaging-waste-regulators'
      })
      expect(h.unstate).toHaveBeenCalledWith('bell-azure-ad-b2c', {
        path: '/packaging-waste-regulators'
      })
    })

    it('does not throw when yar is absent', async () => {
      const request = makeSignOutRequest()
      request.yar = undefined
      await expect(
        signOutController.handler(request, makeH())
      ).resolves.not.toThrow()
    })
  })

  describe('redirect', () => {
    it('redirects to the B2C logout URL when prefix is available', async () => {
      const h = makeH()
      await signOutController.handler(makeSignOutRequest(), h)

      expect(h.redirect).toHaveBeenCalledWith(
        mockBuildB2cLogoutUrl.mock.results[0].value
      )
    })

    it('calls buildB2cLogoutUrl with the prefix and resolved post-logout URI', async () => {
      await signOutController.handler(makeSignOutRequest(), makeH())

      expect(mockBuildB2cLogoutUrl).toHaveBeenCalledWith(
        'https://mytenant.b2clogin.com/mytenant.onmicrosoft.com/B2C_1_signupsignin',
        'https://myapp.com/signed-out'
      )
    })

    it('falls back to /signed-out when no authority prefix is available', async () => {
      mockGetB2cAuthorityPrefix.mockReturnValue(null)
      const h = makeH()
      await signOutController.handler(makeSignOutRequest(), h)

      expect(h.redirect).toHaveBeenCalledWith('/signed-out')
    })

    it('uses postLogoutRedirectPath from config as the path', async () => {
      mockConfigGet.mockImplementation((key) => {
        if (key === 'useMockAuth') return false
        if (key === 'auth.azureAdB2c') {
          return {
            ...azureConfig,
            postLogoutRedirectPath: '/custom-signed-out'
          }
        }
        return undefined
      })
      await signOutController.handler(makeSignOutRequest(), makeH())

      expect(mockResolvePostLogoutAbsoluteUri).toHaveBeenCalledWith(
        expect.anything(),
        '/custom-signed-out',
        expect.anything()
      )
    })

    it('defaults postLogoutRedirectPath to /signed-out when not configured', async () => {
      mockConfigGet.mockImplementation((key) => {
        if (key === 'useMockAuth') return false
        if (key === 'auth.azureAdB2c') {
          return { redirectUri: 'https://myapp.com/cb' }
        }
        return undefined
      })
      await signOutController.handler(makeSignOutRequest(), makeH())

      expect(mockResolvePostLogoutAbsoluteUri).toHaveBeenCalledWith(
        expect.anything(),
        '/signed-out',
        expect.anything()
      )
    })
  })

  describe('mock auth logout', () => {
    beforeEach(() => {
      mockConfigGet.mockImplementation((key) => {
        if (key === 'useMockAuth') return true
        if (key === 'auth.azureAdB2c') return azureConfig
        return undefined
      })
    })

    it('redirects to /signed-out without calling B2C logout', async () => {
      const h = makeH()
      await signOutController.handler(makeSignOutRequest(), h)

      expect(h.redirect).toHaveBeenCalledWith('/signed-out')
      expect(mockBuildB2cLogoutUrl).not.toHaveBeenCalled()
    })

    it('redirects to an absolute returnTo query param when chained from dashboard', async () => {
      const h = makeH()
      await signOutController.handler(
        makeSignOutRequest({
          query: { returnTo: 'https://localhost:7154/signed-out' }
        }),
        h
      )

      expect(h.redirect).toHaveBeenCalledWith(
        'https://localhost:7154/signed-out'
      )
    })

    it('redirects to CSOC signed-out first for broadcast chained logouts', async () => {
      const h = makeH()
      await signOutController.handler(
        makeSignOutRequest({
          query: {
            returnTo: 'https://localhost:7154/signed-out',
            broadcast: 'true'
          }
        }),
        h
      )

      expect(h.redirect).toHaveBeenCalledWith(
        '/signed-out?returnTo=https%3A%2F%2Flocalhost%3A7154%2Fsigned-out'
      )
    })

    it('returns 204 for background logout requests', async () => {
      const h = {
        ...makeH(),
        response: vi.fn(() => ({
          code: vi.fn(() => 'background-logout-response')
        }))
      }

      const result = await signOutController.handler(
        makeSignOutRequest({
          query: { background: 'true' }
        }),
        h
      )

      expect(result).toBe('background-logout-response')
      expect(h.redirect).not.toHaveBeenCalled()
    })
  })

  describe('external logoutUrl', () => {
    function mockAzureConfig(overrides = {}) {
      mockConfigGet.mockImplementation((key) => {
        if (key === 'useMockAuth') return false
        if (key === 'auth.azureAdB2c') {
          return { ...azureConfig, ...overrides }
        }
        return undefined
      })
    }

    function makeFetchResponse({ status = 200, location, cookies } = {}) {
      const headers = new Headers()
      if (location) headers.set('location', location)
      if (cookies) {
        cookies.forEach((c) => headers.append('set-cookie', c))
      }
      return { status, headers }
    }

    it('fetches the external logoutUrl when configured', async () => {
      mockAzureConfig({ logoutUrl: 'https://external.example.com/logout' })
      const fetchSpy = vi
        .spyOn(global, 'fetch')
        .mockResolvedValue(makeFetchResponse({ status: 200 }))

      await signOutController.handler(makeSignOutRequest(), makeH())

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://external.example.com/logout',
        { redirect: 'manual' }
      )
    })

    it('does not fetch when logoutUrl is not configured', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch')
      await signOutController.handler(makeSignOutRequest(), makeH())

      expect(fetchSpy).not.toHaveBeenCalled()
    })

    it('unstates cookies returned by the external logout response', async () => {
      mockAzureConfig({ logoutUrl: 'https://external.example.com/logout' })
      vi.spyOn(global, 'fetch').mockResolvedValue(
        makeFetchResponse({
          status: 200,
          cookies: ['session=; Max-Age=0', 'token=; Max-Age=0']
        })
      )
      const h = makeH()
      await signOutController.handler(makeSignOutRequest(), h)

      expect(h.unstate).toHaveBeenCalledWith('session')
      expect(h.unstate).toHaveBeenCalledWith('token')
    })

    it('follows redirects and clears cookies at each hop', async () => {
      mockAzureConfig({ logoutUrl: 'https://external.example.com/logout' })
      vi.spyOn(global, 'fetch')
        .mockResolvedValueOnce(
          makeFetchResponse({
            status: 302,
            location: 'https://external.example.com/logout2',
            cookies: ['hop1cookie=; Max-Age=0']
          })
        )
        .mockResolvedValueOnce(
          makeFetchResponse({
            status: 200,
            cookies: ['hop2cookie=; Max-Age=0']
          })
        )
      const h = makeH()
      await signOutController.handler(makeSignOutRequest(), h)

      expect(h.unstate).toHaveBeenCalledWith('hop1cookie')
      expect(h.unstate).toHaveBeenCalledWith('hop2cookie')
    })

    it('logs an error when fetch throws', async () => {
      mockAzureConfig({ logoutUrl: 'https://external.example.com/logout' })
      vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Network failure'))
      const request = makeSignOutRequest()
      await signOutController.handler(request, makeH())

      expect(request.log).toHaveBeenCalledWith(
        'error',
        expect.stringContaining('Network failure')
      )
    })

    it('still redirects to the B2C logout URL after a fetch error', async () => {
      mockAzureConfig({ logoutUrl: 'https://external.example.com/logout' })
      vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Network failure'))
      const h = makeH()
      await signOutController.handler(makeSignOutRequest(), h)

      expect(h.redirect).toHaveBeenCalledWith(
        mockBuildB2cLogoutUrl.mock.results[0].value
      )
    })
  })
})
