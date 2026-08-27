import { config } from '#config/config.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { loadDetailPage } from './detail/detail.page-object.js'
import { loadCsv } from './download/download.page-object.js'
import { sessionCookieFromResponse } from '#test-helpers/cookies.js'
import { setupRegulatorsApp } from '#test-helpers/msw/harness.js'
import { materialRow, noDataRow } from '#test-helpers/msw/obligations.js'

// Obligation data the material-table tests assert against, declared here so the
// per-material tonnages and statuses are visible next to the assertions.
const ALL_MATERIALS = [
  'Aluminium',
  'Glass',
  'PaperBoardFibre',
  'Plastic',
  'Steel',
  'Wood',
  'GlassRemelt',
  'RemainingGlass'
]
const allMetObligations = ALL_MATERIALS.map((material) =>
  materialRow(material, 100, 100)
)
const allNoDataObligations = ALL_MATERIALS.map((material) =>
  noDataRow(material, 100)
)
const mixedObligations = [
  materialRow('Aluminium', 215, 215, 'Met'),
  materialRow('Glass', 640, 500, 'NotMet'),
  materialRow('PaperBoardFibre', 870, 870, 'Met'),
  materialRow('Plastic', 1740, 1500, 'NotMet'),
  materialRow('Steel', 365, 365, 'Met'),
  noDataRow('Wood', 80),
  materialRow('GlassRemelt', 420, 380, 'NotMet'),
  noDataRow('RemainingGlass', 220)
]

const REGISTRATION_TYPE = {
  'direct-producers': 'DirectProducer',
  'compliance-schemes': 'ComplianceScheme'
}

describe('certificates of compliance — journey', () => {
  const app = setupRegulatorsApp()
  // A crumb minted without signing in, mirroring a real browser that loaded a
  // form (and its crumb) before its session lapsed.
  let anonCrumbCookie

  beforeAll(async () => {
    anonCrumbCookie = await app.anonCrumb()
  })

  // POST a form body with the crumb echoed back from the given cookie.
  const postForm = (url, cookie, payload = '') => app.post(url, payload, cookie)

  // Drive the two-step cancel flow: choose a reason, then confirm and send. The
  // reason travels in the form body, not the session.
  const cancelDeclaration = async (detailPath, cookie) => {
    await postForm(
      `${detailPath}/cancel/reason`,
      cookie,
      'cancel-reason=producer-request'
    )
    return postForm(
      `${detailPath}/cancel`,
      cookie,
      'cancel-reason=producer-request'
    )
  }

  describe('unauthenticated access', () => {
    let detailPath

    beforeEach(() => {
      detailPath = app
        .given([{ name: 'Halvern Producers Ltd', status: 'pending' }])
        .byName('Halvern Producers Ltd').detailPath
    })

    it('redirects the list page to /signin-oidc and stores returnTo', async () => {
      const listUrl =
        '/certificates-of-compliance?type=direct-producers&tab=pending'
      const response = await app.server.inject({ method: 'GET', url: listUrl })

      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe('/signin-oidc')
    })

    it('redirects the detail page to /signin-oidc and stores returnTo', async () => {
      const response = await app.server.inject({
        method: 'GET',
        url: detailPath
      })

      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe('/signin-oidc')
    })

    it('redirects back to the originally requested page after sign in', async () => {
      const listUrl =
        '/certificates-of-compliance?type=direct-producers&tab=pending'

      const unauthResponse = await app.server.inject({
        method: 'GET',
        url: listUrl
      })
      expect(unauthResponse.statusCode).toBe(302)
      const unauthCookie = sessionCookieFromResponse(unauthResponse)

      const signinResponse = await app.server.inject({
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
    let scenario

    beforeEach(() => {
      scenario = app.given([
        { name: 'Aldbury Producers Ltd', status: 'pending' },
        { name: 'Braemar Producers Ltd', status: 'pending' },
        { name: 'Cedar Producers Ltd', status: 'accepted' },
        { name: 'Dover Producers Ltd', status: 'not-submitted' },
        {
          name: 'Elgin Compliance Operators',
          type: 'compliance-scheme',
          status: 'not-submitted'
        }
      ])
    })

    it('list page renders items with links to detail pages', async () => {
      const response = await app.get(
        '/certificates-of-compliance?type=direct-producers&tab=pending'
      )

      expect(response.statusCode).toBe(statusCodes.ok)
      for (const item of scenario.rowsFor('DirectProducer', 'pending')) {
        expect(response.payload).toContain(item.organisationName)
        expect(response.payload).toContain(
          `./${item.organisationId}/certificates-of-compliance/${item.id}`
        )
      }
    })

    it('not-submitted list shows organisation name with a detail link including obligation year', async () => {
      const response = await app.get(
        '/certificates-of-compliance?type=direct-producers&tab=not-submitted'
      )

      expect(response.statusCode).toBe(statusCodes.ok)
      for (const item of scenario.rowsFor('DirectProducer', 'not-submitted')) {
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
      const response = await app.get(
        '/certificates-of-compliance?type=compliance-schemes&tab=not-submitted'
      )

      expect(response.statusCode).toBe(statusCodes.ok)
      for (const item of scenario.rowsFor(
        'ComplianceScheme',
        'not-submitted'
      )) {
        expect(response.payload).toContain(item.organisationReferenceNumber)
        expect(response.payload).toContain(item.organisationName)
      }
    })

    it('following a pending item link loads the detail page', async () => {
      const org = scenario.byName('Aldbury Producers Ltd')
      const listResponse = await app.get(
        '/certificates-of-compliance?type=direct-producers&tab=pending'
      )
      expect(listResponse.statusCode, 'Should return list page').toBe(
        statusCodes.ok
      )

      const match = listResponse.payload.match(
        new RegExp(
          `href="(\\.\\/[^"]+\\/certificates-of-compliance\\/${org.declarationId})"`
        )
      )
      expect(match, 'Should extract detail link').not.toBeNull()

      const detailPath = match[1].replace('./', '/')
      const detailResponse = await app.get(detailPath)

      expect(
        detailResponse.statusCode,
        'Should successfully call detail page'
      ).toBe(statusCodes.ok)
      const { heading } = loadDetailPage(detailResponse.payload)
      expect(heading, 'Should show organisation name on detail page').toContain(
        org.name
      )
    })

    it('following an accepted item link loads the detail page', async () => {
      const org = scenario.byName('Cedar Producers Ltd')
      const listResponse = await app.get(
        '/certificates-of-compliance?type=direct-producers&tab=accepted'
      )
      expect(listResponse.statusCode, 'Should return list page').toBe(
        statusCodes.ok
      )
      expect(
        listResponse.payload,
        'Should return list page with organisation name'
      ).toContain(org.name)

      const match = listResponse.payload.match(
        new RegExp(
          `href="(\\.\\/[^"]+\\/certificates-of-compliance\\/${org.declarationId})"`
        )
      )
      expect(match).not.toBeNull()

      const detailPath = match[1].replace('./', '/')
      const detailResponse = await app.get(detailPath)

      expect(
        detailResponse.statusCode,
        'Should successfully call detail page'
      ).toBe(statusCodes.ok)
      const { heading } = loadDetailPage(detailResponse.payload)
      expect(heading, 'Should show organisation name on detail page').toContain(
        org.name
      )
    })
  })

  describe('detail page actions', () => {
    let scenario

    beforeEach(() => {
      scenario = app.given([
        { name: 'Pending Producers Ltd', status: 'pending' },
        {
          name: 'Pending Compliance Operators',
          type: 'compliance-scheme',
          status: 'pending'
        },
        { name: 'Accepted Producers Ltd', status: 'accepted' },
        {
          name: 'Accepted Compliance Operators',
          type: 'compliance-scheme',
          status: 'accepted'
        },
        {
          name: 'Cancelled Producers Ltd',
          status: 'cancelled',
          listed: false
        },
        {
          name: 'Cancelled Compliance Operators',
          type: 'compliance-scheme',
          status: 'cancelled',
          listed: false
        }
      ])
    })

    it('shows Accept and Cancel certificate buttons for a pending direct producer', async () => {
      const org = scenario.byName('Pending Producers Ltd')
      const response = await app.get(org.detailPath)

      expect(response.statusCode).toBe(statusCodes.ok)
      const { actions } = loadDetailPage(response.payload)
      expect(actions.accept.text).toBe('Accept certificate')
      expect(actions.cancel.text).toBe('Cancel certificate')
    })

    it('shows Accept and Cancel statement buttons for a pending compliance scheme', async () => {
      const org = scenario.byName('Pending Compliance Operators')
      const response = await app.get(org.detailPath)

      expect(response.statusCode).toBe(statusCodes.ok)
      const { actions } = loadDetailPage(response.payload)
      expect(actions.accept.text).toBe('Accept statement')
      expect(actions.cancel.text).toBe('Cancel statement')
    })

    it('shows cancel only for an accepted direct producer', async () => {
      const org = scenario.byName('Accepted Producers Ltd')
      const response = await app.get(org.detailPath)

      expect(response.statusCode).toBe(statusCodes.ok)
      const { actions } = loadDetailPage(response.payload)
      expect(actions.accept).toBeNull()
      expect(actions.cancel.text).toBe('Cancel certificate')
      expect(actions.cancel.href).toBe(`${org.detailPath}/cancel/reason`)
    })

    it('shows cancel only for an accepted compliance scheme', async () => {
      const org = scenario.byName('Accepted Compliance Operators')
      const response = await app.get(org.detailPath)

      expect(response.statusCode).toBe(statusCodes.ok)
      const { actions } = loadDetailPage(response.payload)
      expect(actions.accept).toBeNull()
      expect(actions.cancel.text).toBe('Cancel statement')
      expect(actions.cancel.href).toBe(`${org.detailPath}/cancel/reason`)
    })

    it('shows no action buttons for a cancelled direct producer', async () => {
      const org = scenario.byName('Cancelled Producers Ltd')
      const response = await app.get(org.detailPath)

      expect(response.statusCode).toBe(statusCodes.ok)
      const { actions } = loadDetailPage(response.payload)
      expect(actions.accept).toBeNull()
      expect(actions.cancel).toBeNull()
    })

    it('shows no action buttons for a cancelled compliance scheme', async () => {
      const org = scenario.byName('Cancelled Compliance Operators')
      const response = await app.get(org.detailPath)

      expect(response.statusCode).toBe(statusCodes.ok)
      const { actions } = loadDetailPage(response.payload)
      expect(actions.accept).toBeNull()
      expect(actions.cancel).toBeNull()
    })

    it('cancel flow redirects to detail with cancelled banner styling', async () => {
      const org = scenario.byName('Pending Producers Ltd')
      const cancelResponse = await cancelDeclaration(
        org.detailPath,
        app.authCookie
      )

      expect(cancelResponse.statusCode).toBe(302)
      expect(cancelResponse.headers.location).toBe(org.detailPath)

      const detailResponse = await app.server.inject({
        method: 'GET',
        url: org.detailPath,
        headers: {
          cookie: app.nextCookie(cancelResponse, app.authCookie)
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
      // The cancelling regulator is the signed-in user resolved from the account API.
      expect(detailsPage.cancellation.cancelledBy).toBe('John Doe')
      expect(detailsPage.cancellation.reason).toBe(
        'Producer requested to cancel'
      )
    })

    it('compliance scheme cancel flow shows statement cancelled banner', async () => {
      const org = scenario.byName('Pending Compliance Operators')
      const cancelResponse = await cancelDeclaration(
        org.detailPath,
        app.authCookie
      )

      expect(cancelResponse.statusCode).toBe(302)

      const detailResponse = await app.server.inject({
        method: 'GET',
        url: org.detailPath,
        headers: {
          cookie: app.nextCookie(cancelResponse, app.authCookie)
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
    let org

    beforeEach(() => {
      org = app
        .given([{ name: 'Signin Producers Ltd', status: 'pending' }])
        .byName('Signin Producers Ltd')
    })

    it('cancel action redirects to /signin-oidc when no user is in session', async () => {
      const response = await postForm(
        `${org.detailPath}/cancel`,
        anonCrumbCookie
      )

      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe('/signin-oidc')
    })

    it('cancel action succeeds after sign-in populates user from account API', async () => {
      const cookie = await app.signIn()

      const cancelResponse = await cancelDeclaration(org.detailPath, cookie)

      expect(cancelResponse.statusCode).toBe(302)
      expect(cancelResponse.headers.location).toBe(org.detailPath)
    })

    it('full flow: unauthenticated action → sign-in with user from account API → action succeeds', async () => {
      const acceptUrl = `${org.detailPath}/accept`

      // Submit the confirmation unauthenticated (carrying a crumb, as a real
      // form would) — stored as returnTo and redirected to sign-in
      const unauthResponse = await postForm(
        acceptUrl,
        anonCrumbCookie,
        'confirm-accept=yes'
      )
      expect(unauthResponse.statusCode).toBe(302)
      expect(unauthResponse.headers.location).toBe('/signin-oidc')
      const afterUnauth = app.nextCookie(unauthResponse, anonCrumbCookie)

      // Sign in — account API populates user in session, redirects back to acceptUrl
      const signinResponse = await app.server.inject({
        method: 'GET',
        url: '/signin-oidc',
        headers: { cookie: afterUnauth }
      })
      expect(signinResponse.statusCode).toBe(302)
      expect(signinResponse.headers.location).toBe(acceptUrl)
      const signedInCookie = app.nextCookie(signinResponse, afterUnauth)

      // Retry with the signed-in session — approval succeeds
      const acceptResponse = await postForm(
        acceptUrl,
        signedInCookie,
        'confirm-accept=yes'
      )
      expect(acceptResponse.statusCode).toBe(302)
      expect(acceptResponse.headers.location).toBe(org.detailPath)
    })
  })

  describe('accept confirmation journey', () => {
    let producer
    let scheme

    beforeEach(() => {
      const scenario = app.given([
        { name: 'Confirm Producers Ltd', status: 'pending' },
        {
          name: 'Confirm Compliance Operators',
          type: 'compliance-scheme',
          status: 'pending'
        }
      ])
      producer = scenario.byName('Confirm Producers Ltd')
      scheme = scenario.byName('Confirm Compliance Operators')
    })

    const postAccept = (detailPath, choice, cookie) =>
      postForm(`${detailPath}/accept`, cookie, `confirm-accept=${choice}`)

    it('detail page Accept button links to the confirmation page', async () => {
      const response = await app.get(producer.detailPath)

      expect(response.statusCode).toBe(statusCodes.ok)
      const { actions } = loadDetailPage(response.payload)
      expect(actions.accept.href).toBe(`${producer.detailPath}/accept`)
    })

    it('GET on the confirmation page renders the Yes/No form', async () => {
      const response = await app.get(`${producer.detailPath}/accept`)

      expect(response.statusCode).toBe(statusCodes.ok)
      expect(response.payload).toContain(producer.name)
      expect(response.payload).toContain('confirm-accept')
    })

    it('"yes" runs the approve action and lands on detail with the accepted banner', async () => {
      const yesResponse = await postAccept(
        producer.detailPath,
        'yes',
        app.authCookie
      )
      expect(yesResponse.statusCode).toBe(302)
      expect(yesResponse.headers.location).toBe(producer.detailPath)

      const detailResponse = await app.server.inject({
        method: 'GET',
        url: producer.detailPath,
        headers: {
          cookie: app.nextCookie(yesResponse, app.authCookie)
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

    it('an approved certificate leaves the Pending tab and appears on Accepted', async () => {
      const yesResponse = await postAccept(
        producer.detailPath,
        'yes',
        app.authCookie
      )
      const cookie = app.nextCookie(yesResponse, app.authCookie)

      const pending = await app.server.inject({
        method: 'GET',
        url: '/certificates-of-compliance?type=direct-producers&tab=pending',
        headers: { cookie }
      })
      expect(pending.payload).not.toContain(producer.name)

      const accepted = await app.server.inject({
        method: 'GET',
        url: '/certificates-of-compliance?type=direct-producers&tab=accepted',
        headers: { cookie }
      })
      expect(accepted.payload).toContain(producer.name)
    })

    it('"no" returns to detail without invoking the approve action', async () => {
      const noResponse = await postAccept(
        producer.detailPath,
        'no',
        app.authCookie
      )
      expect(noResponse.statusCode).toBe(302)
      expect(noResponse.headers.location).toBe(producer.detailPath)

      const detailResponse = await app.server.inject({
        method: 'GET',
        url: producer.detailPath,
        headers: {
          cookie: app.nextCookie(noResponse, app.authCookie)
        }
      })
      expect(detailResponse.statusCode).toBe(statusCodes.ok)
      const { banner } = loadDetailPage(detailResponse.payload)
      expect(banner.present).toBe(false)
    })

    it('submitting without a choice re-renders the form with an error summary', async () => {
      const response = await postAccept(producer.detailPath, '', app.authCookie)

      expect(response.statusCode).toBe(statusCodes.ok)
      expect(response.payload).toContain('There is a problem')
      expect(response.payload).toContain('Select yes or no')
    })

    it('"yes" on a Compliance Scheme shows statement-accepted banner', async () => {
      const yesResponse = await postAccept(
        scheme.detailPath,
        'yes',
        app.authCookie
      )
      expect(yesResponse.statusCode).toBe(302)

      const detailResponse = await app.server.inject({
        method: 'GET',
        url: scheme.detailPath,
        headers: {
          cookie: app.nextCookie(yesResponse, app.authCookie)
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
      const freshCookie = await app.signIn()

      const acceptResponse = await postAccept(
        producer.detailPath,
        'yes',
        freshCookie
      )
      expect(acceptResponse.statusCode).toBe(302)

      let cookie = app.nextCookie(acceptResponse, freshCookie)
      const cancelResponse = await cancelDeclaration(
        producer.detailPath,
        cookie
      )
      expect(cancelResponse.statusCode).toBe(302)

      cookie = app.nextCookie(cancelResponse, cookie)
      const detailResponse = await app.server.inject({
        method: 'GET',
        url: producer.detailPath,
        headers: { cookie }
      })

      const { currentYear } = loadDetailPage(detailResponse.payload)
      const rowActions = currentYear.rows.map((row) => row.action)
      expect(rowActions).toContain('Accepted')
      expect(rowActions).toContain('Cancelled')
      expect(currentYear.rows.some((row) => row.by === 'John Doe')).toBe(true)
      expect(currentYear.rows.every((row) => row.viewSubmissionUrl)).toBe(true)
      expect(
        currentYear.rows.every(
          (row) => row.viewSubmissionUrl === producer.detailPath
        )
      ).toBe(true)

      const linkedResponse = await app.server.inject({
        method: 'GET',
        url: currentYear.rows[0].viewSubmissionUrl,
        headers: { cookie }
      })
      expect(linkedResponse.statusCode).toBe(200)
    })
  })

  describe('declaration section', () => {
    let scenario

    beforeEach(() => {
      scenario = app.given([
        { name: 'Pending Producers Ltd', status: 'pending' },
        {
          name: 'Pending Compliance Operators',
          type: 'compliance-scheme',
          status: 'pending'
        },
        { name: 'Accepted Producers Ltd', status: 'accepted' },
        { name: 'Unsubmitted Producers Ltd', status: 'not-submitted' },
        {
          name: 'Cancelled Producers Ltd',
          status: 'cancelled',
          listed: false,
          cancelledBy: 'James Walker',
          cancelledDate: '2026-03-10T09:15:00Z',
          cancelledReason: 'Submitted after the deadline.'
        },
        {
          name: 'Cancelled Compliance Operators',
          type: 'compliance-scheme',
          status: 'cancelled',
          listed: false,
          cancelledBy: 'James Walker',
          cancelledDate: '2026-03-08T11:30:00Z',
          cancelledReason: 'Incomplete member data submitted.'
        }
      ])
    })

    it('shows the declaration for a submitted (pending) direct producer', async () => {
      const org = scenario.byName('Pending Producers Ltd')
      const { declaration } = loadDetailPage(
        (await app.get(org.detailPath)).payload
      )

      expect(declaration.present).toBe(true)
      expect(declaration.documentNoun).toBe('certificate of compliance')
    })

    it('shows the declaration for a submitted (pending) compliance scheme with statement wording', async () => {
      const org = scenario.byName('Pending Compliance Operators')
      const { declaration } = loadDetailPage(
        (await app.get(org.detailPath)).payload
      )

      expect(declaration.present).toBe(true)
      expect(declaration.documentNoun).toBe('statement of compliance')
    })

    it('shows the declaration for an accepted direct producer', async () => {
      const org = scenario.byName('Accepted Producers Ltd')
      const { declaration } = loadDetailPage(
        (await app.get(org.detailPath)).payload
      )

      expect(declaration.present).toBe(true)
    })

    it('hides the declaration for an unsubmitted organisation', async () => {
      const org = scenario.byName('Unsubmitted Producers Ltd')
      const { declaration } = loadDetailPage(
        (await app.get(org.detailPath)).payload
      )

      expect(declaration.present).toBe(false)
    })

    it('shows the declaration for a cancelled direct producer', async () => {
      const org = scenario.byName('Cancelled Producers Ltd')
      const detailsPage = loadDetailPage(
        (await app.get(org.detailPath)).payload
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
      const org = scenario.byName('Cancelled Compliance Operators')
      const detailsPage = loadDetailPage(
        (await app.get(org.detailPath)).payload
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
    let scenario

    beforeEach(() => {
      scenario = app.given([
        { name: 'Pending Producers Ltd', status: 'pending' },
        {
          name: 'Pending Compliance Operators',
          type: 'compliance-scheme',
          status: 'pending'
        },
        { name: 'Unsubmitted Producers Ltd', status: 'not-submitted' },
        {
          name: 'Unsubmitted Compliance Operators',
          type: 'compliance-scheme',
          status: 'not-submitted'
        }
      ])
    })

    it('shows the submission message for a submitted direct producer', async () => {
      const org = scenario.byName('Pending Producers Ltd')
      const { insetText } = loadDetailPage(
        (await app.get(org.detailPath)).payload
      )

      expect(insetText).toContain(
        'The information on this certificate was correct at the time of submission.'
      )
    })

    it('shows the submission message for a submitted compliance scheme', async () => {
      const org = scenario.byName('Pending Compliance Operators')
      const { insetText } = loadDetailPage(
        (await app.get(org.detailPath)).payload
      )

      expect(insetText).toContain(
        'The information on this statement was correct at the time of submission.'
      )
    })

    it('shows the not-submitted certificate message for an unsubmitted direct producer', async () => {
      const org = scenario.byName('Unsubmitted Producers Ltd')
      const { insetText } = loadDetailPage(
        (await app.get(org.detailPath)).payload
      )

      expect(insetText).toContain(
        'This certificate is not submitted so the information will update if changed by the producer.'
      )
    })

    it('shows the not-submitted statement message for an unsubmitted compliance scheme', async () => {
      const org = scenario.byName('Unsubmitted Compliance Operators')
      const { insetText } = loadDetailPage(
        (await app.get(org.detailPath)).payload
      )

      expect(insetText).toContain(
        'This statement is not submitted so the information will update if changed by the compliance scheme.'
      )
    })
  })

  describe('not-submitted compliance scheme detail', () => {
    let scenario

    beforeEach(() => {
      scenario = app.given([
        {
          // The heading shows the operator name, not the scheme name, and the
          // nominated contact is the Approved Person, not the Basic User.
          name: 'FuturePack Operators',
          schemeName: 'FuturePack Compliance Scheme',
          type: 'compliance-scheme',
          status: 'not-submitted',
          persons: [
            {
              firstName: 'Sam',
              lastName: 'Reed',
              email: 'sam.reed@example.test',
              telephoneNumber: '020 7946 1111',
              serviceRole: 'Basic User'
            },
            {
              firstName: 'Nadia',
              lastName: 'Clarke',
              email: 'nadia.clarke@futurepack.test',
              telephoneNumber: '020 7946 0103',
              serviceRole: 'Approved Person'
            }
          ]
        },
        {
          name: 'Southgate Operators',
          type: 'compliance-scheme',
          status: 'not-submitted'
        }
      ])
    })

    it('headings show the scheme operator, not the compliance scheme name', async () => {
      const org = scenario.byName('FuturePack Operators')
      const payload = (await app.get(org.detailPath)).payload
      const { heading } = loadDetailPage(payload)

      expect(heading).toBe('FuturePack Operators')
      expect(payload).not.toContain('FuturePack Compliance Scheme')
    })

    it('shows the email address and phone number of the nominated contact', async () => {
      const org = scenario.byName('FuturePack Operators')
      const payload = (await app.get(org.detailPath)).payload
      const { summaryRows } = loadDetailPage(payload)

      expect(summaryRows.emailAddress.value).toBe(
        'nadia.clarke@futurepack.test'
      )
      expect(summaryRows.phoneNumber.value).toBe('020 7946 0103')
      expect(payload).not.toContain('sam.reed@example.test')
    })

    it('populates organisation type and company number for every scheme', async () => {
      for (const item of scenario.rowsFor(
        'ComplianceScheme',
        'not-submitted'
      )) {
        const { heading, summaryRows } = loadDetailPage(
          (
            await app.get(
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
      const org = scenario.byName('FuturePack Operators')
      const { summaryRows } = loadDetailPage(
        (await app.get(org.detailPath)).payload
      )

      expect(summaryRows.nameOnAccount.present).toBe(false)
    })
  })

  describe('Regulation 43 section', () => {
    let scenario

    beforeEach(() => {
      scenario = app.given([
        {
          name: 'EcoPack Group',
          type: 'compliance-scheme',
          status: 'pending',
          regulation43: false
        },
        {
          name: 'Nationwide Packaging Group',
          type: 'compliance-scheme',
          status: 'accepted',
          regulation43: true
        },
        {
          name: 'Unsubmitted Compliance Operators',
          type: 'compliance-scheme',
          status: 'not-submitted'
        },
        { name: 'Producer Ltd', status: 'pending' }
      ])
    })

    it('shows the not complied statement for a not compliant compliance scheme', async () => {
      const org = scenario.byName('EcoPack Group')
      const { regulation43 } = loadDetailPage(
        (await app.get(org.detailPath)).payload
      )

      expect(regulation43.present).toBe(true)
      expect(regulation43.text).toBe(
        'EcoPack Group declared they have not complied with all other requirements in regulation 43.'
      )
    })

    it('shows the complied statement for a compliant compliance scheme', async () => {
      const org = scenario.byName('Nationwide Packaging Group')
      const { regulation43 } = loadDetailPage(
        (await app.get(org.detailPath)).payload
      )

      expect(regulation43.present).toBe(true)
      expect(regulation43.text).toBe(
        'Nationwide Packaging Group declared they have complied with all other requirements in regulation 43.'
      )
    })

    it('shows a grey No data empty state for a compliance scheme with no submission', async () => {
      const org = scenario.byName('Unsubmitted Compliance Operators')
      const { regulation43 } = loadDetailPage(
        (await app.get(org.detailPath)).payload
      )

      expect(regulation43.present).toBe(true)
      expect(regulation43.text).toBe('No data')
    })

    it('does not show the section for a direct producer', async () => {
      const org = scenario.byName('Producer Ltd')
      const { regulation43 } = loadDetailPage(
        (await app.get(org.detailPath)).payload
      )

      expect(regulation43.present).toBe(false)
    })
  })

  describe('obligation tables render', () => {
    const met = { text: 'Met', colour: 'green' }
    const notMet = { text: 'Not met', colour: 'red' }
    const noData = { text: 'No data', colour: 'grey' }

    describe('fully-Met direct producer detail', () => {
      let org
      beforeEach(() => {
        org = app
          .given([
            {
              name: 'Fullymet Producers Ltd',
              status: 'pending',
              obligations: allMetObligations
            }
          ])
          .byName('Fullymet Producers Ltd')
      })

      it('renders green Met tags on every material row and the totals row', async () => {
        const { materials } = loadDetailPage(
          (await app.get(org.detailPath)).payload
        )

        for (const row of materials.rows) {
          expect(row.statusTag).toEqual(met)
        }
        expect(materials.totals.statusTag).toEqual(met)
      })

      it('renders green Met tags on every glass row and the totals row', async () => {
        const { glass } = loadDetailPage(
          (await app.get(org.detailPath)).payload
        )

        for (const row of glass.rows) {
          expect(row.statusTag).toEqual(met)
        }
        expect(glass.totals.statusTag).toEqual(met)
      })
    })

    describe('mixed direct producer detail', () => {
      let org
      beforeEach(() => {
        org = app
          .given([
            {
              name: 'Mixed Producers Ltd',
              status: 'pending',
              obligations: mixedObligations
            }
          ])
          .byName('Mixed Producers Ltd')
      })

      it('renders the correct 3-state tag per material row', async () => {
        const { materials } = loadDetailPage(
          (await app.get(org.detailPath)).payload
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
          (await app.get(org.detailPath)).payload
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
          (await app.get(org.detailPath)).payload
        )

        expect(materials.totals.statusTag).toEqual(notMet)
      })

      it('renders the correct 3-state tag per glass row', async () => {
        const { glass } = loadDetailPage(
          (await app.get(org.detailPath)).payload
        )
        const byName = Object.fromEntries(
          glass.rows.map((r) => [r.material, r.statusTag])
        )

        expect(byName.GlassRemelt).toEqual(notMet)
        expect(byName.RemainingGlass).toEqual(noData)
      })

      it('renders 0 in the tonnage cells of the null-tonnage RemainingGlass row', async () => {
        const { glass } = loadDetailPage(
          (await app.get(org.detailPath)).payload
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
      let org
      beforeEach(() => {
        org = app
          .given([
            {
              name: 'Fullymet Compliance Operators',
              type: 'compliance-scheme',
              status: 'pending',
              obligations: allMetObligations
            }
          ])
          .byName('Fullymet Compliance Operators')
      })

      it('renders green Met tags on every material and glass row and both totals rows', async () => {
        const { materials, glass } = loadDetailPage(
          (await app.get(org.detailPath)).payload
        )

        for (const row of [...materials.rows, ...glass.rows]) {
          expect(row.statusTag).toEqual(met)
        }
        expect(materials.totals.statusTag).toEqual(met)
        expect(glass.totals.statusTag).toEqual(met)
      })
    })

    describe('mixed compliance scheme detail', () => {
      let org
      beforeEach(() => {
        org = app
          .given([
            {
              name: 'Mixed Compliance Operators',
              type: 'compliance-scheme',
              status: 'accepted',
              obligations: mixedObligations
            }
          ])
          .byName('Mixed Compliance Operators')
      })

      it('renders the correct 3-state tag per material row', async () => {
        const { materials } = loadDetailPage(
          (await app.get(org.detailPath)).payload
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
          (await app.get(org.detailPath)).payload
        )

        expect(materials.totals.statusTag).toEqual(notMet)
      })
    })

    describe('not-submitted direct producer detail', () => {
      let org
      beforeEach(() => {
        org = app
          .given([
            {
              name: 'Nodata Producers Ltd',
              status: 'not-submitted',
              obligations: allNoDataObligations
            }
          ])
          .byName('Nodata Producers Ltd')
      })

      it('renders a grey No data tag on every material and glass row and both totals rows', async () => {
        const { materials, glass } = loadDetailPage(
          (await app.get(org.detailPath)).payload
        )

        for (const row of [...materials.rows, ...glass.rows]) {
          expect(row.statusTag).toEqual(noData)
        }
        expect(materials.totals.statusTag).toEqual(noData)
        expect(glass.totals.statusTag).toEqual(noData)
      })

      it('hides submission-only summary rows and shows live recycling status', async () => {
        const { summaryRows } = loadDetailPage(
          (await app.get(org.detailPath)).payload
        )

        expect(summaryRows.submissionStatus.present).toBe(true)
        expect(summaryRows.submissionStatus.tag).toEqual({
          text: 'Not submitted',
          colour: 'grey'
        })
        expect(summaryRows.submittedOn.present).toBe(false)
        expect(summaryRows.nameOnAccount.present).toBe(false)

        // All materials are NoDataYet, so the summary row reads "No data"
        expect(summaryRows.recyclingObligations.present).toBe(true)
        expect(summaryRows.recyclingObligations.value).toBe('No data')
        expect(summaryRows.recyclingObligations.tag).toBe(null)
      })
    })

    describe('not-submitted compliance scheme detail', () => {
      let org
      beforeEach(() => {
        org = app
          .given([
            {
              name: 'Nodata Compliance Operators',
              type: 'compliance-scheme',
              status: 'not-submitted',
              obligations: allNoDataObligations
            }
          ])
          .byName('Nodata Compliance Operators')
      })

      it('hides submission-only summary rows', async () => {
        const { summaryRows } = loadDetailPage(
          (await app.get(org.detailPath)).payload
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
      let withObligations
      let nullObligations
      let emptyObligations
      beforeEach(() => {
        const scenario = app.given([
          {
            name: 'Has Obligations Ltd',
            status: 'not-submitted',
            obligations: allNoDataObligations
          },
          {
            name: 'Null Obligations Ltd',
            status: 'not-submitted',
            obligations: null
          },
          {
            name: 'Empty Obligations Ltd',
            status: 'not-submitted',
            obligations: []
          }
        ])
        withObligations = scenario.byName('Has Obligations Ltd')
        nullObligations = scenario.byName('Null Obligations Ltd')
        emptyObligations = scenario.byName('Empty Obligations Ltd')
      })

      it('shows the obligations table when the org has obligations', async () => {
        const { obligations } = loadDetailPage(
          (await app.get(withObligations.detailPath)).payload
        )

        expect(obligations.tablePresent).toBe(true)
      })

      it('hides the obligations table and shows No data when obligations is null', async () => {
        const response = await app.get(nullObligations.detailPath)

        expect(response.statusCode).toBe(statusCodes.ok)
        const { obligations } = loadDetailPage(response.payload)
        expect(obligations.tablePresent).toBe(false)
        expect(obligations.noData).toBe(true)
      })

      it('hides the obligations table and shows No data when obligations is an empty array', async () => {
        const response = await app.get(emptyObligations.detailPath)

        expect(response.statusCode).toBe(statusCodes.ok)
        const { obligations } = loadDetailPage(response.payload)
        expect(obligations.tablePresent).toBe(false)
        expect(obligations.noData).toBe(true)
      })
    })
  })

  describe('CSV download', () => {
    const pendingDownloadUrl =
      '/certificates-of-compliance/download?organisation_type=direct-producers&submission_status=pending'
    let scenario

    beforeEach(() => {
      scenario = app.given([
        { name: 'CSV Producer One Ltd', status: 'pending' },
        { name: 'CSV Producer Two Ltd', status: 'pending' },
        { name: 'CSV Producer Three Ltd', status: 'accepted' },
        { name: 'CSV Producer Four Ltd', status: 'not-submitted' },
        { name: 'CSV Producer Five Ltd', status: 'not-submitted' },
        {
          name: 'CSV Scheme One Operators',
          type: 'compliance-scheme',
          status: 'pending'
        },
        {
          name: 'CSV Scheme Two Operators',
          type: 'compliance-scheme',
          status: 'accepted'
        },
        {
          name: 'CSV Scheme Three Operators',
          type: 'compliance-scheme',
          status: 'not-submitted'
        }
      ])
    })

    it('renders the download link on the list page pointing at download', async () => {
      const response = await app.get(
        '/certificates-of-compliance?type=direct-producers&tab=pending'
      )

      expect(response.statusCode).toBe(statusCodes.ok)
      expect(response.payload).toContain(
        '/certificates-of-compliance/download?organisation_type=direct-producers&submission_status=pending'
      )
      expect(response.payload).toContain('Download list (CSV)')
    })

    it('redirects to /signin-oidc when unauthenticated', async () => {
      const response = await app.server.inject({
        method: 'GET',
        url: pendingDownloadUrl
      })

      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe('/signin-oidc')
    })

    it('returns a bad request for an invalid organisation type', async () => {
      const response = await app.get(
        '/certificates-of-compliance/download?organisation_type=invalid&submission_status=pending'
      )
      expect(response.statusCode).toBe(statusCodes.badRequest)
    })

    it('returns a bad request for an invalid submission status', async () => {
      const response = await app.get(
        '/certificates-of-compliance/download?organisation_type=direct-producers&submission_status=invalid'
      )
      expect(response.statusCode).toBe(statusCodes.badRequest)
    })

    it('surfaces a downstream failure as an error response', async () => {
      config.set('mockErrorStatus', statusCodes.internalServerError)
      try {
        const response = await app.get(pendingDownloadUrl)
        expect(response.statusCode).toBe(statusCodes.internalServerError)
      } finally {
        config.set('mockErrorStatus', null)
      }
    })

    describe('generates CSV downloads for all combinations', () => {
      it.each([
        ['direct-producers', 'pending'],
        ['direct-producers', 'accepted'],
        ['direct-producers', 'not-submitted'],
        ['compliance-schemes', 'pending'],
        ['compliance-schemes', 'accepted'],
        ['compliance-schemes', 'not-submitted']
      ])('for %s %s', async (organisationType, submissionStatus) => {
        const expectedCount = scenario.rowsFor(
          REGISTRATION_TYPE[organisationType],
          submissionStatus
        ).length

        const response = await app.get(
          `/certificates-of-compliance/download?organisation_type=${organisationType}&submission_status=${submissionStatus}`
        )

        expect(response.statusCode).toBe(statusCodes.ok)
        expect(response.headers['content-type']).toContain('text/csv')
        expect(response.headers['content-disposition']).toMatch(
          new RegExp(
            `^attachment; filename="2026-(certificates|statements)-of-compliance-${submissionStatus}-\\d{4}-\\d{2}-\\d{2}-\\d{2}-\\d{2}-\\d{2}\\.csv"$`
          )
        )

        const { headers, rows, title } = loadCsv(response.payload)

        expect(rows).toHaveLength(expectedCount)

        // Title: "<Status> <noun> of compliance submissions, <weekday> <day>
        // <month> <year>, HH:MM:SS".
        if (submissionStatus === 'pending') {
          expect(title).toMatch(/^Pending /)
        } else if (submissionStatus === 'accepted') {
          expect(title).toMatch(/^Accepted /)
        } else {
          expect(title).toMatch(/^Not submitted /)
        }

        if (organisationType === 'compliance-schemes') {
          expect(title).toContain('statement of compliance submissions')
        } else {
          expect(title).toContain('certificate of compliance submissions')
        }

        expect(title).toMatch(/, \w+ \d{1,2} \w+ \d{4}, \d{2}:\d{2}:\d{2}$/)

        // Exact ordered header row.
        if (
          organisationType === 'compliance-schemes' &&
          submissionStatus === 'not-submitted'
        ) {
          expect(headers).toEqual([
            'Organisation name',
            'Organisation ID',
            'Recycling obligations',
            'Regulation 43'
          ])
        } else if (organisationType === 'compliance-schemes') {
          expect(headers).toEqual([
            'Organisation name',
            'Organisation ID',
            'Recycling obligations',
            'Regulation 43',
            'Date submitted'
          ])
        } else if (submissionStatus === 'not-submitted') {
          expect(headers).toEqual([
            'Organisation name',
            'Organisation ID',
            'Recycling obligations',
            'Percentage met'
          ])
        } else {
          expect(headers).toEqual([
            'Organisation name',
            'Organisation ID',
            'Recycling obligations',
            'Percentage met',
            'Date submitted'
          ])
        }
      })
    })
  })
})
