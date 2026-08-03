import { config } from '#config/config.js'
import { createServer } from '#server/server.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { authCookiesFromResponse } from '#test-helpers/cookies.js'

const HELP_DESK_EMAIL = 'eprcustomerservice@defra.gov.uk'
const LIST_URL = '/certificates-of-compliance?type=direct-producers&tab=pending'
const DETAIL_URL =
  '/497f6eca-6276-4993-bfeb-53cbbbba6f08/certificates-of-compliance/decl-101411'

describe('error pages — journey', () => {
  let server
  let sessionCookie

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
    const response = await server.inject({ method: 'GET', url: '/signin-oidc' })
    sessionCookie = authCookiesFromResponse(response)
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  afterEach(() => {
    config.set('mockErrorStatus', null)
  })

  const inject = (url) =>
    server.inject({ method: 'GET', url, headers: { cookie: sessionCookie } })

  describe('preview routes', () => {
    it('lists every example on the index page', async () => {
      const response = await inject('/error-examples')

      expect(response.statusCode).toBe(statusCodes.ok)
      for (const statusCode of [403, 404, 500, 503]) {
        expect(response.payload).toContain(`/error-examples/${statusCode}`)
      }
    })

    it('shows the access denied page with its status code', async () => {
      const response = await inject('/error-examples/403')

      expect(response.statusCode).toBe(statusCodes.forbidden)
      expect(response.payload).toContain(
        'You do not have permission to access this page'
      )
      expect(response.payload).toContain(`mailto:${HELP_DESK_EMAIL}`)
    })

    it('shows the page not found page with its status code', async () => {
      const response = await inject('/error-examples/404')

      expect(response.statusCode).toBe(statusCodes.notFound)
      expect(response.payload).toContain('Page not found')
      expect(response.payload).toContain(
        'If you pasted the web address, check you copied the entire address.'
      )
    })

    it('shows the problem with the service page with its status code', async () => {
      const response = await inject('/error-examples/500')

      expect(response.statusCode).toBe(statusCodes.internalServerError)
      expect(response.payload).toContain(
        'Sorry, there is a problem with the service'
      )
      expect(response.payload).toContain('Try again later.')
    })

    it('shows the service unavailable page with its status code', async () => {
      const response = await inject('/error-examples/503')

      expect(response.statusCode).toBe(statusCodes.serviceUnavailable)
      expect(response.payload).toContain('Sorry, the service is unavailable')
    })

    it('shows the not found page for an unknown example', async () => {
      const response = await inject('/error-examples/418')

      expect(response.statusCode).toBe(statusCodes.notFound)
      expect(response.payload).toContain('Page not found')
    })
  })

  describe('an unknown address', () => {
    it('shows the page not found page', async () => {
      const response = await inject('/no-such-page')

      expect(response.statusCode).toBe(statusCodes.notFound)
      expect(response.payload).toContain('Page not found')
      expect(response.payload).toContain(
        'If you typed the web address, check it is correct.'
      )
    })
  })

  // MOCK_ERROR_STATUS makes the mocked services fail, so the journey reaches the
  // error pages through the real controller → boomify → onPreResponse path.
  describe('a failing service in mock mode', () => {
    it('shows the access denied page when the list request is forbidden', async () => {
      config.set('mockErrorStatus', statusCodes.forbidden)

      const response = await inject(LIST_URL)

      expect(response.statusCode).toBe(statusCodes.forbidden)
      expect(response.payload).toContain(
        'You do not have permission to access this page'
      )
    })

    it('shows the problem with the service page when the list request fails', async () => {
      config.set('mockErrorStatus', statusCodes.internalServerError)

      const response = await inject(LIST_URL)

      expect(response.statusCode).toBe(statusCodes.internalServerError)
      expect(response.payload).toContain(
        'Sorry, there is a problem with the service'
      )
      expect(response.payload).toContain(`mailto:${HELP_DESK_EMAIL}`)
    })

    it('shows the page not found page when the detail record is missing', async () => {
      config.set('mockErrorStatus', statusCodes.notFound)

      const response = await inject(DETAIL_URL)

      expect(response.statusCode).toBe(statusCodes.notFound)
      expect(response.payload).toContain('Page not found')
    })

    it('serves the page as normal once the failure is cleared', async () => {
      const response = await inject(LIST_URL)

      expect(response.statusCode).toBe(statusCodes.ok)
    })
  })
})
