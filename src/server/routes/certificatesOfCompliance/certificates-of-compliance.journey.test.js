import { createServer } from '#/server/server.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import {
  mockPendingItems,
  mockAcceptedItems,
  mockDetailData
} from './certificates-of-compliance.mock.js'

function detailPathFor(item) {
  return `/${item.organisationId}/certificates-of-compliance/${item.id}`
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

      // Step 1: unauthenticated request — stores returnTo in a new session
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
      ).toContain(mockDetailData.organisation.name)
    })
  })

  describe('detail page actions', () => {
    it('shows Accept certificate and Cancel certificate buttons', async () => {
      const response = await inject(detailPathFor(mockPendingItems[0]))

      expect(response.statusCode).toBe(statusCodes.ok)
      expect(response.payload).toContain('Accept certificate')
      expect(response.payload).toContain('Cancel certificate')
    })

    it('does not show action buttons for an accepted item', async () => {
      const response = await inject(detailPathFor(mockAcceptedItems[0]))

      expect(response.statusCode).toBe(statusCodes.ok)
      expect(response.payload).not.toContain('Accept certificate')
      expect(response.payload).not.toContain('/approve')
    })

    it('Accept certificate button links to the accept confirmation page', async () => {
      const item = mockPendingItems[0]
      const response = await inject(detailPathFor(item))

      expect(response.statusCode).toBe(statusCodes.ok)
      expect(response.payload).toContain(`href="${detailPathFor(item)}/accept"`)
    })
  })

  describe('accept journey', () => {
    const pathFor = (item) => `${detailPathFor(item)}/accept`

    const nextCookie = (response, fallback) =>
      response.headers['set-cookie']?.[0]?.split(';')[0] ?? fallback

    const postAccept = (item, choice, cookie) =>
      server.inject({
        method: 'POST',
        url: pathFor(item),
        payload: `confirm-accept=${choice}`,
        headers: {
          cookie,
          'content-type': 'application/x-www-form-urlencoded'
        }
      })

    it('GET accept renders the confirmation form with the organisation name', async () => {
      const item = mockPendingItems[0]
      const response = await inject(pathFor(item))

      expect(response.statusCode).toBe(statusCodes.ok)
      expect(response.payload).toContain(mockDetailData.organisation.name)
      expect(response.payload).toContain('confirm-accept')
    })

    it('choosing "no" returns to the detail page without the success banner', async () => {
      const item = mockPendingItems[0]
      const postResponse = await postAccept(item, 'no', sessionCookie)
      expect(postResponse.statusCode).toBe(302)
      expect(postResponse.headers.location).toBe(detailPathFor(item))

      const detailResponse = await server.inject({
        method: 'GET',
        url: detailPathFor(item),
        headers: { cookie: nextCookie(postResponse, sessionCookie) }
      })
      expect(detailResponse.statusCode).toBe(statusCodes.ok)
      expect(detailResponse.payload).not.toContain(
        'Certificate has been accepted.'
      )
    })

    it('choosing "yes" returns to the detail page with a one-shot success banner', async () => {
      const item = mockPendingItems[0]
      const postResponse = await postAccept(item, 'yes', sessionCookie)
      expect(postResponse.statusCode).toBe(302)
      expect(postResponse.headers.location).toBe(detailPathFor(item))

      const cookieAfterPost = nextCookie(postResponse, sessionCookie)
      const firstView = await server.inject({
        method: 'GET',
        url: detailPathFor(item),
        headers: { cookie: cookieAfterPost }
      })
      expect(firstView.payload).toContain('Certificate accepted')
      expect(firstView.payload).toContain('Certificate has been accepted.')

      const secondView = await server.inject({
        method: 'GET',
        url: detailPathFor(item),
        headers: { cookie: nextCookie(firstView, cookieAfterPost) }
      })
      expect(secondView.payload).not.toContain('Certificate has been accepted.')
    })

    it('submitting without a choice re-renders the form with an error summary', async () => {
      const item = mockPendingItems[0]
      const response = await postAccept(item, '', sessionCookie)

      expect(response.statusCode).toBe(statusCodes.ok)
      expect(response.payload).toContain('There is a problem')
      expect(response.payload).toContain('Select yes or no')
    })
  })
})
