import { createServer } from '#/server/server.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { mockDetailData } from '../certificates-of-compliance.service.js'

const ORG_ID = 'org-123'
const CERT_ID = '101411'
const ACCEPT_URL = `/${ORG_ID}/certificates-of-compliance/${CERT_ID}/accept`
const DETAIL_URL = `/${ORG_ID}/certificates-of-compliance/${CERT_ID}`

// hapi/yar stores the session in the cookie itself by default, so each
// response carries an updated Set-Cookie that the next request must use.
function nextCookie(response, fallback) {
  return response.headers['set-cookie']?.[0]?.split(';')[0] ?? fallback
}

describe('#certificatesOfComplianceAcceptController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  async function signIn() {
    const { headers } = await server.inject({
      method: 'GET',
      url: '/signin-oidc'
    })
    return headers['set-cookie']?.[0]?.split(';')[0]
  }

  const get = (url, cookie) =>
    server.inject({ method: 'GET', url, headers: { cookie } })

  const post = (url, payload, cookie) =>
    server.inject({
      method: 'POST',
      url,
      payload,
      headers: {
        cookie,
        'content-type': 'application/x-www-form-urlencoded'
      }
    })

  describe('GET', () => {
    it('redirects unauthenticated users to /signin-oidc', async () => {
      const response = await server.inject({ method: 'GET', url: ACCEPT_URL })
      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe('/signin-oidc')
    })

    it('returns 200 and renders the confirmation form for an authenticated user', async () => {
      const cookie = await signIn()
      const response = await get(ACCEPT_URL, cookie)
      expect(response.statusCode).toBe(statusCodes.ok)
      expect(response.payload).toContain(
        `Are you sure you want to accept this certificate for ${mockDetailData.organisation.name}?`
      )
      expect(response.payload).toContain('name="confirm-accept"')
      expect(response.payload).toContain('value="yes"')
      expect(response.payload).toContain('value="no"')
      expect(response.payload).toContain('Continue')
    })

    it('back link points to the detail page', async () => {
      const cookie = await signIn()
      const response = await get(ACCEPT_URL, cookie)
      expect(response.payload).toContain(`href="${DETAIL_URL}"`)
    })
  })

  describe('POST', () => {
    it('redirects unauthenticated users to /signin-oidc', async () => {
      const response = await server.inject({
        method: 'POST',
        url: ACCEPT_URL,
        payload: 'confirm-accept=yes',
        headers: { 'content-type': 'application/x-www-form-urlencoded' }
      })
      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe('/signin-oidc')
    })

    it('re-renders with an error summary when no choice is made', async () => {
      const cookie = await signIn()
      const response = await post(ACCEPT_URL, '', cookie)
      expect(response.statusCode).toBe(statusCodes.ok)
      expect(response.payload).toContain('There is a problem')
      expect(response.payload).toContain('Select yes or no')
      expect(response.payload).toContain('href="#confirm-accept"')
    })

    it('re-renders with an error summary when an invalid choice is sent', async () => {
      const cookie = await signIn()
      const response = await post(ACCEPT_URL, 'confirm-accept=maybe', cookie)
      expect(response.statusCode).toBe(statusCodes.ok)
      expect(response.payload).toContain('Select yes or no')
    })

    it('redirects to the detail page when "no" is chosen, with no success flash', async () => {
      const cookie = await signIn()
      const noResponse = await post(ACCEPT_URL, 'confirm-accept=no', cookie)
      expect(noResponse.statusCode).toBe(302)
      expect(noResponse.headers.location).toBe(DETAIL_URL)

      const detailResponse = await get(
        DETAIL_URL,
        nextCookie(noResponse, cookie)
      )
      expect(detailResponse.statusCode).toBe(statusCodes.ok)
      expect(detailResponse.payload).not.toContain(
        'Certificate has been accepted.'
      )
    })

    it('redirects to the detail page when "yes" is chosen and sets the success flash', async () => {
      const cookie = await signIn()
      const yesResponse = await post(ACCEPT_URL, 'confirm-accept=yes', cookie)
      expect(yesResponse.statusCode).toBe(302)
      expect(yesResponse.headers.location).toBe(DETAIL_URL)

      const detailResponse = await get(
        DETAIL_URL,
        nextCookie(yesResponse, cookie)
      )
      expect(detailResponse.statusCode).toBe(statusCodes.ok)
      expect(detailResponse.payload).toContain('Certificate accepted')
      expect(detailResponse.payload).toContain('Certificate has been accepted.')
    })

    it('shows the success banner only once after a "yes" submission', async () => {
      const cookie = await signIn()
      const yesResponse = await post(ACCEPT_URL, 'confirm-accept=yes', cookie)
      const firstView = await get(DETAIL_URL, nextCookie(yesResponse, cookie))
      expect(firstView.payload).toContain('Certificate has been accepted.')

      const secondView = await get(
        DETAIL_URL,
        nextCookie(firstView, nextCookie(yesResponse, cookie))
      )
      expect(secondView.payload).not.toContain('Certificate has been accepted.')
    })
  })
})
