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

const HOWCO_DETAIL_URL =
  '/497f6eca-6276-4993-bfeb-53cbbbba6f08/certificates-of-compliance/decl-101411'
const GREENFIELD_DETAIL_URL =
  '/b1e2c3d4-e5f6-7890-abcd-ef1234567890/certificates-of-compliance/decl-204872'
const ECOPACK_DETAIL_URL =
  '/923fa611-571c-4948-ab7d-fbb75e75ed65/certificates-of-compliance/decl-cs-001'
const GREENCIRCLE_DETAIL_URL =
  '/f3a2b1c0-d9e8-47f6-a5b4-c3d2e1f0a9b8/certificates-of-compliance/decl-cs-002'
const REDWOOD_UNSUBMITTED_URL =
  '/d1e2f3a4-b5c6-7890-abcd-ef1234567890/certificates-of-compliance?obligationYear=2026'

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

  describe('sign-in populates user in session for certificate actions', () => {
    it('approve action redirects to /signin-oidc when no user is in session', async () => {
      const item = mockPendingItems[0]
      const response = await server.inject({
        method: 'POST',
        url: `${detailPathFor(item)}/approve`
      })

      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe('/signin-oidc')
    })

    it('cancel action redirects to /signin-oidc when no user is in session', async () => {
      const item = mockPendingItems[0]
      const response = await server.inject({
        method: 'POST',
        url: `${detailPathFor(item)}/cancel`
      })

      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe('/signin-oidc')
    })

    it('approve action succeeds after sign-in populates user from account API', async () => {
      const signinResponse = await server.inject({
        method: 'GET',
        url: '/signin-oidc'
      })
      const cookie = signinResponse.headers['set-cookie']?.[0]?.split(';')[0]

      const item = mockPendingItems[0]
      const approveResponse = await server.inject({
        method: 'POST',
        url: `${detailPathFor(item)}/approve`,
        headers: { cookie }
      })

      expect(approveResponse.statusCode).toBe(302)
      expect(approveResponse.headers.location).toBe(detailPathFor(item))
    })

    it('cancel action succeeds after sign-in populates user from account API', async () => {
      const signinResponse = await server.inject({
        method: 'GET',
        url: '/signin-oidc'
      })
      const cookie = signinResponse.headers['set-cookie']?.[0]?.split(';')[0]

      const item = mockPendingItems[0]
      const cancelResponse = await server.inject({
        method: 'POST',
        url: `${detailPathFor(item)}/cancel`,
        headers: { cookie }
      })

      expect(cancelResponse.statusCode).toBe(302)
      expect(cancelResponse.headers.location).toBe(detailPathFor(item))
    })

    it('full flow: unauthenticated action → sign-in with user from account API → action succeeds', async () => {
      const item = mockPendingItems[0]
      const approveUrl = `${detailPathFor(item)}/approve`

      // Attempt action unauthenticated — stored as returnTo and redirected to sign-in
      const unauthResponse = await server.inject({
        method: 'POST',
        url: approveUrl
      })
      expect(unauthResponse.statusCode).toBe(302)
      expect(unauthResponse.headers.location).toBe('/signin-oidc')
      const unauthCookie =
        unauthResponse.headers['set-cookie']?.[0]?.split(';')[0]

      // Sign in — account API populates user in session, redirects back to approveUrl
      const signinResponse = await server.inject({
        method: 'GET',
        url: '/signin-oidc',
        headers: { cookie: unauthCookie }
      })
      expect(signinResponse.statusCode).toBe(302)
      expect(signinResponse.headers.location).toBe(approveUrl)
      const signedInCookie = mergeCookiesFromResponse(
        unauthCookie,
        signinResponse
      )

      // Retry the action with the signed-in session — should succeed
      const approveResponse = await server.inject({
        method: 'POST',
        url: approveUrl,
        headers: { cookie: signedInCookie }
      })
      expect(approveResponse.statusCode).toBe(302)
      expect(approveResponse.headers.location).toBe(detailPathFor(item))
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
      const { declaration } = loadDetailPage(
        (
          await inject(
            detailPathForDetailData(mockDirectProducerCancelledDetailData)
          )
        ).payload
      )

      expect(declaration.present).toBe(true)
      expect(declaration.documentNoun).toBe('certificate of compliance')
    })

    it('shows the declaration for a cancelled compliance scheme', async () => {
      const { declaration } = loadDetailPage(
        (
          await inject(
            detailPathForDetailData(mockComplianceSchemeCancelledDetailData)
          )
        ).payload
      )

      expect(declaration.present).toBe(true)
      expect(declaration.documentNoun).toBe('statement of compliance')
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
        'EcoPack Compliance Ltd declared they have not complied with all other requirements in regulation 43.'
      )
    })

    it('shows the complied statement for a compliant compliance scheme', async () => {
      const { regulation43 } = loadDetailPage(
        (await inject(ECOPACK_COMPLIANT_URL)).payload
      )

      expect(regulation43.present).toBe(true)
      expect(regulation43.text).toBe(
        'Nationwide Packaging Scheme declared they have complied with all other requirements in regulation 43.'
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
          (await inject(GREENCIRCLE_DETAIL_URL)).payload
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
          (await inject(GREENCIRCLE_DETAIL_URL)).payload
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
