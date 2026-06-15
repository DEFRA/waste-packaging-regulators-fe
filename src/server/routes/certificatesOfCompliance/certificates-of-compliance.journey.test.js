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

    it('approve flow redirects to detail with accepted banner', async () => {
      const item = mockPendingItems[0]
      const approveResponse = await server.inject({
        method: 'GET',
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
