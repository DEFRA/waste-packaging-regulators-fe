import { createServer } from '#server/server.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import {
  mockPendingItems,
  mockAcceptedItems,
  mockDetailData,
  mockNotSubmittedItems,
  mockComplianceSchemePendingItems,
  mockComplianceSchemeAcceptedItems,
  mockComplianceSchemeNotSubmittedItems,
  mockDirectProducerCancelledDetailData,
  mockComplianceSchemeCancelledDetailData
} from './certificates-of-compliance.mock.js'

function detailPathFor(item) {
  return `/${item.organisationId}/certificates-of-compliance/${item.id}`
}

function detailPathForDetailData(detailData) {
  return `/${detailData.organisation.id}/certificates-of-compliance/${detailData.id}`
}

describe('certificates of compliance — journey', () => {
  let server
  let sessionCookie

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
    const { headers } = await server.inject({
      method: 'GET',
      url: '/signin-oidc'
    })
    sessionCookie = headers['set-cookie']?.[0]?.split(';')[0]
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  const inject = (url) =>
    server.inject({ method: 'GET', url, headers: { cookie: sessionCookie } })

  describe('unauthenticated access', () => {
    it('redirects the list page to /signin-oidc and stores returnTo', async () => {
      const listUrl =
        '/certificates-of-compliance?type=direct-producers&tab=pending'
      const response = await server.inject({ method: 'GET', url: listUrl })

      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe('/signin-oidc')
    })

    it('redirects the detail page to /signin-oidc and stores returnTo', async () => {
      const detailUrl = detailPathFor(mockPendingItems[0])
      const response = await server.inject({ method: 'GET', url: detailUrl })

      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe('/signin-oidc')
    })

    it('redirects back to the originally requested page after sign in', async () => {
      const listUrl =
        '/certificates-of-compliance?type=direct-producers&tab=pending'

      const unauthResponse = await server.inject({
        method: 'GET',
        url: listUrl
      })
      expect(unauthResponse.statusCode).toBe(302)
      const unauthCookie =
        unauthResponse.headers['set-cookie']?.[0]?.split(';')[0]

      const signinResponse = await server.inject({
        method: 'GET',
        url: '/signin-oidc',
        headers: { cookie: unauthCookie }
      })
      expect(signinResponse.statusCode, 'Should respond with accepted').toBe(
        302
      )

      expect(
        signinResponse.headers.location,
        'Should redirect to the requested URL'
      ).toBe(listUrl)
    })
  })

  describe('list → detail navigation', () => {
    it('list page renders items with links to detail pages', async () => {
      const response = await inject(
        '/certificates-of-compliance?type=direct-producers&tab=pending'
      )

      expect(response.statusCode).toBe(statusCodes.ok)
      for (const item of mockPendingItems) {
        expect(response.payload).toContain(item.organisationName)
        expect(response.payload).toContain(
          `./${item.organisationId}/certificates-of-compliance/${item.id}`
        )
      }
    })

    it('not-submitted list shows organisation name with a detail link including obligation year', async () => {
      const response = await inject(
        '/certificates-of-compliance?type=direct-producers&tab=not-submitted'
      )

      expect(response.statusCode).toBe(statusCodes.ok)
      for (const item of mockNotSubmittedItems) {
        expect(response.payload).toContain(item.organisationName)
        expect(response.payload).toContain(
          `./${item.organisationId}/certificates-of-compliance?obligationYear=2026`
        )
        expect(response.payload).not.toContain(
          `./${item.organisationId}/certificates-of-compliance/null`
        )
      }
    })

    it('compliance scheme not-submitted list shows the organisation ID (reference number)', async () => {
      const response = await inject(
        '/certificates-of-compliance?type=compliance-schemes&tab=not-submitted'
      )

      expect(response.statusCode).toBe(statusCodes.ok)
      for (const item of mockComplianceSchemeNotSubmittedItems) {
        expect(response.payload).toContain(item.organisationReferenceNumber)
        expect(response.payload).toContain(item.organisationName)
      }
    })

    it('following a pending item link loads the detail page', async () => {
      const listResponse = await inject(
        '/certificates-of-compliance?type=direct-producers&tab=pending'
      )
      expect(listResponse.statusCode, 'Should return list page').toBe(
        statusCodes.ok
      )

      const match = listResponse.payload.match(
        /href="(\.\/[^"]+\/certificates-of-compliance\/[^"]+)"/
      )
      expect(match, 'Should extract detail link').not.toBeNull()

      const detailPath = match[1].replace('./', '/')
      const detailResponse = await inject(detailPath)

      expect(
        detailResponse.statusCode,
        'Should successfully call detail page'
      ).toBe(statusCodes.ok)
      expect(
        detailResponse.payload,
        'Should get organisation name from detail page'
      ).toContain(mockDetailData.organisation.name)
    })

    it('following an accepted item link loads the detail page', async () => {
      const listResponse = await inject(
        '/certificates-of-compliance?type=direct-producers&tab=accepted'
      )
      expect(listResponse.statusCode, 'Should return list page').toBe(
        statusCodes.ok
      )
      expect(
        listResponse.payload,
        'Should return list page with organisation name'
      ).toContain(mockAcceptedItems[0].organisationName)

      const match = listResponse.payload.match(
        /href="(\.\/[^"]+\/certificates-of-compliance\/[^"]+)"/
      )
      expect(match).not.toBeNull()

      const detailPath = match[1].replace('./', '/')
      const detailResponse = await inject(detailPath)

      expect(
        detailResponse.statusCode,
        'Should successfully call detail page'
      ).toBe(statusCodes.ok)
      expect(
        detailResponse.payload,
        'Should get organisation name from detail page'
      ).toContain(mockAcceptedItems[0].organisationName)
    })
  })

  describe('detail page actions', () => {
    it('shows Accept and Cancel certificate buttons for a pending direct producer', async () => {
      const response = await inject(detailPathFor(mockPendingItems[0]))

      expect(response.statusCode).toBe(statusCodes.ok)
      expect(response.payload).toContain('Accept certificate')
      expect(response.payload).toContain('Cancel certificate')
      expect(response.payload).not.toContain('Query')
    })

    it('shows Accept and Cancel statement buttons for a pending compliance scheme', async () => {
      const item = mockComplianceSchemePendingItems[0]
      const response = await inject(detailPathFor(item))

      expect(response.statusCode).toBe(statusCodes.ok)
      expect(response.payload).toContain('Accept statement')
      expect(response.payload).toContain('Cancel statement')
      expect(response.payload).not.toContain('Query')
    })

    it('shows cancel only for an accepted direct producer', async () => {
      const response = await inject(detailPathFor(mockAcceptedItems[0]))

      expect(response.statusCode).toBe(statusCodes.ok)
      expect(response.payload).not.toContain('Accept certificate')
      expect(response.payload).not.toContain('/approve')
      expect(response.payload).toContain('Cancel certificate')
      expect(response.payload).toContain(
        `${detailPathFor(mockAcceptedItems[0])}/cancel`
      )
    })

    it('shows cancel only for an accepted compliance scheme', async () => {
      const item = mockComplianceSchemeAcceptedItems[0]
      const response = await inject(detailPathFor(item))

      expect(response.statusCode).toBe(statusCodes.ok)
      expect(response.payload).not.toContain('Accept statement')
      expect(response.payload).not.toContain('/approve')
      expect(response.payload).toContain('Cancel statement')
      expect(response.payload).toContain(`${detailPathFor(item)}/cancel`)
    })

    it('shows no action buttons for a cancelled direct producer', async () => {
      const response = await inject(
        detailPathForDetailData(mockDirectProducerCancelledDetailData)
      )

      expect(response.statusCode).toBe(statusCodes.ok)
      expect(response.payload).not.toContain('Accept certificate')
      expect(response.payload).not.toContain('Cancel certificate')
      expect(response.payload).not.toContain('/approve')
      expect(response.payload).not.toContain('/cancel')
    })

    it('shows no action buttons for a cancelled compliance scheme', async () => {
      const response = await inject(
        detailPathForDetailData(mockComplianceSchemeCancelledDetailData)
      )

      expect(response.statusCode).toBe(statusCodes.ok)
      expect(response.payload).not.toContain('Accept statement')
      expect(response.payload).not.toContain('Cancel statement')
      expect(response.payload).not.toContain('/approve')
      expect(response.payload).not.toContain('/cancel')
    })

    it('approve flow redirects to detail with accepted banner styling', async () => {
      const item = mockPendingItems[0]
      const approveResponse = await server.inject({
        method: 'POST',
        url: `${detailPathFor(item)}/approve`,
        headers: { cookie: sessionCookie }
      })

      expect(approveResponse.statusCode).toBe(302)
      expect(approveResponse.headers.location).toBe(detailPathFor(item))

      const detailResponse = await server.inject({
        method: 'GET',
        url: detailPathFor(item),
        headers: {
          cookie: mergeCookiesFromResponse(sessionCookie, approveResponse)
        }
      })

      expect(detailResponse.payload).toContain('Certificate accepted')
      expect(detailResponse.payload).toContain('Important')
      expect(detailResponse.payload).not.toContain(
        'govuk-notification-banner--success'
      )
      expect(detailResponse.payload).not.toContain(
        'app-notification-banner--cancelled'
      )
    })

    it('compliance scheme approve flow shows statement accepted banner', async () => {
      const item = mockComplianceSchemePendingItems[0]
      const approveResponse = await server.inject({
        method: 'POST',
        url: `${detailPathFor(item)}/approve`,
        headers: { cookie: sessionCookie }
      })

      expect(approveResponse.statusCode).toBe(302)

      const detailResponse = await server.inject({
        method: 'GET',
        url: detailPathFor(item),
        headers: {
          cookie: mergeCookiesFromResponse(sessionCookie, approveResponse)
        }
      })

      expect(detailResponse.payload).toContain('Statement accepted')
      expect(detailResponse.payload).toContain('Important')
    })

    it('cancel flow redirects to detail with cancelled banner styling', async () => {
      const item = mockPendingItems[0]
      const cancelResponse = await server.inject({
        method: 'POST',
        url: `${detailPathFor(item)}/cancel`,
        headers: { cookie: sessionCookie }
      })

      expect(cancelResponse.statusCode).toBe(302)
      expect(cancelResponse.headers.location).toBe(detailPathFor(item))

      const detailResponse = await server.inject({
        method: 'GET',
        url: detailPathFor(item),
        headers: {
          cookie: mergeCookiesFromResponse(sessionCookie, cancelResponse)
        }
      })

      expect(detailResponse.payload).toContain('Certificate cancelled')
      expect(detailResponse.payload).toContain(
        'app-notification-banner--cancelled'
      )
    })

    it('compliance scheme cancel flow shows statement cancelled banner', async () => {
      const item = mockComplianceSchemePendingItems[0]
      const cancelResponse = await server.inject({
        method: 'POST',
        url: `${detailPathFor(item)}/cancel`,
        headers: { cookie: sessionCookie }
      })

      expect(cancelResponse.statusCode).toBe(302)

      const detailResponse = await server.inject({
        method: 'GET',
        url: detailPathFor(item),
        headers: {
          cookie: mergeCookiesFromResponse(sessionCookie, cancelResponse)
        }
      })

      expect(detailResponse.payload).toContain('Statement cancelled')
      expect(detailResponse.payload).toContain(
        'Statement has been cancelled and an email sent to the compliance scheme.'
      )
      expect(detailResponse.payload).toContain(
        'app-notification-banner--cancelled'
      )
    })
  })

  describe('accept confirmation journey', () => {
    const acceptPathFor = (item) => `${detailPathFor(item)}/accept`

    const postAccept = (item, choice, cookie) =>
      server.inject({
        method: 'POST',
        url: acceptPathFor(item),
        payload: `confirm-accept=${choice}`,
        headers: {
          cookie,
          'content-type': 'application/x-www-form-urlencoded'
        }
      })

    it('detail page Accept button links to the confirmation page', async () => {
      const item = mockPendingItems[0]
      const response = await inject(detailPathFor(item))

      expect(response.statusCode).toBe(statusCodes.ok)
      expect(response.payload).toContain(`href="${acceptPathFor(item)}"`)
    })

    it('GET on the confirmation page renders the Yes/No form', async () => {
      const item = mockPendingItems[0]
      const response = await inject(acceptPathFor(item))

      expect(response.statusCode).toBe(statusCodes.ok)
      expect(response.payload).toContain(mockDetailData.organisation.name)
      expect(response.payload).toContain('confirm-accept')
    })

    it('"yes" runs the approve action and lands on detail with the accepted banner', async () => {
      const item = mockPendingItems[0]
      const yesResponse = await postAccept(item, 'yes', sessionCookie)
      expect(yesResponse.statusCode).toBe(302)
      expect(yesResponse.headers.location).toBe(detailPathFor(item))

      const detailResponse = await server.inject({
        method: 'GET',
        url: detailPathFor(item),
        headers: {
          cookie: mergeCookiesFromResponse(sessionCookie, yesResponse)
        }
      })
      expect(detailResponse.payload).toContain('Certificate accepted')
      expect(detailResponse.payload).toContain('Certificate has been accepted.')
    })

    it('"no" returns to detail without invoking the approve action', async () => {
      const item = mockPendingItems[0]
      const noResponse = await postAccept(item, 'no', sessionCookie)
      expect(noResponse.statusCode).toBe(302)
      expect(noResponse.headers.location).toBe(detailPathFor(item))

      const detailResponse = await server.inject({
        method: 'GET',
        url: detailPathFor(item),
        headers: {
          cookie: mergeCookiesFromResponse(sessionCookie, noResponse)
        }
      })
      expect(detailResponse.statusCode).toBe(statusCodes.ok)
      expect(detailResponse.payload).not.toContain('govuk-notification-banner')
    })

    it('submitting without a choice re-renders the form with an error summary', async () => {
      const item = mockPendingItems[0]
      const response = await postAccept(item, '', sessionCookie)

      expect(response.statusCode).toBe(statusCodes.ok)
      expect(response.payload).toContain('There is a problem')
      expect(response.payload).toContain('Select yes or no')
    })

    it('"yes" on a Compliance Scheme shows statement-accepted banner', async () => {
      const item = mockComplianceSchemePendingItems[0]
      const yesResponse = await postAccept(item, 'yes', sessionCookie)
      expect(yesResponse.statusCode).toBe(302)

      const detailResponse = await server.inject({
        method: 'GET',
        url: detailPathFor(item),
        headers: {
          cookie: mergeCookiesFromResponse(sessionCookie, yesResponse)
        }
      })
      expect(detailResponse.payload).toContain('Statement accepted')
      expect(detailResponse.payload).toContain('Statement has been accepted.')
    })
  })
})

function mergeCookiesFromResponse(cookie, response) {
  const setCookie = response.headers['set-cookie']
  if (!setCookie) {
    return cookie
  }

  const cookies = Object.fromEntries(
    cookie.split('; ').map((entry) => {
      const [name, ...value] = entry.split('=')
      return [name, value.join('=')]
    })
  )

  for (const entry of setCookie) {
    const [name, ...value] = entry.split(';')[0].split('=')
    cookies[name] = value.join('=')
  }

  return Object.entries(cookies)
    .map(([name, value]) => `${name}=${value}`)
    .join('; ')
}
