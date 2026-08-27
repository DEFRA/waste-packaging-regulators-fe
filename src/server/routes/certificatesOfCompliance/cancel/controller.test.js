import { statusCodes } from '#server/common/constants/status-codes.js'

vi.mock('#services/govuk-notify.service.js', async (importOriginal) => {
  const { createCancellationEmailNotifyModuleMock } =
    await import('#test-helpers/cancellation-email-notify.mock.js')
  return createCancellationEmailNotifyModuleMock(importOriginal)
})

import { setupRegulatorsApp } from '#test-helpers/msw/harness.js'
import {
  loadReasonPage,
  loadCheckPage,
  loadEmailPreviewPage
} from './cancel.page-object.js'

// The declarations, and the recipient contacts the email preview lists, are
// declared inline so every asserted value traces back to this input.
const approved = (firstName, lastName, email, telephoneNumber) => ({
  firstName,
  lastName,
  email,
  telephoneNumber,
  serviceRole: 'Approved Person'
})
const ORGS = [
  {
    name: 'Kelmscott Producers Ltd',
    status: 'pending',
    submitter: 'Nadia Roche',
    persons: [
      approved(
        'Catherine',
        'Morris',
        'catherine.morris@howco.test',
        '020 7946 0100'
      ),
      approved('James', 'Wright', 'james.wright@howco.test', '020 7946 0109')
    ]
  },
  {
    name: 'Perrenar Compliance Operators',
    type: 'compliance-scheme',
    status: 'pending',
    submitter: 'Owen Pryce',
    persons: [
      approved('Jane', 'Doe', 'jane.doe@ecopack.co.uk', '020 7946 0110')
    ]
  },
  { name: 'Quenby Producers Ltd', status: 'cancelled', listed: false }
]
const itemOf = (org) => ({
  organisationId: org.organisationId,
  id: org.declarationId,
  name: org.name
})

const reasonUrlFor = (item) =>
  `/${item.organisationId}/certificates-of-compliance/${item.id}/cancel/reason`
const checkUrlFor = (item) =>
  `/${item.organisationId}/certificates-of-compliance/${item.id}/cancel/check`
const emailPreviewUrlFor = (item, reason = 'producer-request') =>
  `/${item.organisationId}/certificates-of-compliance/${item.id}/cancel/email-preview?reason=${reason}`
// The cancellation itself posts to the bare …/cancel resource.
const actionUrlFor = (item) =>
  `/${item.organisationId}/certificates-of-compliance/${item.id}/cancel`
const detailUrlFor = (item) =>
  `/${item.organisationId}/certificates-of-compliance/${item.id}`

describe('certificates of compliance — cancel', () => {
  const app = setupRegulatorsApp()
  let DP_ITEM
  let CS_ITEM
  let CANCELLED_ITEM

  // Fresh scenario per test so a cancellation in one test never leaks into the next.
  beforeEach(() => {
    const scenario = app.given(ORGS)
    DP_ITEM = itemOf(scenario.byName('Kelmscott Producers Ltd'))
    CS_ITEM = itemOf(scenario.byName('Perrenar Compliance Operators'))
    CANCELLED_ITEM = itemOf(scenario.byName('Quenby Producers Ltd'))
  })

  // Choose a reason, then confirm — the two POSTs that make up a cancellation.
  // The reason travels in the form body, not the session.
  async function cancel(item, reason, cookie) {
    await app.post(reasonUrlFor(item), `cancel-reason=${reason}`, cookie)
    return app.post(actionUrlFor(item), `cancel-reason=${reason}`, cookie)
  }

  describe('GET reason page', () => {
    it('redirects unauthenticated users to /signin-oidc', async () => {
      const response = await app.server.inject({
        method: 'GET',
        url: reasonUrlFor(DP_ITEM)
      })
      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe('/signin-oidc')
    })

    it('renders the reason radios with certificate wording for a Direct Producer', async () => {
      const cookie = await app.signIn()
      const response = await app.get(reasonUrlFor(DP_ITEM), cookie)
      const page = loadReasonPage(response.payload)

      expect(response.statusCode).toBe(statusCodes.ok)
      expect(page.heading).toBe(
        `Why are you cancelling ${DP_ITEM.name}'s certificate?`
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
      const cookie = await app.signIn()
      const response = await app.get(reasonUrlFor(CS_ITEM), cookie)
      const page = loadReasonPage(response.payload)

      expect(response.statusCode).toBe(statusCodes.ok)
      expect(page.heading).toBe(
        `Why are you cancelling ${CS_ITEM.name}'s statement?`
      )
      expect(page.reasons[2].label).toBe(
        'Compliance scheme can meet recycling obligations'
      )
    })

    it('pre-selects no reason on first load', async () => {
      const cookie = await app.signIn()
      const response = await app.get(reasonUrlFor(DP_ITEM), cookie)
      const page = loadReasonPage(response.payload)

      expect(page.reasons.every((r) => !r.checked)).toBe(true)
    })

    it('pre-selects the reason carried in the URL', async () => {
      const cookie = await app.signIn()
      const response = await app.get(
        `${reasonUrlFor(DP_ITEM)}?reason=obligations-changed`,
        cookie
      )
      const page = loadReasonPage(response.payload)

      const checked = page.reasons.filter((r) => r.checked).map((r) => r.value)
      expect(checked).toEqual(['obligations-changed'])
    })

    it('redirects to the detail page when the declaration is already cancelled', async () => {
      const cookie = await app.signIn()
      const response = await app.get(reasonUrlFor(CANCELLED_ITEM), cookie)
      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe(detailUrlFor(CANCELLED_ITEM))
    })
  })

  describe('POST reason page', () => {
    it('redirects unauthenticated users to /signin-oidc', async () => {
      const response = await app.post(
        reasonUrlFor(DP_ITEM),
        'cancel-reason=producer-request',
        await app.anonCrumb()
      )
      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe('/signin-oidc')
    })

    it('rejects a request with no CSRF token', async () => {
      const response = await app.server.inject({
        method: 'POST',
        url: reasonUrlFor(DP_ITEM),
        payload: 'cancel-reason=producer-request',
        headers: { 'content-type': 'application/x-www-form-urlencoded' }
      })
      expect(response.statusCode).toBe(statusCodes.forbidden)
    })

    it('re-renders with an error summary when no reason is selected', async () => {
      const cookie = await app.signIn()
      const response = await app.post(reasonUrlFor(DP_ITEM), '', cookie)
      const page = loadReasonPage(response.payload)

      expect(response.statusCode).toBe(statusCodes.ok)
      expect(page.error.title).toBe('There is a problem')
      expect(page.error.message).toBe(
        'Select why you are cancelling this certificate'
      )
      expect(page.error.href).toBe('#cancel-reason')
    })

    it('re-renders with statement wording in the error for a Compliance Scheme', async () => {
      const cookie = await app.signIn()
      const response = await app.post(reasonUrlFor(CS_ITEM), '', cookie)

      expect(loadReasonPage(response.payload).error.message).toBe(
        'Select why you are cancelling this statement'
      )
    })

    it('re-renders when an unrecognised reason is submitted', async () => {
      const cookie = await app.signIn()
      const response = await app.post(
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
      const cookie = await app.signIn()
      const response = await app.post(
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
      const cookie = await app.signIn()
      const response = await app.get(checkUrlFor(DP_ITEM), cookie)
      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe(reasonUrlFor(DP_ITEM))
    })

    it('redirects to the detail page when the declaration is already cancelled', async () => {
      const cookie = await app.signIn()
      const response = await app.get(checkUrlFor(CANCELLED_ITEM), cookie)
      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe(detailUrlFor(CANCELLED_ITEM))
    })

    it('shows the selected reason, a Change link and inset text for a Direct Producer', async () => {
      const cookie = await app.signIn()
      const response = await app.get(
        `${checkUrlFor(DP_ITEM)}?reason=producer-request`,
        cookie
      )
      const page = loadCheckPage(response.payload)

      expect(response.statusCode).toBe(statusCodes.ok)
      expect(page.heading).toBe('Confirm and send cancellation email')
      expect(page.organisation).toBe(DP_ITEM.name)
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
      expect(page.emailLinkHref).toBe(
        emailPreviewUrlFor(DP_ITEM, 'producer-request')
      )
      expect(page.insetText).toContain(
        "we'll cancel the certificate and email the person who submitted it"
      )
      expect(page.confirmButton).toBe('Confirm and send')
    })

    it('shows statement inset text for a Compliance Scheme', async () => {
      const cookie = await app.signIn()
      const response = await app.get(
        `${checkUrlFor(CS_ITEM)}?reason=producer-request`,
        cookie
      )

      expect(loadCheckPage(response.payload).insetText).toContain(
        "we'll cancel the statement and email the person who submitted it"
      )
    })
  })

  describe('GET email preview', () => {
    it('redirects unauthenticated users to /signin-oidc', async () => {
      const response = await app.server.inject({
        method: 'GET',
        url: emailPreviewUrlFor(DP_ITEM)
      })
      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe('/signin-oidc')
    })

    it('redirects to the reason page when no reason is in the URL', async () => {
      const cookie = await app.signIn()
      const response = await app.get(
        `/${DP_ITEM.organisationId}/certificates-of-compliance/${DP_ITEM.id}/cancel/email-preview`,
        cookie
      )
      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe(reasonUrlFor(DP_ITEM))
    })

    it('lists submitter and primary contact emails and renders personalisation from the Notify preview for a direct producer', async () => {
      const cookie = await app.signIn()
      const response = await app.get(emailPreviewUrlFor(DP_ITEM), cookie)
      const page = loadEmailPreviewPage(response.payload)

      expect(response.statusCode).toBe(statusCodes.ok)
      expect(page.toLine).toBe(
        'catherine.morris@howco.test, nadia.roche@scenario.test'
      )
      expect(page.bodyHtml).toContain('Catherine')
      expect(page.bodyHtml).toContain('Morris')
      expect(page.bodyHtml).toContain('ea@environment-agency.gov.uk')
      expect(page.bodyHtml).toContain('<h2>Preview section</h2>')
    })

    it('lists submitter and primary contact emails and renders personalisation from the Notify preview for a compliance scheme', async () => {
      const cookie = await app.signIn()
      const response = await app.get(emailPreviewUrlFor(CS_ITEM), cookie)
      const page = loadEmailPreviewPage(response.payload)

      expect(response.statusCode).toBe(statusCodes.ok)
      expect(page.toLine).toBe(
        'jane.doe@ecopack.co.uk, owen.pryce@scenario.test'
      )
      expect(page.bodyHtml).toContain('Jane')
      expect(page.bodyHtml).toContain('Doe')
      expect(page.bodyHtml).toContain('ea@environment-agency.gov.uk')
      expect(page.bodyHtml).toContain('<h2>Preview section</h2>')
    })
  })

  describe('POST cancel (the action)', () => {
    it('redirects unauthenticated users to /signin-oidc', async () => {
      const response = await app.post(
        actionUrlFor(DP_ITEM),
        '',
        await app.anonCrumb()
      )
      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe('/signin-oidc')
    })

    it('rejects a request with no CSRF token', async () => {
      const response = await app.server.inject({
        method: 'POST',
        url: actionUrlFor(DP_ITEM)
      })
      expect(response.statusCode).toBe(statusCodes.forbidden)
    })

    it('redirects to the reason page when no reason is submitted', async () => {
      const cookie = await app.signIn()
      const response = await app.post(actionUrlFor(DP_ITEM), '', cookie)
      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe(reasonUrlFor(DP_ITEM))
    })

    it('records the cancellation, shows the banner and the reason, and hides the action buttons', async () => {
      const cookie = await app.signIn()
      const cancelResponse = await cancel(DP_ITEM, 'producer-request', cookie)

      expect(cancelResponse.statusCode).toBe(302)
      expect(cancelResponse.headers.location).toBe(detailUrlFor(DP_ITEM))

      const detailResponse = await app.get(
        detailUrlFor(DP_ITEM),
        app.nextCookie(cancelResponse, cookie)
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
      const cookie = await app.signIn()
      const firstCancel = await cancel(DP_ITEM, 'producer-request', cookie)
      const cookieAfterCancel = app.nextCookie(firstCancel, cookie)

      // Clear the first banner by visiting the detail page.
      const firstView = await app.get(detailUrlFor(DP_ITEM), cookieAfterCancel)
      const cookieAfterView = app.nextCookie(firstView, cookieAfterCancel)

      const secondConfirm = await app.post(
        actionUrlFor(DP_ITEM),
        '',
        cookieAfterView
      )
      expect(secondConfirm.statusCode).toBe(302)
      expect(secondConfirm.headers.location).toBe(detailUrlFor(DP_ITEM))

      const detailResponse = await app.get(
        detailUrlFor(DP_ITEM),
        app.nextCookie(secondConfirm, cookieAfterView)
      )
      expect(detailResponse.payload).toContain('Certificate cancelled')
    })
  })
})
