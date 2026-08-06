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
import { loadDetailPage } from './detail/detail.page-object.js'
import {
  authCookiesFromResponse,
  csrfTokenCookieFromResponse,
  crumbTokenFromCookie,
  mergeCookiesFromResponse,
  sessionCookieFromResponse
} from '#test-helpers/cookies.js'

const HOWCO_DETAIL_URL =
  '/497f6eca-6276-4993-bfeb-53cbbbba6f08/certificates-of-compliance/decl-101411'
const GREENFIELD_DETAIL_URL =
  '/b1e2c3d4-e5f6-7890-abcd-ef1234567890/certificates-of-compliance/decl-204872'
const ECOPACK_DETAIL_URL =
  '/923fa611-571c-4948-ab7d-fbb75e75ed65/certificates-of-compliance/decl-cs-001'
const RIVERSIDE_DETAIL_URL =
  '/6d9a1e77-1b3f-4c22-8a41-8f5c1e9d2b34/certificates-of-compliance/decl-cs-102'
const REDWOOD_UNSUBMITTED_URL =
  '/d1e2f3a4-b5c6-7890-abcd-ef1234567890/certificates-of-compliance?obligationYear=2026'
const FUTUREPACK_UNSUBMITTED_URL =
  '/a9b8c7d6-e5f4-3210-abcd-ef9876543210/certificates-of-compliance?obligationYear=2026'

function detailPathFor(item) {
  return `/${item.organisationId}/certificates-of-compliance/${item.id}`
}

function detailPathForDetailData(detailData) {
  return `/${detailData.organisation.id}/certificates-of-compliance/${detailData.id}`
}

describe('certificates of compliance — journey', () => {
  let server
  let sessionCookie
  // A crumb minted without signing in, mirroring a real browser that loaded a
  // form (and its crumb) before its session lapsed.
  let anonCrumbCookie

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
    const response = await server.inject({
      method: 'GET',
      url: '/signin-oidc'
    })
    sessionCookie = authCookiesFromResponse(response)

    const anonResponse = await server.inject({
      method: 'GET',
      url: '/certificates-of-compliance'
    })
    anonCrumbCookie = csrfTokenCookieFromResponse(anonResponse)
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  const inject = (url) =>
    server.inject({ method: 'GET', url, headers: { cookie: sessionCookie } })

  // POST a form body with the crumb echoed back from the given cookie.
  const postForm = (url, cookie, payload = '') => {
    const token = crumbTokenFromCookie(cookie)
    const body = [payload, `CSRFToken=${token}`].filter(Boolean).join('&')
    return server.inject({
      method: 'POST',
      url,
      payload: body,
      headers: {
        cookie,
        'content-type': 'application/x-www-form-urlencoded'
      }
    })
  }

  // Drive the two-step cancel flow: choose a reason, then confirm and send.
  // The reason travels in the form body, not the session.
  const cancelCertificate = async (item, cookie) => {
    await postForm(
      `${detailPathFor(item)}/cancel/reason`,
      cookie,
      'cancel-reason=producer-request'
    )
    return postForm(
      `${detailPathFor(item)}/cancel`,
      cookie,
      'cancel-reason=producer-request'
    )
  }

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
      const unauthCookie = sessionCookieFromResponse(unauthResponse)

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
        new RegExp(
          `href="(\\.\\/[^"]+\\/certificates-of-compliance\\/${mockPendingItems[0].id})"`
        )
      )
      expect(match, 'Should extract detail link').not.toBeNull()

      const detailPath = match[1].replace('./', '/')
      const detailResponse = await inject(detailPath)

      expect(
        detailResponse.statusCode,
        'Should successfully call detail page'
      ).toBe(statusCodes.ok)
      const { heading } = loadDetailPage(detailResponse.payload)
      expect(heading, 'Should show organisation name on detail page').toContain(
        mockPendingItems[0].organisationName
      )
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
        new RegExp(
          `href="(\\.\\/[^"]+\\/certificates-of-compliance\\/${mockAcceptedItems[0].id})"`
        )
      )
      expect(match).not.toBeNull()

      const detailPath = match[1].replace('./', '/')
      const detailResponse = await inject(detailPath)

      expect(
        detailResponse.statusCode,
        'Should successfully call detail page'
      ).toBe(statusCodes.ok)
      const { heading } = loadDetailPage(detailResponse.payload)
      expect(heading, 'Should show organisation name on detail page').toContain(
        mockAcceptedItems[0].organisationName
      )
    })
  })

  describe('detail page actions', () => {
    it('shows Accept and Cancel certificate buttons for a pending direct producer', async () => {
      const response = await inject(detailPathFor(mockPendingItems[0]))

      expect(response.statusCode).toBe(statusCodes.ok)
      const { actions } = loadDetailPage(response.payload)
      expect(actions.accept.text).toBe('Accept certificate')
      expect(actions.cancel.text).toBe('Cancel certificate')
    })

    it('shows Accept and Cancel statement buttons for a pending compliance scheme', async () => {
      const item = mockComplianceSchemePendingItems[0]
      const response = await inject(detailPathFor(item))

      expect(response.statusCode).toBe(statusCodes.ok)
      const { actions } = loadDetailPage(response.payload)
      expect(actions.accept.text).toBe('Accept statement')
      expect(actions.cancel.text).toBe('Cancel statement')
    })

    it('shows cancel only for an accepted direct producer', async () => {
      const response = await inject(detailPathFor(mockAcceptedItems[0]))

      expect(response.statusCode).toBe(statusCodes.ok)
      const { actions } = loadDetailPage(response.payload)
      expect(actions.accept).toBeNull()
      expect(actions.cancel.text).toBe('Cancel certificate')
      expect(actions.cancel.href).toBe(
        `${detailPathFor(mockAcceptedItems[0])}/cancel/reason`
      )
    })

    it('shows cancel only for an accepted compliance scheme', async () => {
      const item = mockComplianceSchemeAcceptedItems[0]
      const response = await inject(detailPathFor(item))

      expect(response.statusCode).toBe(statusCodes.ok)
      const { actions } = loadDetailPage(response.payload)
      expect(actions.accept).toBeNull()
      expect(actions.cancel.text).toBe('Cancel statement')
      expect(actions.cancel.href).toBe(`${detailPathFor(item)}/cancel/reason`)
    })

    it('shows no action buttons for a cancelled direct producer', async () => {
      const response = await inject(
        detailPathForDetailData(mockDirectProducerCancelledDetailData)
      )

      expect(response.statusCode).toBe(statusCodes.ok)
      const { actions } = loadDetailPage(response.payload)
      expect(actions.accept).toBeNull()
      expect(actions.cancel).toBeNull()
    })

    it('shows no action buttons for a cancelled compliance scheme', async () => {
      const response = await inject(
        detailPathForDetailData(mockComplianceSchemeCancelledDetailData)
      )

      expect(response.statusCode).toBe(statusCodes.ok)
      const { actions } = loadDetailPage(response.payload)
      expect(actions.accept).toBeNull()
      expect(actions.cancel).toBeNull()
    })

    it('cancel flow redirects to detail with cancelled banner styling', async () => {
      const item = mockPendingItems[0]
      const cancelResponse = await cancelCertificate(item, sessionCookie)

      expect(cancelResponse.statusCode).toBe(302)
      expect(cancelResponse.headers.location).toBe(detailPathFor(item))

      const detailResponse = await server.inject({
        method: 'GET',
        url: detailPathFor(item),
        headers: {
          cookie: mergeCookiesFromResponse(sessionCookie, cancelResponse)
        }
      })

      const detailsPage = loadDetailPage(detailResponse.payload)
      expect(detailsPage.banner.present).toBe(true)
      expect(detailsPage.banner.cancelled).toBe(true)
      expect(detailsPage.banner.heading).toBe('Certificate cancelled')
      expect(detailsPage.cancellation.present).toBe(true)
      expect(detailsPage.cancellation.statusLabel).toBe('Submission status')
      expect(detailsPage.cancellation.statusTag).toEqual({
        text: 'Cancelled',
        colour: 'yellow'
      })
      expect(detailsPage.cancellation.cancelledBy).toBe('John Doe')
      expect(detailsPage.cancellation.reason).toBe(
        'Producer requested to cancel'
      )
    })

    it('compliance scheme cancel flow shows statement cancelled banner', async () => {
      const item = mockComplianceSchemePendingItems[0]
      const cancelResponse = await cancelCertificate(item, sessionCookie)

      expect(cancelResponse.statusCode).toBe(302)

      const detailResponse = await server.inject({
        method: 'GET',
        url: detailPathFor(item),
        headers: {
          cookie: mergeCookiesFromResponse(sessionCookie, cancelResponse)
        }
      })

      const detailsPage = loadDetailPage(detailResponse.payload)
      expect(detailsPage.banner.present).toBe(true)
      expect(detailsPage.banner.cancelled).toBe(true)
      expect(detailsPage.banner.heading).toBe('Statement cancelled')
      expect(detailsPage.banner.text).toBe(
        'Statement has been cancelled and an email sent to the compliance scheme.'
      )
      expect(detailsPage.cancellation.present).toBe(true)
      expect(detailsPage.cancellation.statusLabel).toBe('Submission status')
      expect(detailsPage.cancellation.statusTag).toEqual({
        text: 'Cancelled',
        colour: 'yellow'
      })
      expect(detailsPage.cancellation.cancelledBy).toBe('John Doe')
      expect(detailsPage.cancellation.reason).toBe(
        'Compliance scheme requested to cancel'
      )
    })
  })

  describe('sign-in populates user in session for certificate actions', () => {
    it('cancel action redirects to /signin-oidc when no user is in session', async () => {
      const item = mockPendingItems[0]
      const response = await postForm(
        `${detailPathFor(item)}/cancel`,
        anonCrumbCookie
      )

      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe('/signin-oidc')
    })

    it('cancel action succeeds after sign-in populates user from account API', async () => {
      const signinResponse = await server.inject({
        method: 'GET',
        url: '/signin-oidc'
      })
      const cookie = authCookiesFromResponse(signinResponse)

      const item = mockPendingItems[0]
      const cancelResponse = await cancelCertificate(item, cookie)

      expect(cancelResponse.statusCode).toBe(302)
      expect(cancelResponse.headers.location).toBe(detailPathFor(item))
    })

    it('full flow: unauthenticated action → sign-in with user from account API → action succeeds', async () => {
      const item = mockPendingItems[0]
      const acceptUrl = `${detailPathFor(item)}/accept`

      // Submit the confirmation unauthenticated (carrying a crumb, as a real
      // form would) — stored as returnTo and redirected to sign-in
      const unauthResponse = await postForm(
        acceptUrl,
        anonCrumbCookie,
        'confirm-accept=yes'
      )
      expect(unauthResponse.statusCode).toBe(302)
      expect(unauthResponse.headers.location).toBe('/signin-oidc')
      const afterUnauth = mergeCookiesFromResponse(
        anonCrumbCookie,
        unauthResponse
      )

      // Sign in — account API populates user in session, redirects back to acceptUrl
      const signinResponse = await server.inject({
        method: 'GET',
        url: '/signin-oidc',
        headers: { cookie: afterUnauth }
      })
      expect(signinResponse.statusCode).toBe(302)
      expect(signinResponse.headers.location).toBe(acceptUrl)
      const signedInCookie = mergeCookiesFromResponse(
        afterUnauth,
        signinResponse
      )

      // Retry with the signed-in session — approval succeeds
      const acceptResponse = await postForm(
        acceptUrl,
        signedInCookie,
        'confirm-accept=yes'
      )
      expect(acceptResponse.statusCode).toBe(302)
      expect(acceptResponse.headers.location).toBe(detailPathFor(item))
    })
  })

  describe('accept confirmation journey', () => {
    const acceptPathFor = (item) => `${detailPathFor(item)}/accept`

    const postAccept = (item, choice, cookie) =>
      postForm(acceptPathFor(item), cookie, `confirm-accept=${choice}`)

    it('detail page Accept button links to the confirmation page', async () => {
      const item = mockPendingItems[0]
      const response = await inject(detailPathFor(item))

      expect(response.statusCode).toBe(statusCodes.ok)
      const { actions } = loadDetailPage(response.payload)
      expect(actions.accept.href).toBe(acceptPathFor(item))
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
      const detailsPage = loadDetailPage(detailResponse.payload)
      expect(detailsPage.banner.present).toBe(true)
      expect(detailsPage.banner.cancelled).toBe(false)
      expect(detailsPage.banner.heading).toBe('Certificate accepted')
      expect(detailsPage.banner.text).toBe('Certificate has been accepted.')
      expect(detailsPage.accepted.present).toBe(true)
      expect(detailsPage.accepted.statusLabel).toBe('Submission status')
      expect(detailsPage.accepted.statusTag).toEqual({
        text: 'Accepted',
        colour: 'teal'
      })
      expect(detailsPage.accepted.acceptedBy).toBe('John Doe')
      expect(detailsPage.accepted.acceptedDate).toBeTruthy()
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
      const { banner } = loadDetailPage(detailResponse.payload)
      expect(banner.present).toBe(false)
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
      const detailsPage = loadDetailPage(detailResponse.payload)
      expect(detailsPage.banner.present).toBe(true)
      expect(detailsPage.banner.heading).toBe('Statement accepted')
      expect(detailsPage.banner.text).toBe('Statement has been accepted.')
      expect(detailsPage.accepted.present).toBe(true)
      expect(detailsPage.accepted.statusLabel).toBe('Submission status')
      expect(detailsPage.accepted.acceptedBy).toBe('John Doe')
    })

    it('accept then cancel shows Accepted and Cancelled rows in current year', async () => {
      const signInResponse = await server.inject({
        method: 'GET',
        url: '/signin-oidc'
      })
      const freshCookie = authCookiesFromResponse(signInResponse)

      const item = mockPendingItems[1]
      const acceptResponse = await postAccept(item, 'yes', freshCookie)
      expect(acceptResponse.statusCode).toBe(302)

      let cookie = mergeCookiesFromResponse(freshCookie, acceptResponse)
      const cancelResponse = await cancelCertificate(item, cookie)
      expect(cancelResponse.statusCode).toBe(302)

      cookie = mergeCookiesFromResponse(cookie, cancelResponse)
      const detailResponse = await server.inject({
        method: 'GET',
        url: detailPathFor(item),
        headers: { cookie }
      })

      const { currentYear } = loadDetailPage(detailResponse.payload)
      const rowActions = currentYear.rows.map((row) => row.action)
      expect(rowActions).toContain('Accepted')
      expect(rowActions).toContain('Cancelled')
      expect(currentYear.rows.some((row) => row.by === 'John Doe')).toBe(true)
    })
  })

  describe('declaration section', () => {
    it('shows the declaration for a submitted (pending) direct producer', async () => {
      const { declaration } = loadDetailPage(
        (await inject(HOWCO_DETAIL_URL)).payload
      )

      expect(declaration.present).toBe(true)
      expect(declaration.documentNoun).toBe('certificate of compliance')
    })

    it('shows the declaration for a submitted (pending) compliance scheme with statement wording', async () => {
      const { declaration } = loadDetailPage(
        (await inject(ECOPACK_DETAIL_URL)).payload
      )

      expect(declaration.present).toBe(true)
      expect(declaration.documentNoun).toBe('statement of compliance')
    })

    it('shows the declaration for an accepted direct producer', async () => {
      const { declaration } = loadDetailPage(
        (await inject(detailPathFor(mockAcceptedItems[0]))).payload
      )

      expect(declaration.present).toBe(true)
    })

    it('hides the declaration for an unsubmitted organisation', async () => {
      const { declaration } = loadDetailPage(
        (await inject(REDWOOD_UNSUBMITTED_URL)).payload
      )

      expect(declaration.present).toBe(false)
    })

    it('shows the declaration for a cancelled direct producer', async () => {
      const detailsPage = loadDetailPage(
        (
          await inject(
            detailPathForDetailData(mockDirectProducerCancelledDetailData)
          )
        ).payload
      )

      expect(detailsPage.declaration.present).toBe(true)
      expect(detailsPage.declaration.documentNoun).toBe(
        'certificate of compliance'
      )
      expect(detailsPage.cancellation.present).toBe(true)
      expect(detailsPage.cancellation.statusLabel).toBe('Submission status')
      expect(detailsPage.cancellation.statusTag).toEqual({
        text: 'Cancelled',
        colour: 'yellow'
      })
      expect(detailsPage.cancellation.cancelledBy).toBe('James Walker')
      expect(detailsPage.cancellation.cancelledDate).toBe(
        '10 March 2026 at 09:15'
      )
      expect(detailsPage.cancellation.reason).toBe(
        'Submitted after the deadline.'
      )
    })

    it('shows the declaration for a cancelled compliance scheme', async () => {
      const detailsPage = loadDetailPage(
        (
          await inject(
            detailPathForDetailData(mockComplianceSchemeCancelledDetailData)
          )
        ).payload
      )

      expect(detailsPage.declaration.present).toBe(true)
      expect(detailsPage.declaration.documentNoun).toBe(
        'statement of compliance'
      )
      expect(detailsPage.cancellation.present).toBe(true)
      expect(detailsPage.cancellation.statusLabel).toBe('Submission status')
      expect(detailsPage.cancellation.statusTag).toEqual({
        text: 'Cancelled',
        colour: 'yellow'
      })
      expect(detailsPage.cancellation.cancelledBy).toBe('James Walker')
      expect(detailsPage.cancellation.cancelledDate).toBe(
        '8 March 2026 at 11:30'
      )
      expect(detailsPage.cancellation.reason).toBe(
        'Incomplete member data submitted.'
      )
    })
  })

  describe('inset text', () => {
    it('shows the submission message for a submitted direct producer', async () => {
      const { insetText } = loadDetailPage(
        (await inject(HOWCO_DETAIL_URL)).payload
      )

      expect(insetText).toContain(
        'The information on this certificate was correct at the time of submission.'
      )
    })

    it('shows the submission message for a submitted compliance scheme', async () => {
      const { insetText } = loadDetailPage(
        (await inject(ECOPACK_DETAIL_URL)).payload
      )

      expect(insetText).toContain(
        'The information on this statement was correct at the time of submission.'
      )
    })

    it('shows the not-submitted certificate message for an unsubmitted direct producer', async () => {
      const { insetText } = loadDetailPage(
        (await inject(REDWOOD_UNSUBMITTED_URL)).payload
      )

      expect(insetText).toContain(
        'This certificate is not submitted so the information will update if changed by the producer.'
      )
    })

    it('shows the not-submitted statement message for an unsubmitted compliance scheme', async () => {
      const { insetText } = loadDetailPage(
        (await inject(FUTUREPACK_UNSUBMITTED_URL)).payload
      )

      expect(insetText).toContain(
        'This statement is not submitted so the information will update if changed by the compliance scheme.'
      )
    })
  })

  describe('not-submitted compliance scheme detail', () => {
    it('headings show the scheme operator, not the compliance scheme name', async () => {
      const payload = (await inject(FUTUREPACK_UNSUBMITTED_URL)).payload
      const { heading } = loadDetailPage(payload)

      expect(heading).toBe('FuturePack Operators')
      expect(payload).not.toContain('FuturePack Compliance Scheme')
    })

    it('shows the email address and phone number of the nominated contact', async () => {
      const payload = (await inject(FUTUREPACK_UNSUBMITTED_URL)).payload
      const { summaryRows } = loadDetailPage(payload)

      expect(summaryRows.emailAddress.value).toBe(
        'nadia.clarke@futurepack.test'
      )
      expect(summaryRows.phoneNumber.value).toBe('020 7946 0103')
      expect(payload).not.toContain('sam.reed@example.test')
    })

    it('populates organisation type and company number for every scheme', async () => {
      for (const item of mockComplianceSchemeNotSubmittedItems) {
        const { heading, summaryRows } = loadDetailPage(
          (
            await inject(
              `/${item.organisationId}/certificates-of-compliance?obligationYear=2026`
            )
          ).payload
        )

        expect(heading).toBe(item.organisationName)
        expect(summaryRows.organisationType.value).toBe('Compliance scheme')
        expect(summaryRows.companyNumber.value).not.toContain('No data')
      }
    })

    it('keeps Name on account hidden — there is no submitter', async () => {
      const { summaryRows } = loadDetailPage(
        (await inject(FUTUREPACK_UNSUBMITTED_URL)).payload
      )

      expect(summaryRows.nameOnAccount.present).toBe(false)
    })
  })

  describe('Regulation 43 section', () => {
    const ECOPACK_COMPLIANT_URL =
      '/e1d2c3b4-a596-4878-9abc-def012345678/certificates-of-compliance/decl-cs-101'

    it('shows the not complied statement for a not compliant compliance scheme', async () => {
      const { regulation43 } = loadDetailPage(
        (await inject(ECOPACK_DETAIL_URL)).payload
      )

      expect(regulation43.present).toBe(true)
      expect(regulation43.text).toBe(
        'EcoPack Group declared they have not complied with all other requirements in regulation 43.'
      )
    })

    it('shows the complied statement for a compliant compliance scheme', async () => {
      const { regulation43 } = loadDetailPage(
        (await inject(ECOPACK_COMPLIANT_URL)).payload
      )

      expect(regulation43.present).toBe(true)
      expect(regulation43.text).toBe(
        'Nationwide Packaging Group declared they have complied with all other requirements in regulation 43.'
      )
    })

    it('shows a grey No data empty state for a compliance scheme with no submission', async () => {
      const FUTUREPACK_UNSUBMITTED_URL =
        '/a9b8c7d6-e5f4-3210-abcd-ef9876543210/certificates-of-compliance?obligationYear=2026'
      const { regulation43 } = loadDetailPage(
        (await inject(FUTUREPACK_UNSUBMITTED_URL)).payload
      )

      expect(regulation43.present).toBe(true)
      expect(regulation43.text).toBe('No data')
    })

    it('does not show the section for a direct producer', async () => {
      const { regulation43 } = loadDetailPage(
        (await inject(HOWCO_DETAIL_URL)).payload
      )

      expect(regulation43.present).toBe(false)
    })
  })

  describe('obligation tables render', () => {
    const met = { text: 'Met', colour: 'green' }
    const notMet = { text: 'Not met', colour: 'red' }
    const noData = { text: 'No data', colour: 'grey' }

    describe('fully-Met direct producer detail', () => {
      it('renders green Met tags on every material row and the totals row', async () => {
        const { materials } = loadDetailPage(
          (await inject(HOWCO_DETAIL_URL)).payload
        )

        for (const row of materials.rows) {
          expect(row.statusTag).toEqual(met)
        }
        expect(materials.totals.statusTag).toEqual(met)
      })

      it('renders green Met tags on every glass row and the totals row', async () => {
        const { glass } = loadDetailPage(
          (await inject(HOWCO_DETAIL_URL)).payload
        )

        for (const row of glass.rows) {
          expect(row.statusTag).toEqual(met)
        }
        expect(glass.totals.statusTag).toEqual(met)
      })
    })

    describe('mixed direct producer detail', () => {
      it('renders the correct 3-state tag per material row', async () => {
        const { materials } = loadDetailPage(
          (await inject(GREENFIELD_DETAIL_URL)).payload
        )
        const byName = Object.fromEntries(
          materials.rows.map((r) => [r.material, r.statusTag])
        )

        expect(byName.Aluminium).toEqual(met)
        expect(byName.Glass).toEqual(notMet)
        expect(byName.Plastic).toEqual(notMet)
        expect(byName.Wood).toEqual(noData)
      })

      it('renders 0 in the tonnage cells of the null-tonnage Wood row', async () => {
        const { materials } = loadDetailPage(
          (await inject(GREENFIELD_DETAIL_URL)).payload
        )
        const wood = materials.rows.find((r) => r.material === 'Wood')

        expect(wood.tonnages).toEqual({
          obligationToMeet: '80',
          awaitingAcceptance: '0',
          accepted: '0',
          outstanding: '0'
        })
      })

      it('renders a red Not met tag on the materials totals row', async () => {
        const { materials } = loadDetailPage(
          (await inject(GREENFIELD_DETAIL_URL)).payload
        )

        expect(materials.totals.statusTag).toEqual(notMet)
      })

      it('renders the correct 3-state tag per glass row', async () => {
        const { glass } = loadDetailPage(
          (await inject(GREENFIELD_DETAIL_URL)).payload
        )
        const byName = Object.fromEntries(
          glass.rows.map((r) => [r.material, r.statusTag])
        )

        expect(byName.GlassRemelt).toEqual(notMet)
        expect(byName.RemainingGlass).toEqual(noData)
      })

      it('renders 0 in the tonnage cells of the null-tonnage RemainingGlass row', async () => {
        const { glass } = loadDetailPage(
          (await inject(GREENFIELD_DETAIL_URL)).payload
        )
        const remainingGlass = glass.rows.find(
          (r) => r.material === 'RemainingGlass'
        )

        expect(remainingGlass.tonnages).toEqual({
          obligationToMeet: '220',
          awaitingAcceptance: '0',
          accepted: '0',
          outstanding: '0'
        })
      })
    })

    describe('fully-Met compliance scheme detail', () => {
      it('renders green Met tags on every material and glass row and both totals rows', async () => {
        const { materials, glass } = loadDetailPage(
          (await inject(ECOPACK_DETAIL_URL)).payload
        )

        for (const row of [...materials.rows, ...glass.rows]) {
          expect(row.statusTag).toEqual(met)
        }
        expect(materials.totals.statusTag).toEqual(met)
        expect(glass.totals.statusTag).toEqual(met)
      })
    })

    describe('mixed compliance scheme detail', () => {
      it('renders the correct 3-state tag per material row', async () => {
        const { materials } = loadDetailPage(
          (await inject(RIVERSIDE_DETAIL_URL)).payload
        )
        const byName = Object.fromEntries(
          materials.rows.map((r) => [r.material, r.statusTag])
        )

        expect(byName.Aluminium).toEqual(met)
        expect(byName.Glass).toEqual(notMet)
        expect(byName.Wood).toEqual(noData)
      })

      it('renders a red Not met tag on the materials totals row', async () => {
        const { materials } = loadDetailPage(
          (await inject(RIVERSIDE_DETAIL_URL)).payload
        )

        expect(materials.totals.statusTag).toEqual(notMet)
      })
    })

    describe('not-submitted direct producer detail', () => {
      it('renders a grey No data tag on every material and glass row and both totals rows', async () => {
        const { materials, glass } = loadDetailPage(
          (await inject(REDWOOD_UNSUBMITTED_URL)).payload
        )

        for (const row of [...materials.rows, ...glass.rows]) {
          expect(row.statusTag).toEqual(noData)
        }
        expect(materials.totals.statusTag).toEqual(noData)
        expect(glass.totals.statusTag).toEqual(noData)
      })

      it('hides submission-only summary rows and shows live recycling status', async () => {
        const { summaryRows } = loadDetailPage(
          (await inject(REDWOOD_UNSUBMITTED_URL)).payload
        )

        expect(summaryRows.submissionStatus.present).toBe(true)
        expect(summaryRows.submissionStatus.tag).toEqual({
          text: 'Not submitted',
          colour: 'grey'
        })
        expect(summaryRows.submittedOn.present).toBe(false)
        expect(summaryRows.nameOnAccount.present).toBe(false)
        expect(summaryRows.recyclingObligations.present).toBe(true)
        expect(summaryRows.recyclingObligations.tag).toEqual({
          text: 'Not met',
          colour: 'red'
        })
      })
    })

    describe('not-submitted compliance scheme detail', () => {
      it('hides submission-only summary rows', async () => {
        const { summaryRows } = loadDetailPage(
          (await inject(FUTUREPACK_UNSUBMITTED_URL)).payload
        )

        expect(summaryRows.submittedOn.present).toBe(false)
        expect(summaryRows.nameOnAccount.present).toBe(false)
        expect(summaryRows.submissionStatus.tag).toEqual({
          text: 'Not submitted',
          colour: 'grey'
        })
      })
    })

    describe('showObligations', () => {
      const sterlingUrl = `/f3b4c5d6-e7a8-9012-cdef-123456789abc/certificates-of-compliance?obligationYear=2026`
      const pinnacleUrl = `/a4b5c6d7-e8f9-0123-defa-234567890bcd/certificates-of-compliance?obligationYear=2026`

      it('shows the obligations table when the org has obligations', async () => {
        const { obligations } = loadDetailPage(
          (await inject(REDWOOD_UNSUBMITTED_URL)).payload
        )

        expect(obligations.tablePresent).toBe(true)
      })

      it('hides the obligations table and shows No data when obligations is null', async () => {
        const response = await inject(sterlingUrl)

        expect(response.statusCode).toBe(statusCodes.ok)
        const { obligations } = loadDetailPage(response.payload)
        expect(obligations.tablePresent).toBe(false)
        expect(obligations.noData).toBe(true)
      })

      it('hides the obligations table and shows No data when obligations is an empty array', async () => {
        const response = await inject(pinnacleUrl)

        expect(response.statusCode).toBe(statusCodes.ok)
        const { obligations } = loadDetailPage(response.payload)
        expect(obligations.tablePresent).toBe(false)
        expect(obligations.noData).toBe(true)
      })
    })
  })
})
