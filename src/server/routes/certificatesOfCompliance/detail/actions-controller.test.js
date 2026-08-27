import { describe, it, expect, vi } from 'vitest'
import { createServer } from '#server/server.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import {
  authCookiesFromResponse,
  crumbTokenFromCookie,
  mergeCookiesFromResponse
} from '#test-helpers/cookies.js'
import { redirectToSignIn } from './actions-controller.js'
import { resetMockData } from '#mocks/server.js'

describe('redirectToSignIn', () => {
  it('stores the pathname as returnTo in the session', () => {
    const yar = { set: vi.fn() }
    const request = {
      yar,
      url: {
        pathname:
          '/497f6eca-6276-4993-bfeb-53cbbbba6f08/certificates-of-compliance/decl-101411/accept',
        search: ''
      }
    }
    const h = { redirect: vi.fn() }

    redirectToSignIn(request, h)

    expect(yar.set).toHaveBeenCalledWith(
      'returnTo',
      '/497f6eca-6276-4993-bfeb-53cbbbba6f08/certificates-of-compliance/decl-101411/accept'
    )
  })

  it('appends the query string to the returnTo value', () => {
    const yar = { set: vi.fn() }
    const request = {
      yar,
      url: { pathname: '/some/path', search: '?tab=pending&page=2' }
    }
    const h = { redirect: vi.fn() }

    redirectToSignIn(request, h)

    expect(yar.set).toHaveBeenCalledWith(
      'returnTo',
      '/some/path?tab=pending&page=2'
    )
  })

  it('redirects to /signin-oidc', () => {
    const request = {
      yar: { set: vi.fn() },
      url: { pathname: '/some/path', search: '' }
    }
    const h = { redirect: vi.fn((url) => `redirect:${url}`) }

    const result = redirectToSignIn(request, h)

    expect(h.redirect).toHaveBeenCalledWith('/signin-oidc')
    expect(result).toBe('redirect:/signin-oidc')
  })
})

describe('certificates of compliance detail action buttons', () => {
  let server
  let sessionCookie

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
    const response = await server.inject({
      method: 'GET',
      url: '/signin-oidc'
    })
    sessionCookie = authCookiesFromResponse(response)
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  // Approve/cancel now persist at the MSW boundary rather than per-session, so
  // clear those transitions between tests to keep each one starting from the
  // pending declaration.
  afterEach(() => {
    resetMockData()
  })

  const inject = (options, cookie = sessionCookie) =>
    server.inject({
      ...options,
      headers: { cookie, ...(options.headers ?? {}) }
    })

  // POST with the crumb echoed back from the given cookie's CSRFToken.
  const postWithCrumb = (url, cookie = sessionCookie, fields = '') =>
    inject(
      {
        method: 'POST',
        url,
        payload: [fields, `CSRFToken=${crumbTokenFromCookie(cookie)}`]
          .filter(Boolean) // drop the empty `fields` default so there is no leading '&'
          .join('&'),
        headers: { 'content-type': 'application/x-www-form-urlencoded' }
      },
      cookie
    )

  // Approval is performed by the accept confirmation handler — there is no
  // direct approve endpoint.
  const acceptDeclaration = (cookie = sessionCookie) =>
    postWithCrumb(
      '/497f6eca-6276-4993-bfeb-53cbbbba6f08/certificates-of-compliance/decl-101411/accept',
      cookie,
      'confirm-accept=yes'
    )

  // Cancellation is a two-step flow: choose a reason, then confirm and send.
  // The reason travels in the form body, not the session.
  const cancelDeclaration = async (cookie = sessionCookie) => {
    await postWithCrumb(
      '/497f6eca-6276-4993-bfeb-53cbbbba6f08/certificates-of-compliance/decl-101411/cancel/reason',
      cookie,
      'cancel-reason=producer-request'
    )
    return postWithCrumb(
      '/497f6eca-6276-4993-bfeb-53cbbbba6f08/certificates-of-compliance/decl-101411/cancel',
      cookie,
      'cancel-reason=producer-request'
    )
  }

  describe('approval (via the accept confirmation)', () => {
    it('does not show the accepted banner when the declaration is already cancelled', async () => {
      const cancelResponse = await cancelDeclaration()
      const cookieAfterCancel = mergeCookiesFromResponse(
        sessionCookie,
        cancelResponse
      )

      const acceptResponse = await acceptDeclaration(cookieAfterCancel)

      expect(acceptResponse.statusCode).toBe(302)
      expect(acceptResponse.headers.location).toBe(
        '/497f6eca-6276-4993-bfeb-53cbbbba6f08/certificates-of-compliance/decl-101411'
      )

      const detailResponse = await inject(
        {
          method: 'GET',
          url: '/497f6eca-6276-4993-bfeb-53cbbbba6f08/certificates-of-compliance/decl-101411'
        },
        mergeCookiesFromResponse(cookieAfterCancel, acceptResponse)
      )

      expect(detailResponse.payload).not.toContain('Certificate accepted')
      expect(detailResponse.payload).not.toContain(
        'Certificate has been accepted'
      )
    })

    it('redirects to the detail page, shows the accepted banner, and hides accept based on API status', async () => {
      const acceptResponse = await acceptDeclaration()

      expect(acceptResponse.statusCode).toBe(302)
      expect(acceptResponse.headers.location).toBe(
        '/497f6eca-6276-4993-bfeb-53cbbbba6f08/certificates-of-compliance/decl-101411'
      )

      const detailResponse = await inject(
        {
          method: 'GET',
          url: '/497f6eca-6276-4993-bfeb-53cbbbba6f08/certificates-of-compliance/decl-101411'
        },
        mergeCookiesFromResponse(sessionCookie, acceptResponse)
      )

      expect(detailResponse.statusCode).toBe(statusCodes.ok)
      expect(detailResponse.payload).toContain('Certificate accepted')
      expect(detailResponse.payload).toContain('Certificate has been accepted.')
      expect(detailResponse.payload).not.toContain('Accept certificate')
      expect(detailResponse.payload).toContain('Cancel certificate')
      expect(detailResponse.payload).toContain(
        '/497f6eca-6276-4993-bfeb-53cbbbba6f08/certificates-of-compliance/decl-101411/cancel/reason'
      )
    })
  })

  describe('cancel', () => {
    it('redirects to the detail page, shows the cancelled banner, and hides the action buttons', async () => {
      const cancelResponse = await cancelDeclaration()

      expect(cancelResponse.statusCode).toBe(302)
      expect(cancelResponse.headers.location).toBe(
        '/497f6eca-6276-4993-bfeb-53cbbbba6f08/certificates-of-compliance/decl-101411'
      )

      const detailResponse = await inject(
        {
          method: 'GET',
          url: '/497f6eca-6276-4993-bfeb-53cbbbba6f08/certificates-of-compliance/decl-101411'
        },
        mergeCookiesFromResponse(sessionCookie, cancelResponse)
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
    })
  })

  it('reflects API status on reload after the banner clears', async () => {
    const approveResponse = await acceptDeclaration()
    const cookieAfterApprove = mergeCookiesFromResponse(
      sessionCookie,
      approveResponse
    )

    const firstDetailResponse = await inject(
      {
        method: 'GET',
        url: '/497f6eca-6276-4993-bfeb-53cbbbba6f08/certificates-of-compliance/decl-101411'
      },
      cookieAfterApprove
    )
    expect(firstDetailResponse.payload).toContain('Certificate accepted')
    expect(firstDetailResponse.payload).not.toContain('Accept certificate')

    const secondDetailResponse = await inject(
      {
        method: 'GET',
        url: '/497f6eca-6276-4993-bfeb-53cbbbba6f08/certificates-of-compliance/decl-101411'
      },
      mergeCookiesFromResponse(cookieAfterApprove, firstDetailResponse)
    )
    expect(secondDetailResponse.payload).not.toContain('Certificate accepted')
    expect(secondDetailResponse.payload).not.toContain('Accept certificate')
    expect(secondDetailResponse.payload).toContain('Cancel certificate')
  })

  it('handles repeat approval idempotently without showing accept again', async () => {
    const firstApproveResponse = await acceptDeclaration()
    const cookieAfterFirstApprove = mergeCookiesFromResponse(
      sessionCookie,
      firstApproveResponse
    )

    await inject(
      {
        method: 'GET',
        url: '/497f6eca-6276-4993-bfeb-53cbbbba6f08/certificates-of-compliance/decl-101411'
      },
      cookieAfterFirstApprove
    )

    const repeatApproveResponse = await acceptDeclaration(
      cookieAfterFirstApprove
    )

    expect(repeatApproveResponse.statusCode).toBe(302)

    const detailResponse = await inject(
      {
        method: 'GET',
        url: '/497f6eca-6276-4993-bfeb-53cbbbba6f08/certificates-of-compliance/decl-101411'
      },
      mergeCookiesFromResponse(cookieAfterFirstApprove, repeatApproveResponse)
    )

    expect(detailResponse.payload).toContain('Certificate accepted')
    expect(detailResponse.payload).not.toContain('Accept certificate')
  })

  it('clears the banner flag after it has been shown once', async () => {
    const approveResponse = await acceptDeclaration()
    const cookieAfterApprove = mergeCookiesFromResponse(
      sessionCookie,
      approveResponse
    )

    const firstDetailResponse = await inject(
      {
        method: 'GET',
        url: '/497f6eca-6276-4993-bfeb-53cbbbba6f08/certificates-of-compliance/decl-101411'
      },
      cookieAfterApprove
    )
    expect(firstDetailResponse.payload).toContain('Certificate accepted')

    const secondDetailResponse = await inject(
      {
        method: 'GET',
        url: '/497f6eca-6276-4993-bfeb-53cbbbba6f08/certificates-of-compliance/decl-101411'
      },
      mergeCookiesFromResponse(cookieAfterApprove, firstDetailResponse)
    )
    expect(secondDetailResponse.payload).not.toContain('Certificate accepted')
  })
})
