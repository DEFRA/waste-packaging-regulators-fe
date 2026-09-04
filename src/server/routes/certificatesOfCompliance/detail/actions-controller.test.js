import { describe, it, expect, vi } from 'vitest'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { redirectToSignIn } from './actions-controller.js'
import { setupRegulatorsApp } from '#test-helpers/msw/harness.js'

describe('redirectToSignIn', () => {
  it('stores the pathname as returnTo in the session', () => {
    const yar = { set: vi.fn() }
    const request = {
      yar,
      url: {
        pathname: '/org-123/certificates-of-compliance/decl-1/accept',
        search: ''
      }
    }
    const h = { redirect: vi.fn() }

    redirectToSignIn(request, h)

    expect(yar.set).toHaveBeenCalledWith(
      'returnTo',
      '/org-123/certificates-of-compliance/decl-1/accept'
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
      url: { pathname: '/some/path', search: '' },
      query: {},
      headers: {}
    }
    const h = { redirect: vi.fn((url) => `redirect:${url}`) }

    const result = redirectToSignIn(request, h)

    expect(h.redirect).toHaveBeenCalledWith('/signin-oidc')
    expect(result).toBe('redirect:/signin-oidc')
  })

  it('persists Welsh locale and appends lang query when redirecting to sign in', () => {
    const store = new Map()
    const request = {
      yar: {
        set: vi.fn((key, value) => {
          store.set(key, value)
        })
      },
      url: { pathname: '/some/path', search: '?lang=cy' },
      query: { lang: 'cy' },
      headers: {}
    }
    const h = { redirect: vi.fn((url) => `redirect:${url}`) }

    redirectToSignIn(request, h)

    expect(store.get('authLocale')).toBe('cy')
    expect(h.redirect).toHaveBeenCalledWith('/signin-oidc?lang=cy')
  })
})

describe('certificates of compliance detail action buttons', () => {
  const app = setupRegulatorsApp()
  // The declaration under test is declared inline; each test starts from a fresh
  // pending direct producer, so an approve/cancel never leaks into the next.
  let detailUrl

  beforeEach(() => {
    detailUrl = app
      .given([{ name: 'Actionable Producers Ltd', status: 'pending' }])
      .byName('Actionable Producers Ltd').detailPath
  })

  // Approval is performed by the accept confirmation handler — there is no
  // direct approve endpoint.
  const acceptDeclaration = (cookie = app.authCookie) =>
    app.post(`${detailUrl}/accept`, 'confirm-accept=yes', cookie)

  // Cancellation is a two-step flow: choose a reason, then confirm and send.
  // The reason travels in the form body, not the session.
  const cancelDeclaration = async (cookie = app.authCookie) => {
    await app.post(
      `${detailUrl}/cancel/reason`,
      'cancel-reason=producer-request',
      cookie
    )
    return app.post(
      `${detailUrl}/cancel`,
      'cancel-reason=producer-request',
      cookie
    )
  }

  describe('approval (via the accept confirmation)', () => {
    it('redirects to the detail page and shows the accepted banner', async () => {
      const acceptResponse = await acceptDeclaration()

      expect(acceptResponse.statusCode).toBe(302)
      expect(acceptResponse.headers.location).toBe(detailUrl)

      const detailResponse = await app.get(
        detailUrl,
        app.nextCookie(acceptResponse, app.authCookie)
      )

      expect(detailResponse.statusCode).toBe(statusCodes.ok)
      expect(detailResponse.payload).toContain('Certificate accepted')
      expect(detailResponse.payload).toContain('Certificate has been accepted.')
    })
  })

  describe('cancel', () => {
    it('redirects to the detail page and shows the cancelled banner', async () => {
      const cancelResponse = await cancelDeclaration()

      expect(cancelResponse.statusCode).toBe(302)
      expect(cancelResponse.headers.location).toBe(detailUrl)

      const detailResponse = await app.get(
        detailUrl,
        app.nextCookie(cancelResponse, app.authCookie)
      )

      expect(detailResponse.statusCode).toBe(statusCodes.ok)
      expect(detailResponse.payload).toContain('Certificate cancelled')
      expect(detailResponse.payload).toContain(
        'Certificate has been cancelled and an email sent to the producer.'
      )
      expect(detailResponse.payload).toContain(
        'app-notification-banner--cancelled'
      )
    })
  })

  it('handles repeat approval idempotently and still shows the accepted banner', async () => {
    const firstApproveResponse = await acceptDeclaration()
    const cookieAfterFirstApprove = app.nextCookie(
      firstApproveResponse,
      app.authCookie
    )

    await app.get(detailUrl, cookieAfterFirstApprove)

    const repeatApproveResponse = await acceptDeclaration(
      cookieAfterFirstApprove
    )

    expect(repeatApproveResponse.statusCode).toBe(302)

    const detailResponse = await app.get(
      detailUrl,
      app.nextCookie(repeatApproveResponse, cookieAfterFirstApprove)
    )

    expect(detailResponse.payload).toContain('Certificate accepted')
  })

  it('clears the banner flag after it has been shown once', async () => {
    const approveResponse = await acceptDeclaration()
    const cookieAfterApprove = app.nextCookie(approveResponse, app.authCookie)

    const firstDetailResponse = await app.get(detailUrl, cookieAfterApprove)
    expect(firstDetailResponse.payload).toContain('Certificate accepted')

    const secondDetailResponse = await app.get(
      detailUrl,
      app.nextCookie(firstDetailResponse, cookieAfterApprove)
    )
    expect(secondDetailResponse.payload).not.toContain('Certificate accepted')
  })
})
