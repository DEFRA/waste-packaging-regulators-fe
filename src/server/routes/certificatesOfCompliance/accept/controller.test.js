import { createServer } from '#/server/server.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import {
  mockPendingItems,
  mockComplianceSchemePendingItems,
  mockAcceptedItems,
  mockDetailData,
  mockComplianceSchemeDetailData
} from '../certificates-of-compliance.mock.js'

const DP_ITEM = mockPendingItems[0]
const CS_ITEM = mockComplianceSchemePendingItems[0]
const ACCEPTED_ITEM = mockAcceptedItems[0]

const acceptUrlFor = (item) =>
  `/${item.organisationId}/certificates-of-compliance/${item.id}/accept`
const detailUrlFor = (item) =>
  `/${item.organisationId}/certificates-of-compliance/${item.id}`

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
      const response = await server.inject({
        method: 'GET',
        url: acceptUrlFor(DP_ITEM)
      })
      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe('/signin-oidc')
    })

    it('renders the confirmation form with certificate wording for a Direct Producer', async () => {
      const cookie = await signIn()
      const response = await get(acceptUrlFor(DP_ITEM), cookie)
      expect(response.statusCode).toBe(statusCodes.ok)
      expect(response.payload).toContain(
        `Are you sure you want to accept this certificate for ${mockDetailData.organisation.name}?`
      )
      expect(response.payload).toContain('name="confirm-accept"')
      expect(response.payload).toContain('value="yes"')
      expect(response.payload).toContain('value="no"')
      expect(response.payload).toContain('Continue')
    })

    it('renders the confirmation form with statement wording for a Compliance Scheme', async () => {
      const cookie = await signIn()
      const response = await get(acceptUrlFor(CS_ITEM), cookie)
      expect(response.statusCode).toBe(statusCodes.ok)
      expect(response.payload).toContain(
        `Are you sure you want to accept this statement for ${mockComplianceSchemeDetailData.organisation.complianceSchemeName}?`
      )
    })

    it('redirects to the detail page when the declaration is no longer pending', async () => {
      const cookie = await signIn()
      const response = await get(acceptUrlFor(ACCEPTED_ITEM), cookie)
      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe(detailUrlFor(ACCEPTED_ITEM))
    })
  })

  describe('POST', () => {
    it('redirects unauthenticated users to /signin-oidc', async () => {
      const response = await server.inject({
        method: 'POST',
        url: acceptUrlFor(DP_ITEM),
        payload: 'confirm-accept=yes',
        headers: { 'content-type': 'application/x-www-form-urlencoded' }
      })
      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe('/signin-oidc')
    })

    it('re-renders the form with an error summary when no choice is made', async () => {
      const cookie = await signIn()
      const response = await post(acceptUrlFor(DP_ITEM), '', cookie)
      expect(response.statusCode).toBe(statusCodes.ok)
      expect(response.payload).toContain('There is a problem')
      expect(response.payload).toContain('Select yes or no')
      expect(response.payload).toContain('href="#confirm-accept"')
    })

    it('re-renders the form when an invalid choice is sent', async () => {
      const cookie = await signIn()
      const response = await post(
        acceptUrlFor(DP_ITEM),
        'confirm-accept=maybe',
        cookie
      )
      expect(response.statusCode).toBe(statusCodes.ok)
      expect(response.payload).toContain('Select yes or no')
    })

    it('redirects to the detail page when "no" is chosen and shows no banner', async () => {
      const cookie = await signIn()
      const noResponse = await post(
        acceptUrlFor(DP_ITEM),
        'confirm-accept=no',
        cookie
      )
      expect(noResponse.statusCode).toBe(302)
      expect(noResponse.headers.location).toBe(detailUrlFor(DP_ITEM))

      const detailResponse = await get(
        detailUrlFor(DP_ITEM),
        nextCookie(noResponse, cookie)
      )
      expect(detailResponse.statusCode).toBe(statusCodes.ok)
      expect(detailResponse.payload).not.toContain('govuk-notification-banner')
    })

    it('redirects to the detail page when "yes" is chosen and shows the accepted banner', async () => {
      const cookie = await signIn()
      const yesResponse = await post(
        acceptUrlFor(DP_ITEM),
        'confirm-accept=yes',
        cookie
      )
      expect(yesResponse.statusCode).toBe(302)
      expect(yesResponse.headers.location).toBe(detailUrlFor(DP_ITEM))

      const detailResponse = await get(
        detailUrlFor(DP_ITEM),
        nextCookie(yesResponse, cookie)
      )
      expect(detailResponse.statusCode).toBe(statusCodes.ok)
      expect(detailResponse.payload).toContain('Certificate accepted')
      expect(detailResponse.payload).toContain('Certificate has been accepted.')
    })

    it('shows "Statement accepted" banner copy for a Compliance Scheme after "yes"', async () => {
      const cookie = await signIn()
      const yesResponse = await post(
        acceptUrlFor(CS_ITEM),
        'confirm-accept=yes',
        cookie
      )
      expect(yesResponse.statusCode).toBe(302)

      const detailResponse = await get(
        detailUrlFor(CS_ITEM),
        nextCookie(yesResponse, cookie)
      )
      expect(detailResponse.payload).toContain('Statement accepted')
      expect(detailResponse.payload).toContain('Statement has been accepted.')
    })
  })
})
