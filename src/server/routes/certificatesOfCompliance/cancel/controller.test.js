import { createServer } from '#server/server.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import {
  mockPendingItems,
  mockComplianceSchemePendingItems,
  mockDetailData,
  mockComplianceSchemeDetailData,
  mockDirectProducerCancelledDetailData
} from '../certificates-of-compliance.mock.js'
import {
  authCookiesFromResponse,
  csrfTokenCookieFromResponse,
  crumbTokenFromCookie,
  mergeCookiesFromResponse
} from '#test-helpers/cookies.js'
import { loadReasonPage, loadCheckPage } from './cancel.page-object.js'

const DP_ITEM = mockPendingItems[0]
const CS_ITEM = mockComplianceSchemePendingItems[0]
const CANCELLED_ITEM = {
  organisationId: mockDirectProducerCancelledDetailData.organisation.id,
  id: mockDirectProducerCancelledDetailData.id
}

const reasonUrlFor = (item) =>
  `/${item.organisationId}/certificates-of-compliance/${item.id}/cancel/reason`
const checkUrlFor = (item) =>
  `/${item.organisationId}/certificates-of-compliance/${item.id}/cancel/check`
// The cancellation itself posts to the bare …/cancel resource.
const actionUrlFor = (item) =>
  `/${item.organisationId}/certificates-of-compliance/${item.id}/cancel`
const detailUrlFor = (item) =>
  `/${item.organisationId}/certificates-of-compliance/${item.id}`

// hapi/yar stores the session in the cookie itself, so each response carries an
// updated Set-Cookie that the next request must reuse.
function nextCookie(response, fallback) {
  return mergeCookiesFromResponse(fallback, response)
}

describe('certificates of compliance — cancel', () => {
  let server
  let anonCrumbCookie

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()

    const anonResponse = await server.inject({
      method: 'GET',
      url: '/certificates-of-compliance'
    })
    anonCrumbCookie = csrfTokenCookieFromResponse(anonResponse)
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  async function signIn() {
    const response = await server.inject({ method: 'GET', url: '/signin-oidc' })
    return authCookiesFromResponse(response)
  }

  const get = (url, cookie) =>
    server.inject({ method: 'GET', url, headers: { cookie } })

  const post = (url, payload, cookie) => {
    const crumb = crumbTokenFromCookie(cookie)
    const body = [payload, `CSRFToken=${crumb}`].filter(Boolean).join('&')
    return server.inject({
      method: 'POST',
      url,
      payload: body,
      headers: { cookie, 'content-type': 'application/x-www-form-urlencoded' }
    })
  }

  // Choose a reason, then confirm — the two POSTs that make up a cancellation.
  // The reason travels in the form body, not the session.
  async function cancel(item, reason, cookie) {
    await post(reasonUrlFor(item), `cancel-reason=${reason}`, cookie)
    return post(actionUrlFor(item), `cancel-reason=${reason}`, cookie)
  }

  describe('GET reason page', () => {
    it('redirects unauthenticated users to /signin-oidc', async () => {
      const response = await server.inject({
        method: 'GET',
        url: reasonUrlFor(DP_ITEM)
      })
      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe('/signin-oidc')
    })

    it('renders the reason radios with certificate wording for a Direct Producer', async () => {
      const cookie = await signIn()
      const response = await get(reasonUrlFor(DP_ITEM), cookie)
      const page = loadReasonPage(response.payload)

      expect(response.statusCode).toBe(statusCodes.ok)
      expect(page.heading).toBe(
        `Why are you cancelling ${mockDetailData.organisation.name}'s certificate?`
      )
      expect(page.reasons.map((r) => r.value)).toEqual([
        'incorrect-signer',
        'obligations-changed',
        'submitted-early',
        'producer-request'
      ])
      expect(page.reasons[0].hint).toBe(
        'Name entered is not an approved or delegated person'
      )
      expect(page.reasons[2].label).toBe(
        'Producer can meet recycling obligations'
      )
      expect(page.hasCsrfToken).toBe(true)
    })

    it('renders the reason radios with statement wording for a Compliance Scheme', async () => {
      const cookie = await signIn()
      const response = await get(reasonUrlFor(CS_ITEM), cookie)
      const page = loadReasonPage(response.payload)

      expect(response.statusCode).toBe(statusCodes.ok)
      expect(page.heading).toBe(
        `Why are you cancelling ${mockComplianceSchemeDetailData.organisation.schemeOperatorName}'s statement?`
      )
      expect(page.reasons[2].label).toBe(
        'Compliance scheme can meet recycling obligations'
      )
    })

    it('pre-selects no reason on first load', async () => {
      const cookie = await signIn()
      const response = await get(reasonUrlFor(DP_ITEM), cookie)
      const page = loadReasonPage(response.payload)

      expect(page.reasons.every((r) => !r.checked)).toBe(true)
    })

    it('pre-selects the reason carried in the URL', async () => {
      const cookie = await signIn()
      const response = await get(
        `${reasonUrlFor(DP_ITEM)}?reason=obligations-changed`,
        cookie
      )
      const page = loadReasonPage(response.payload)

      const checked = page.reasons.filter((r) => r.checked).map((r) => r.value)
      expect(checked).toEqual(['obligations-changed'])
    })

    it('redirects to the detail page when the declaration is already cancelled', async () => {
      const cookie = await signIn()
      const response = await get(reasonUrlFor(CANCELLED_ITEM), cookie)
      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe(detailUrlFor(CANCELLED_ITEM))
    })
  })

  describe('POST reason page', () => {
    it('redirects unauthenticated users to /signin-oidc', async () => {
      const response = await post(
        reasonUrlFor(DP_ITEM),
        'cancel-reason=producer-request',
        anonCrumbCookie
      )
      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe('/signin-oidc')
    })

    it('rejects a request with no CSRF token', async () => {
      const response = await server.inject({
        method: 'POST',
        url: reasonUrlFor(DP_ITEM),
        payload: 'cancel-reason=producer-request',
        headers: { 'content-type': 'application/x-www-form-urlencoded' }
      })
      expect(response.statusCode).toBe(statusCodes.forbidden)
    })

    it('re-renders with an error summary when no reason is selected', async () => {
      const cookie = await signIn()
      const response = await post(reasonUrlFor(DP_ITEM), '', cookie)
      const page = loadReasonPage(response.payload)

      expect(response.statusCode).toBe(statusCodes.ok)
      expect(page.error.title).toBe('There is a problem')
      expect(page.error.message).toBe(
        'Select why you are cancelling this certificate'
      )
      expect(page.error.href).toBe('#cancel-reason')
    })

    it('re-renders with statement wording in the error for a Compliance Scheme', async () => {
      const cookie = await signIn()
      const response = await post(reasonUrlFor(CS_ITEM), '', cookie)

      expect(loadReasonPage(response.payload).error.message).toBe(
        'Select why you are cancelling this statement'
      )
    })

    it('re-renders when an unrecognised reason is submitted', async () => {
      const cookie = await signIn()
      const response = await post(
        reasonUrlFor(DP_ITEM),
        'cancel-reason=nonsense',
        cookie
      )
      const page = loadReasonPage(response.payload)

      expect(response.statusCode).toBe(statusCodes.ok)
      expect(page.error.message).toBe(
        'Select why you are cancelling this certificate'
      )
    })

    it('redirects to the check page when a valid reason is selected', async () => {
      const cookie = await signIn()
      const response = await post(
        reasonUrlFor(DP_ITEM),
        'cancel-reason=producer-request',
        cookie
      )
      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe(
        `${checkUrlFor(DP_ITEM)}?reason=producer-request`
      )
    })
  })

  describe('GET check page', () => {
    it('redirects to the reason page when no reason is in the URL', async () => {
      const cookie = await signIn()
      const response = await get(checkUrlFor(DP_ITEM), cookie)
      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe(reasonUrlFor(DP_ITEM))
    })

    it('redirects to the detail page when the declaration is already cancelled', async () => {
      const cookie = await signIn()
      const response = await get(checkUrlFor(CANCELLED_ITEM), cookie)
      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe(detailUrlFor(CANCELLED_ITEM))
    })

    it('shows the selected reason, a Change link and inset text for a Direct Producer', async () => {
      const cookie = await signIn()
      const response = await get(
        `${checkUrlFor(DP_ITEM)}?reason=producer-request`,
        cookie
      )
      const page = loadCheckPage(response.payload)

      expect(response.statusCode).toBe(statusCodes.ok)
      expect(page.heading).toBe('Confirm and send cancellation email')
      expect(page.organisation).toBe(mockDetailData.organisation.name)
      expect(page.reason.value).toBe('Producer requested to cancel')
      // Change link carries the reason back to the reason page for pre-selection.
      expect(page.reason.changeUrl).toBe(
        `${reasonUrlFor(DP_ITEM)}?reason=producer-request`
      )
      // The reason is carried into the action POST via a hidden field.
      expect(page.hiddenReason).toBe('producer-request')
      expect(page.emailLink).toBe(
        'View the cancellation email (opens in new tab)'
      )
      expect(page.insetText).toContain(
        "we'll cancel the certificate and email the person who submitted it"
      )
      expect(page.confirmButton).toBe('Confirm and send')
    })

    it('shows statement inset text for a Compliance Scheme', async () => {
      const cookie = await signIn()
      const response = await get(
        `${checkUrlFor(CS_ITEM)}?reason=producer-request`,
        cookie
      )

      expect(loadCheckPage(response.payload).insetText).toContain(
        "we'll cancel the statement and email the person who submitted it"
      )
    })
  })

  describe('POST cancel (the action)', () => {
    it('redirects unauthenticated users to /signin-oidc', async () => {
      const response = await post(actionUrlFor(DP_ITEM), '', anonCrumbCookie)
      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe('/signin-oidc')
    })

    it('rejects a request with no CSRF token', async () => {
      const response = await server.inject({
        method: 'POST',
        url: actionUrlFor(DP_ITEM)
      })
      expect(response.statusCode).toBe(statusCodes.forbidden)
    })

    it('redirects to the reason page when no reason is submitted', async () => {
      const cookie = await signIn()
      const response = await post(actionUrlFor(DP_ITEM), '', cookie)
      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe(reasonUrlFor(DP_ITEM))
    })

    it('records the cancellation, shows the banner and the reason, and hides the action buttons', async () => {
      const cookie = await signIn()
      const cancelResponse = await cancel(DP_ITEM, 'producer-request', cookie)

      expect(cancelResponse.statusCode).toBe(302)
      expect(cancelResponse.headers.location).toBe(detailUrlFor(DP_ITEM))

      const detailResponse = await get(
        detailUrlFor(DP_ITEM),
        nextCookie(cancelResponse, cookie)
      )

      expect(detailResponse.statusCode).toBe(statusCodes.ok)
      expect(detailResponse.payload).toContain('Certificate cancelled')
      expect(detailResponse.payload).toContain(
        'app-notification-banner--cancelled'
      )
      // The chosen reason is recorded on the cancellation audit entry, shown in
      // the current-year history table.
      expect(detailResponse.payload).toContain('Producer requested to cancel')
      expect(detailResponse.payload).not.toContain('Accept certificate')
      expect(detailResponse.payload).not.toContain('Cancel certificate')
    })

    it('re-shows the cancelled banner when confirming an already-cancelled declaration', async () => {
      const cookie = await signIn()
      const firstCancel = await cancel(DP_ITEM, 'producer-request', cookie)
      const cookieAfterCancel = nextCookie(firstCancel, cookie)

      // Clear the first banner by visiting the detail page.
      const firstView = await get(detailUrlFor(DP_ITEM), cookieAfterCancel)
      const cookieAfterView = nextCookie(firstView, cookieAfterCancel)

      const secondConfirm = await post(
        actionUrlFor(DP_ITEM),
        '',
        cookieAfterView
      )
      expect(secondConfirm.statusCode).toBe(302)
      expect(secondConfirm.headers.location).toBe(detailUrlFor(DP_ITEM))

      const detailResponse = await get(
        detailUrlFor(DP_ITEM),
        nextCookie(secondConfirm, cookieAfterView)
      )
      expect(detailResponse.payload).toContain('Certificate cancelled')
    })
  })
})
