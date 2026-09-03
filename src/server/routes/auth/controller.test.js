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
  serviceRoleId: 2,
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

  function makeSignOutRequest() {
    return {
      yar: { reset: vi.fn() },
      headers: { host: 'localhost:3000' },
      server: { info: { protocol: 'http' } },
      info: { host: 'localhost:3000' },
      log: vi.fn()
    }
  }

  beforeEach(() => {
    mockConfigGet.mockReturnValue(azureConfig)
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

    it('unstates the Bell Azure AD B2C cookie', async () => {
      const h = makeH()
      await signOutController.handler(makeSignOutRequest(), h)

      expect(h.unstate).toHaveBeenCalledWith('bell-azure-ad-b2c')
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
      mockConfigGet.mockReturnValue({
        ...azureConfig,
        postLogoutRedirectPath: '/custom-signed-out'
      })
      await signOutController.handler(makeSignOutRequest(), makeH())

      expect(mockResolvePostLogoutAbsoluteUri).toHaveBeenCalledWith(
        expect.anything(),
        '/custom-signed-out',
        expect.anything()
      )
    })

    it('defaults postLogoutRedirectPath to /signed-out when not configured', async () => {
      mockConfigGet.mockReturnValue({ redirectUri: 'https://myapp.com/cb' })
      await signOutController.handler(makeSignOutRequest(), makeH())

      expect(mockResolvePostLogoutAbsoluteUri).toHaveBeenCalledWith(
        expect.anything(),
        '/signed-out',
        expect.anything()
      )
    })
  })

  describe('external logoutUrl', () => {
    function makeFetchResponse({ status = 200, location, cookies } = {}) {
      const headers = new Headers()
      if (location) headers.set('location', location)
      if (cookies) {
        cookies.forEach((c) => headers.append('set-cookie', c))
      }
      return { status, headers }
    }

    it('fetches the external logoutUrl when configured', async () => {
      mockConfigGet.mockReturnValue({
        ...azureConfig,
        logoutUrl: 'https://external.example.com/logout'
      })
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
      mockConfigGet.mockReturnValue({
        ...azureConfig,
        logoutUrl: 'https://external.example.com/logout'
      })
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
      mockConfigGet.mockReturnValue({
        ...azureConfig,
        logoutUrl: 'https://external.example.com/logout'
      })
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
      mockConfigGet.mockReturnValue({
        ...azureConfig,
        logoutUrl: 'https://external.example.com/logout'
      })
      vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Network failure'))
      const request = makeSignOutRequest()
      await signOutController.handler(request, makeH())

      expect(request.log).toHaveBeenCalledWith(
        'error',
        expect.stringContaining('Network failure')
      )
    })

    it('still redirects to the B2C logout URL after a fetch error', async () => {
      mockConfigGet.mockReturnValue({
        ...azureConfig,
        logoutUrl: 'https://external.example.com/logout'
      })
      vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Network failure'))
      const h = makeH()
      await signOutController.handler(makeSignOutRequest(), h)

      expect(h.redirect).toHaveBeenCalledWith(
        mockBuildB2cLogoutUrl.mock.results[0].value
      )
    })
  })
})
