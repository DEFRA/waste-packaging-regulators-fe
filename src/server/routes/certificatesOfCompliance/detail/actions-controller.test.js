import { createServer } from '#/server/server.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'

describe('certificates of compliance action controllers', () => {
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

  const inject = (options, cookie = sessionCookie) =>
    server.inject({
      ...options,
      headers: { cookie, ...(options.headers ?? {}) }
    })

  const mergeCookies = (cookie, response) => {
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

  describe('approve', () => {
    it('redirects unauthenticated users to sign in', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/org-123/certificates-of-compliance/decl-1/approve'
      })

      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe('/signin-oidc')
    })

    it('redirects to the detail page, shows the accepted banner, and hides accept based on API status', async () => {
      const approveResponse = await inject({
        method: 'POST',
        url: '/org-123/certificates-of-compliance/decl-1/approve'
      })

      expect(approveResponse.statusCode).toBe(302)
      expect(approveResponse.headers.location).toBe(
        '/org-123/certificates-of-compliance/decl-1'
      )

      const detailResponse = await inject(
        {
          method: 'GET',
          url: '/org-123/certificates-of-compliance/decl-1'
        },
        mergeCookies(sessionCookie, approveResponse)
      )

      expect(detailResponse.statusCode).toBe(statusCodes.ok)
      expect(detailResponse.payload).toContain('Certificate accepted')
      expect(detailResponse.payload).toContain('Certificate has been accepted.')
      expect(detailResponse.payload).not.toContain('Accept certificate')
      expect(detailResponse.payload).not.toContain(
        '/org-123/certificates-of-compliance/decl-1/approve'
      )
      expect(detailResponse.payload).toContain('Cancel certificate')
      expect(detailResponse.payload).toContain(
        '/org-123/certificates-of-compliance/decl-1/cancel'
      )
      expect(detailResponse.payload).toContain(
        'data-prevent-double-click="true"'
      )
    })
  })

  describe('cancel', () => {
    it('redirects unauthenticated users to sign in', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/org-123/certificates-of-compliance/decl-1/cancel'
      })

      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe('/signin-oidc')
    })

    it('redirects to the detail page, shows the cancelled banner, and hides action buttons based on API status', async () => {
      const cancelResponse = await inject({
        method: 'POST',
        url: '/org-123/certificates-of-compliance/decl-1/cancel'
      })

      expect(cancelResponse.statusCode).toBe(302)
      expect(cancelResponse.headers.location).toBe(
        '/org-123/certificates-of-compliance/decl-1'
      )

      const detailResponse = await inject(
        {
          method: 'GET',
          url: '/org-123/certificates-of-compliance/decl-1'
        },
        mergeCookies(sessionCookie, cancelResponse)
      )

      expect(detailResponse.statusCode).toBe(statusCodes.ok)
      expect(detailResponse.payload).toContain('Certificate cancelled')
      expect(detailResponse.payload).toContain(
        'Certificate has been cancelled and an email sent to the producer.'
      )
      expect(detailResponse.payload).toContain(
        'app-notification-banner--cancelled'
      )
      expect(detailResponse.payload).not.toContain('Accept certificate')
      expect(detailResponse.payload).not.toContain('Cancel certificate')
      expect(detailResponse.payload).not.toContain('/approve')
      expect(detailResponse.payload).not.toContain('/cancel')
    })
  })

  it('reflects API status on reload after the banner clears', async () => {
    const approveResponse = await inject({
      method: 'POST',
      url: '/org-123/certificates-of-compliance/decl-1/approve'
    })
    const cookieAfterApprove = mergeCookies(sessionCookie, approveResponse)

    const firstDetailResponse = await inject(
      {
        method: 'GET',
        url: '/org-123/certificates-of-compliance/decl-1'
      },
      cookieAfterApprove
    )
    expect(firstDetailResponse.payload).toContain('Certificate accepted')
    expect(firstDetailResponse.payload).not.toContain('Accept certificate')

    const secondDetailResponse = await inject(
      {
        method: 'GET',
        url: '/org-123/certificates-of-compliance/decl-1'
      },
      mergeCookies(cookieAfterApprove, firstDetailResponse)
    )
    expect(secondDetailResponse.payload).not.toContain('Certificate accepted')
    expect(secondDetailResponse.payload).not.toContain('Accept certificate')
    expect(secondDetailResponse.payload).not.toContain(
      '/org-123/certificates-of-compliance/decl-1/approve'
    )
    expect(secondDetailResponse.payload).toContain('Cancel certificate')
  })

  it('handles repeat approve requests idempotently without showing accept again', async () => {
    const firstApproveResponse = await inject({
      method: 'POST',
      url: '/org-123/certificates-of-compliance/decl-1/approve'
    })
    const cookieAfterFirstApprove = mergeCookies(
      sessionCookie,
      firstApproveResponse
    )

    await inject(
      {
        method: 'GET',
        url: '/org-123/certificates-of-compliance/decl-1'
      },
      cookieAfterFirstApprove
    )

    const repeatApproveResponse = await inject(
      {
        method: 'POST',
        url: '/org-123/certificates-of-compliance/decl-1/approve'
      },
      cookieAfterFirstApprove
    )

    expect(repeatApproveResponse.statusCode).toBe(302)

    const detailResponse = await inject(
      {
        method: 'GET',
        url: '/org-123/certificates-of-compliance/decl-1'
      },
      mergeCookies(cookieAfterFirstApprove, repeatApproveResponse)
    )

    expect(detailResponse.payload).toContain('Certificate accepted')
    expect(detailResponse.payload).not.toContain('Accept certificate')
  })

  it('clears the banner flag after it has been shown once', async () => {
    const approveResponse = await inject({
      method: 'POST',
      url: '/org-123/certificates-of-compliance/decl-1/approve'
    })
    const cookieAfterApprove = mergeCookies(sessionCookie, approveResponse)

    const firstDetailResponse = await inject(
      {
        method: 'GET',
        url: '/org-123/certificates-of-compliance/decl-1'
      },
      cookieAfterApprove
    )
    expect(firstDetailResponse.payload).toContain('Certificate accepted')

    const secondDetailResponse = await inject(
      {
        method: 'GET',
        url: '/org-123/certificates-of-compliance/decl-1'
      },
      mergeCookies(cookieAfterApprove, firstDetailResponse)
    )
    expect(secondDetailResponse.payload).not.toContain('Certificate accepted')
  })
})
