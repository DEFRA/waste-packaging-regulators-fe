import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  signinOidcController,
  signInFailedController,
  signOutController
} from './controller.js'

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

const signedIn = { isAuthenticated: true, credentials }

function makeYar(initial = {}) {
  const store = Object.fromEntries(
    Object.entries(initial).filter(([, value]) => value)
  )
  return {
    id: 'session-id',
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
    view: vi.fn(() => ({ code: vi.fn((status) => ({ status })) })),
    unstate: vi.fn()
  }
}

function makeLogger() {
  return { warn: vi.fn() }
}

describe('signinOidcController', () => {
  describe('with valid credentials', () => {
    beforeEach(() => {
      mockGetAccountDetailsById.mockResolvedValue({ ...mockAccountDetails })
    })

    it('calls getAccountDetailsById with the oid from credentials profile', async () => {
      await signinOidcController.handler(
        { auth: signedIn, yar: makeYar() },
        makeH()
      )

      expect(mockGetAccountDetailsById).toHaveBeenCalledWith('user-oid-123')
    })

    it('stores the user in yar with id from credentials profile oid', async () => {
      const yar = makeYar()
      await signinOidcController.handler({ auth: signedIn, yar }, makeH())

      const stored = yar.set.mock.calls.find(([key]) => key === 'user')?.[1]
      expect(stored?.id).toBe('user-oid-123')
    })

    it('stores the user in yar with email from credentials profile', async () => {
      const yar = makeYar()
      await signinOidcController.handler({ auth: signedIn, yar }, makeH())

      const stored = yar.set.mock.calls.find(([key]) => key === 'user')?.[1]
      expect(stored?.email).toBe('jane@example.com')
    })

    it('stores the user in yar with name derived from firstName and lastName', async () => {
      const yar = makeYar()
      await signinOidcController.handler({ auth: signedIn, yar }, makeH())

      const stored = yar.set.mock.calls.find(([key]) => key === 'user')?.[1]
      expect(stored?.name).toBe('Jane Smith')
    })

    it('stores the full account details alongside id, email, and name', async () => {
      const yar = makeYar()
      await signinOidcController.handler({ auth: signedIn, yar }, makeH())

      const stored = yar.set.mock.calls.find(([key]) => key === 'user')?.[1]
      expect(stored).toMatchObject(mockAccountDetails)
    })

    it('redirects to / when no returnTo is set', async () => {
      const h = makeH()
      await signinOidcController.handler({ auth: signedIn, yar: makeYar() }, h)

      expect(h.redirect).toHaveBeenCalledWith('/')
    })

    it('redirects to the returnTo URL when one is set', async () => {
      const h = makeH()
      await signinOidcController.handler(
        {
          auth: signedIn,
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
      await signinOidcController.handler({ auth: signedIn, yar }, makeH())

      expect(yar.clear).toHaveBeenCalledWith('returnTo')
    })

    it('appends lang=cy to returnTo from authLocale after OAuth sign-in', async () => {
      const h = makeH()
      await signinOidcController.handler(
        {
          auth: signedIn,
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
          auth: signedIn,
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
        { auth: signedIn, yar: makeYar() },
        makeH()
      )

      expect(result.isBoom).toBe(true)
      expect(result.output.statusCode).toBe(403)
    })

    it('responds with 403 forbidden when the account lookup returns no details', async () => {
      mockGetAccountDetailsById.mockResolvedValue({})
      const result = await signinOidcController.handler(
        { auth: signedIn, yar: makeYar() },
        makeH()
      )

      expect(result.output.statusCode).toBe(403)
    })

    it('does not store a user in the session for a non-regulator', async () => {
      mockGetAccountDetailsById.mockResolvedValue(nonRegulatorAccount)
      const yar = makeYar()
      await signinOidcController.handler({ auth: signedIn, yar }, makeH())

      expect(yar.set).not.toHaveBeenCalledWith('user', expect.anything())
    })

    it('clears a user left in the session by an earlier sign-in', async () => {
      mockGetAccountDetailsById.mockResolvedValue(nonRegulatorAccount)
      const yar = makeYar({ user: { name: 'Jane Smith' } })
      await signinOidcController.handler({ auth: signedIn, yar }, makeH())

      expect(yar.get('user')).toBeNull()
      expect(yar.get('deniedUser')).toEqual({ name: 'Percy Producer' })
    })

    it('does not redirect a non-regulator into the service', async () => {
      mockGetAccountDetailsById.mockResolvedValue(nonRegulatorAccount)
      const h = makeH()
      await signinOidcController.handler({ auth: signedIn, yar: makeYar() }, h)

      expect(h.redirect).not.toHaveBeenCalled()
    })

    it('records the refused person by display name, so the 403 page can offer sign out', async () => {
      mockGetAccountDetailsById.mockResolvedValue(nonRegulatorAccount)
      const yar = makeYar()
      await signinOidcController.handler({ auth: signedIn, yar }, makeH())

      expect(yar.set).toHaveBeenCalledWith('deniedUser', {
        name: 'Percy Producer'
      })
    })

    it('records an empty display name when the account lookup returns no details', async () => {
      mockGetAccountDetailsById.mockResolvedValue({})
      const yar = makeYar()
      await signinOidcController.handler({ auth: signedIn, yar }, makeH())

      expect(yar.set).toHaveBeenCalledWith('deniedUser', { name: '' })
    })
  })

  describe('after a refused sign-in', () => {
    it('clears deniedUser once a regulator signs in', async () => {
      mockGetAccountDetailsById.mockResolvedValue({ ...mockAccountDetails })
      const yar = makeYar()
      await signinOidcController.handler({ auth: signedIn, yar }, makeH())

      expect(yar.clear).toHaveBeenCalledWith('deniedUser')
    })
  })

  describe('when B2C signs someone in without an id_token', () => {
    it.each([
      ['there is no profile', { isAuthenticated: true, credentials: {} }],
      [
        'the profile has no oid claim',
        {
          isAuthenticated: true,
          credentials: { profile: { email: 'jane@example.com' } }
        }
      ]
    ])('answers with an explicit 500 when %s', async (_case, auth) => {
      const yar = makeYar()
      const result = await signinOidcController.handler({ auth, yar }, makeH())

      expect(result.isBoom).toBe(true)
      expect(result.output.statusCode).toBe(500)
      expect(result.message).toBe(
        'B2C sign-in returned no id_token with an oid claim'
      )
      expect(mockGetAccountDetailsById).not.toHaveBeenCalled()
      expect(yar.set).not.toHaveBeenCalled()
    })
  })

  describe('when the sign-in callback fails', () => {
    // What Bell hands the handler in `try` mode: not authenticated, an error
    // naming the cause, and partial credentials that carry no profile.
    function failedRequest({
      message,
      data,
      query = {},
      yar = makeYar(),
      logger = makeLogger()
    } = {}) {
      const error = message ? new Error(message) : undefined
      if (error && data) {
        error.data = data
      }
      return {
        auth: {
          isAuthenticated: false,
          credentials: { provider: 'azure-ad-b2c', query: {} },
          error
        },
        query,
        headers: {},
        yar,
        logger
      }
    }

    const cancelledDescription =
      'AADB2C90091: The user has cancelled entering self-asserted information.\r\nCorrelation ID: 1234'

    it.each([
      [
        'B2C returns access_denied',
        {
          message: `App rejected: ${cancelledDescription}`,
          query: {
            error: 'access_denied',
            error_description: cancelledDescription
          }
        },
        'access_denied'
      ],
      [
        'the state does not match',
        {
          message: 'Incorrect azure-ad-b2c state parameter',
          query: { code: 'auth-code', state: 'stale-state' }
        },
        'state_mismatch'
      ],
      [
        'the state cookie is missing or expired',
        {
          message: 'Missing azure-ad-b2c request token cookie',
          query: { code: 'auth-code', state: 'some-state', refresh: '1' }
        },
        'missing_state_cookie'
      ],
      [
        'the code-for-token exchange fails',
        {
          message: 'Failed obtaining azure-ad-b2c access token',
          query: { code: 'auth-code', state: 'some-state' }
        },
        'token_exchange_failed'
      ]
    ])(
      'redirects to the sign-in-failed page and logs a warning when %s',
      async (_case, options, reason) => {
        const logger = makeLogger()
        const result = await signinOidcController.handler(
          failedRequest({ ...options, logger }),
          makeH()
        )

        expect(result).toBe('redirect:/sign-in-failed')
        expect(logger.warn).toHaveBeenCalledWith(
          { signIn: expect.objectContaining({ reason }) },
          `Sign-in callback failed: ${reason}`
        )
      }
    )

    it.each([
      ['a failure it does not recognise', 'Something else went wrong'],
      ['no error from Bell at all', undefined]
    ])('logs reason unknown for %s', async (_case, message) => {
      const logger = makeLogger()
      await signinOidcController.handler(
        failedRequest({ message, logger }),
        makeH()
      )

      expect(logger.warn).toHaveBeenCalledWith(
        { signIn: { reason: 'unknown' } },
        'Sign-in callback failed: unknown'
      )
    })

    it("logs B2C's error and AADB2C code but not its free-text description", async () => {
      const logger = makeLogger()
      await signinOidcController.handler(
        failedRequest({
          message: `App rejected: ${cancelledDescription}`,
          query: {
            error: 'access_denied',
            error_description: cancelledDescription
          },
          logger
        }),
        makeH()
      )

      expect(logger.warn).toHaveBeenCalledWith(
        {
          signIn: {
            reason: 'access_denied',
            b2cError: 'access_denied',
            b2cErrorCode: 'AADB2C90091'
          }
        },
        'Sign-in callback failed: access_denied'
      )
    })

    it('leaves out a B2C error value that is not an OAuth error code', async () => {
      const logger = makeLogger()
      await signinOidcController.handler(
        failedRequest({
          message: 'Something else went wrong',
          query: { error: '<script>alert(1)</script>' },
          logger
        }),
        makeH()
      )

      expect(logger.warn.mock.calls[0][0].signIn).not.toHaveProperty('b2cError')
    })

    it('keeps the auth code, state and token payload out of the log', async () => {
      const logger = makeLogger()
      await signinOidcController.handler(
        failedRequest({
          message: 'Failed obtaining azure-ad-b2c access token',
          data: {
            access_token: 'secret-access-token',
            id_token: 'secret-id-token'
          },
          query: { code: 'secret-auth-code', state: 'secret-state' },
          logger
        }),
        makeH()
      )

      expect(JSON.stringify(logger.warn.mock.calls)).not.toContain('secret-')
    })

    it('does not call the account API, even though Bell passes partial credentials', async () => {
      await signinOidcController.handler(
        failedRequest({ message: 'Incorrect azure-ad-b2c state parameter' }),
        makeH()
      )

      expect(mockGetAccountDetailsById).not.toHaveBeenCalled()
    })

    it('does not set user in the session', async () => {
      const yar = makeYar()
      await signinOidcController.handler(
        failedRequest({
          message: 'Incorrect azure-ad-b2c state parameter',
          yar
        }),
        makeH()
      )

      expect(yar.set).not.toHaveBeenCalledWith('user', expect.anything())
    })

    // returnTo is a protected page, which would send them straight back to
    // /signin-oidc: a loop.
    it('does not send the person back into the service or into sign-in by itself', async () => {
      const h = makeH()
      await signinOidcController.handler(
        failedRequest({
          message: 'Missing azure-ad-b2c request token cookie',
          yar: makeYar({ returnTo: '/certificates-of-compliance' })
        }),
        h
      )

      expect(h.redirect).toHaveBeenCalledTimes(1)
      expect(h.redirect).toHaveBeenCalledWith('/sign-in-failed')
    })

    it('keeps returnTo and authLocale so a retry lands where the person was going', async () => {
      const yar = makeYar({
        returnTo: '/certificates-of-compliance',
        authLocale: 'cy'
      })
      const result = await signinOidcController.handler(
        failedRequest({
          message: 'Incorrect azure-ad-b2c state parameter',
          yar
        }),
        makeH()
      )

      expect(result).toBe('redirect:/sign-in-failed?lang=cy')
      expect(yar.clear).not.toHaveBeenCalledWith('returnTo')
      expect(yar.clear).not.toHaveBeenCalledWith('authLocale')
    })

    it('redirects to the sign-in-failed page behind the proxy prefix', async () => {
      const result = await signinOidcController.handler(
        {
          ...failedRequest({
            message: 'Incorrect azure-ad-b2c state parameter'
          }),
          headers: { 'x-forwarded-prefix': '/certificates-of-compliance' }
        },
        makeH()
      )

      expect(result).toBe('redirect:/certificates-of-compliance/sign-in-failed')
    })

    it('sends someone already signed in on to returnTo when a callback is replayed', async () => {
      const yar = makeYar({
        user: { name: 'Jane Smith' },
        returnTo: '/certificates-of-compliance'
      })
      const h = makeH()
      await signinOidcController.handler(
        failedRequest({
          message: 'Missing azure-ad-b2c request token cookie',
          yar
        }),
        h
      )

      expect(h.redirect).toHaveBeenCalledWith('/certificates-of-compliance')
    })

    it('shows a refused person the 403 again when they reload its callback', async () => {
      const h = makeH()
      const result = await signinOidcController.handler(
        failedRequest({
          message: 'Missing azure-ad-b2c request token cookie',
          yar: makeYar({ deniedUser: { name: 'Percy Producer' } })
        }),
        h
      )

      expect(h.view).toHaveBeenCalledWith(
        'error/access-denied',
        expect.anything()
      )
      expect(result).toEqual({ status: 403 })
    })

    it('logs a refused person reloading its callback once, as a warning with the reason', async () => {
      const logger = makeLogger()
      const result = await signinOidcController.handler(
        failedRequest({
          message: 'Missing azure-ad-b2c request token cookie',
          yar: makeYar({ deniedUser: { name: 'Percy Producer' } }),
          logger
        }),
        makeH()
      )

      // Not a Boom, so boom-error-logger does not log it a second time.
      expect(result.isBoom).toBeUndefined()
      expect(logger.warn).toHaveBeenCalledTimes(1)
      expect(logger.warn).toHaveBeenCalledWith(
        { signIn: { reason: 'missing_state_cookie' } },
        'Sign-in callback failed: missing_state_cookie'
      )
    })
  })
})

describe('signInFailedController', () => {
  function render(request = {}) {
    const h = makeH()
    signInFailedController.handler(
      { query: {}, headers: {}, yar: makeYar(), ...request },
      h
    )
    return h.view.mock.calls[0]
  }

  it('renders the sign-in-failed page with a link to try again', () => {
    const [view, context] = render()

    expect(view).toBe('auth/sign-in-failed')
    expect(context).toEqual({
      pageTitle: 'Sorry, there was a problem signing you in',
      heading: 'Sorry, there was a problem signing you in',
      message:
        'This can happen if you cancelled signing in, or if the sign-in page was open for too long.',
      tryAgainText: 'Try signing in again',
      tryAgainUrl: '/signin-oidc'
    })
  })

  it('keeps Welsh on the try-again link, with English text until it is translated', () => {
    const [, context] = render({ query: { lang: 'cy' } })

    expect(context).toMatchObject({
      heading: 'Sorry, there was a problem signing you in',
      tryAgainUrl: '/signin-oidc?lang=cy'
    })
  })

  it('links the retry to /signin-oidc behind the proxy prefix', () => {
    const [, context] = render({
      headers: { 'x-forwarded-prefix': '/certificates-of-compliance' }
    })

    expect(context.tryAgainUrl).toBe('/certificates-of-compliance/signin-oidc')
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
