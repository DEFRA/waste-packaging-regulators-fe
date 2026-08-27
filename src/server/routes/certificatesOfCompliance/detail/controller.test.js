import { vi } from 'vitest'
import { createServer } from '#server/server.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { ApiError } from '#services/apiBaseClient/api-error.js'
import * as detailService from './detail.service.js'
import {
  mockComplianceSchemeDetailData,
  mockDetailData,
  MOCK_DECL_CS_PREV_ACCEPTED_ID,
  MOCK_DECL_CS_PREV_CANCELLED_ID,
  MOCK_DECL_HOWCO_PREV_ACCEPTED_ID,
  MOCK_DECL_HOWCO_PREV_CANCELLED_ID
} from '#test-helpers/mock-fixtures.js'
import { sessionCookieFromResponse } from '#test-helpers/cookies.js'
import { loadDetailPage } from './detail.page-object.js'

// Derive expected view model values from the raw API mock shape
const GLASS_BREAKDOWN_MATERIALS = new Set(['GlassRemelt', 'RemainingGlass'])
const expectedMaterials = mockDetailData.obligations.filter(
  (o) => !GLASS_BREAKDOWN_MATERIALS.has(o.material)
)
const expectedGlassBreakdown = mockDetailData.obligations.filter((o) =>
  GLASS_BREAKDOWN_MATERIALS.has(o.material)
)
const expectedMaterialTotalObligated = expectedMaterials.reduce(
  (sum, o) => sum + o.tonnages.obligated,
  0
)
const expectedMaterialTotalAccepted = expectedMaterials.reduce(
  (sum, o) => sum + o.tonnages.accepted,
  0
)

describe('#certificatesOfComplianceDetailController', () => {
  let server
  let sessionCookie

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
    const response = await server.inject({
      method: 'GET',
      url: '/signin-oidc'
    })
    sessionCookie = sessionCookieFromResponse(response)
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  const inject = (url) =>
    server.inject({ method: 'GET', url, headers: { cookie: sessionCookie } })

  it('should return a 200 status code', async () => {
    const response = await inject(
      '/497f6eca-6276-4993-bfeb-53cbbbba6f08/certificates-of-compliance/decl-101411'
    )
    expect(response.statusCode).toBe(statusCodes.ok)
  })

  it('should redirect to /signin-oidc when unauthenticated', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/497f6eca-6276-4993-bfeb-53cbbbba6f08/certificates-of-compliance/decl-101411'
    })
    expect(response.statusCode).toBe(302)
    expect(response.headers.location).toBe('/signin-oidc')
  })

  it.each([
    {
      description: '"Back to all submissions" as the backlink text',
      expected: 'Back to all submissions'
    },
    {
      description:
        'the compliance type label in the caption for a direct producer',
      expected: `${mockDetailData.obligationYear} certificate of compliance`
    },
    {
      description: 'the company name as the heading',
      expected: mockDetailData.organisation.name
    }
  ])('should render $description', async ({ expected }) => {
    const response = await inject(
      '/497f6eca-6276-4993-bfeb-53cbbbba6f08/certificates-of-compliance/decl-101411'
    )
    expect(response.payload).toContain(expected)
  })

  it('should render the compliance type label in the caption for a compliance scheme', async () => {
    const response = await inject(
      '/923fa611-571c-4948-ab7d-fbb75e75ed65/certificates-of-compliance/decl-cs-001'
    )
    expect(response.payload).toContain(
      `${mockComplianceSchemeDetailData.obligationYear} statement of compliance`
    )
  })

  it('should render the recycling obligations status', async () => {
    const response = await inject(
      '/b1e2c3d4-e5f6-7890-abcd-ef1234567890/certificates-of-compliance/decl-204872'
    )
    expect(response.payload).toContain('Not met')
  })

  it('should not render Regulation 43 for a direct producer', async () => {
    const response = await inject(
      '/497f6eca-6276-4993-bfeb-53cbbbba6f08/certificates-of-compliance/decl-101411'
    )
    expect(response.payload).not.toContain('Regulation 43')
  })

  it('should render a red Not compliant Regulation 43 tag for a pending compliance scheme', async () => {
    const response = await inject(
      '/923fa611-571c-4948-ab7d-fbb75e75ed65/certificates-of-compliance/decl-cs-001'
    )
    expect(response.payload).toContain('Regulation 43')
    expect(response.payload).toContain('Not compliant')
    expect(response.payload).toContain('govuk-tag--red')
  })

  it('should render a green Compliant Regulation 43 tag for an accepted compliance scheme', async () => {
    const response = await inject(
      '/e1d2c3b4-a596-4878-9abc-def012345678/certificates-of-compliance/decl-cs-101'
    )
    expect(response.payload).toContain('Regulation 43')
    expect(response.payload).toContain('Compliant')
    expect(response.payload).toContain('govuk-tag--green')
  })

  it('should render the not complied Regulation 43 statement for a not compliant compliance scheme', async () => {
    const response = await inject(
      '/923fa611-571c-4948-ab7d-fbb75e75ed65/certificates-of-compliance/decl-cs-001'
    )
    expect(response.payload).toContain(
      'EcoPack Group declared they have not complied with all other requirements in regulation 43.'
    )
  })

  it('should render the complied Regulation 43 statement for a compliant compliance scheme', async () => {
    const response = await inject(
      '/e1d2c3b4-a596-4878-9abc-def012345678/certificates-of-compliance/decl-cs-101'
    )
    expect(response.payload).toContain(
      'Nationwide Packaging Group declared they have complied with all other requirements in regulation 43.'
    )
  })

  it('should render the formatted date declaration was submitted', async () => {
    const response = await inject(
      '/497f6eca-6276-4993-bfeb-53cbbbba6f08/certificates-of-compliance/decl-101411'
    )
    expect(response.payload).toContain('31 January 2027 at 00:00')
  })

  it('should render the organisation type', async () => {
    const response = await inject(
      '/497f6eca-6276-4993-bfeb-53cbbbba6f08/certificates-of-compliance/decl-101411'
    )
    // DirectProducer maps to 'Direct producer'
    expect(response.payload).toContain('Direct producer')
  })

  it('should render the organisation ID', async () => {
    const response = await inject(
      '/497f6eca-6276-4993-bfeb-53cbbbba6f08/certificates-of-compliance/decl-101411'
    )
    expect(response.payload).toContain(
      mockDetailData.organisation.referenceNumber
    )
  })

  it('should render the Companies House link when a company number is present', async () => {
    const response = await inject(
      '/497f6eca-6276-4993-bfeb-53cbbbba6f08/certificates-of-compliance/decl-101411'
    )
    expect(response.payload).toContain('View on Companies House')
    expect(response.payload).toContain(
      `company/${mockDetailData.organisation.companiesHouseNumber}`
    )
  })

  it('should render the Companies House link for a compliance scheme declaration', async () => {
    const response = await inject(
      '/923fa611-571c-4948-ab7d-fbb75e75ed65/certificates-of-compliance/decl-cs-001'
    )
    expect(response.payload).toContain('View on Companies House')
    expect(response.payload).toContain('company/CS_GENERATED_0923795')
  })

  it('should not render the Companies House link when company number is No data', async () => {
    const response = await inject(
      '/e2f3a4b5-c6d7-8901-bcde-f23456789012/certificates-of-compliance?obligationYear=2026'
    )
    expect(response.payload).toContain('No data')
    expect(response.payload).not.toContain('View on Companies House')
  })

  it('should render the declaration signer name', async () => {
    const response = await inject(
      '/497f6eca-6276-4993-bfeb-53cbbbba6f08/certificates-of-compliance/decl-101411'
    )
    expect(response.payload).toContain(mockDetailData.submitterName)
  })

  it('should render all main material names in the recycling obligations table', async () => {
    const response = await inject(
      '/497f6eca-6276-4993-bfeb-53cbbbba6f08/certificates-of-compliance/decl-101411'
    )
    for (const obligation of expectedMaterials) {
      expect(response.payload).toContain(obligation.material)
    }
  })

  it('should render non-zero material obligation tonnages', async () => {
    const response = await inject(
      '/497f6eca-6276-4993-bfeb-53cbbbba6f08/certificates-of-compliance/decl-101411'
    )
    for (const obligation of expectedMaterials) {
      if (obligation.tonnages.obligated > 0) {
        expect(response.payload).toContain(
          String(obligation.tonnages.obligated)
        )
      }
    }
  })

  it('should render material totals row', async () => {
    const response = await inject(
      '/497f6eca-6276-4993-bfeb-53cbbbba6f08/certificates-of-compliance/decl-101411'
    )
    expect(response.payload).toContain(String(expectedMaterialTotalObligated))
    expect(response.payload).toContain(String(expectedMaterialTotalAccepted))
  })

  it('should render glass breakdown material names', async () => {
    const response = await inject(
      '/497f6eca-6276-4993-bfeb-53cbbbba6f08/certificates-of-compliance/decl-101411'
    )
    for (const obligation of expectedGlassBreakdown) {
      expect(response.payload).toContain(obligation.material)
    }
  })

  it('should render two Totals rows — one per table', async () => {
    const response = await inject(
      '/497f6eca-6276-4993-bfeb-53cbbbba6f08/certificates-of-compliance/decl-101411'
    )
    const occurrences = (response.payload.match(/Totals/g) ?? []).length
    expect(occurrences).toBeGreaterThanOrEqual(2)
  })

  it('should render action buttons for a pending certificate', async () => {
    const response = await inject(
      '/497f6eca-6276-4993-bfeb-53cbbbba6f08/certificates-of-compliance/decl-101411'
    )
    expect(response.payload).toContain('Accept certificate')
    expect(response.payload).toContain('Cancel certificate')
    // Both are links: Accept to the Yes/No confirmation page, Cancel to the
    // reason page that starts the cancellation flow.
    expect(response.payload).toContain(
      'href="/497f6eca-6276-4993-bfeb-53cbbbba6f08/certificates-of-compliance/decl-101411/accept"'
    )
    expect(response.payload).toContain(
      'href="/497f6eca-6276-4993-bfeb-53cbbbba6f08/certificates-of-compliance/decl-101411/cancel/reason"'
    )
  })

  it('should render cancel only for an accepted certificate', async () => {
    const response = await inject(
      '/a1b2c3d4-e5f6-7890-abcd-ef1234567890/certificates-of-compliance/decl-309145'
    )
    expect(response.payload).not.toContain('Accept certificate')
    expect(response.payload).toContain('Cancel certificate')
    expect(response.payload).toContain(
      'href="/a1b2c3d4-e5f6-7890-abcd-ef1234567890/certificates-of-compliance/decl-309145/cancel/reason"'
    )
  })

  describe('Submission status label', () => {
    it('renders the Submission status label for a submitted declaration', async () => {
      const response = await inject(
        '/497f6eca-6276-4993-bfeb-53cbbbba6f08/certificates-of-compliance/decl-101411'
      )
      expect(response.payload).toContain('Submission status')
    })

    it('renders a blue Pending tag for a submitted (pending review) declaration', async () => {
      const response = await inject(
        '/497f6eca-6276-4993-bfeb-53cbbbba6f08/certificates-of-compliance/decl-101411'
      )
      expect(response.payload).toContain('govuk-tag--blue')
      expect(response.payload).toContain('Pending')
    })

    it('renders a teal Accepted tag for an accepted declaration', async () => {
      const response = await inject(
        '/a1b2c3d4-e5f6-7890-abcd-ef1234567890/certificates-of-compliance/decl-309145'
      )
      expect(response.payload).toContain('govuk-tag--teal')
      expect(response.payload).toContain('Accepted')
    })

    it('renders a grey Not submitted tag for an unsubmitted organisation', async () => {
      const response = await inject(
        '/e2f3a4b5-c6d7-8901-bcde-f23456789012/certificates-of-compliance?obligationYear=2026'
      )
      expect(response.payload).toContain('govuk-tag--grey')
      expect(response.payload).toContain('Not submitted')
    })

    it('renders the Submission status label for an unsubmitted organisation', async () => {
      const response = await inject(
        '/e2f3a4b5-c6d7-8901-bcde-f23456789012/certificates-of-compliance?obligationYear=2026'
      )
      expect(response.payload).toContain('Submission status')
    })

    it('does not render Submitted on or Name on account for an unsubmitted organisation', async () => {
      const { summaryRows } = loadDetailPage(
        (
          await inject(
            '/e2f3a4b5-c6d7-8901-bcde-f23456789012/certificates-of-compliance?obligationYear=2026'
          )
        ).payload
      )

      expect(summaryRows.submittedOn.present).toBe(false)
      expect(summaryRows.nameOnAccount.present).toBe(false)
    })

    it('renders Submitted on and Name on account for a submitted declaration', async () => {
      const { summaryRows } = loadDetailPage(
        (
          await inject(
            '/a1b2c3d4-e5f6-7890-abcd-ef1234567890/certificates-of-compliance/decl-309145'
          )
        ).payload
      )

      expect(summaryRows.submittedOn.present).toBe(true)
      expect(summaryRows.nameOnAccount.present).toBe(true)
    })
  })

  describe('Accepted outcome summary', () => {
    it('renders submission status, accepted by, and accepted date for an accepted direct producer', async () => {
      const response = await inject(
        '/a1b2c3d4-e5f6-7890-abcd-ef1234567890/certificates-of-compliance/decl-309145'
      )

      expect(response.payload).toContain('Submission status')
      expect(response.payload).toContain('Accepted by')
      expect(response.payload).toContain('Accepted date')
      expect(response.payload).toContain('James Walker')
      expect(response.payload).toContain('15 January 2027 at 14:30')
    })

    it('renders submission status for an accepted compliance scheme', async () => {
      const response = await inject(
        '/e1d2c3b4-a596-4878-9abc-def012345678/certificates-of-compliance/decl-cs-101'
      )

      expect(response.payload).toContain('Submission status')
      expect(response.payload).toContain('Accepted by')
      expect(response.payload).toContain('James Walker')
      expect(response.payload).toContain('12 January 2027 at 12:05')
    })
  })

  describe('Current year history', () => {
    const acceptedOnlyUrl =
      '/b0b1b2b3-b4b5-b6b7-b8b9-babbbcbdbebf/certificates-of-compliance/decl-accepted-only'
    const cancelledOnlyUrl =
      '/c0c1c2c3-c4c5-c6c7-c8c9-cacbcccdcecf/certificates-of-compliance/decl-cancelled-only'
    const bothUrl =
      '/497f6eca-6276-4993-bfeb-53cbbbba6f08/certificates-of-compliance/decl-101411'
    const csBothUrl =
      '/923fa611-571c-4948-ab7d-fbb75e75ed65/certificates-of-compliance/decl-cs-001'
    const howcoOrgId = '497f6eca-6276-4993-bfeb-53cbbbba6f08'
    const ecopackOrgId = '923fa611-571c-4948-ab7d-fbb75e75ed65'
    const emptyUrl =
      '/b1e2c3d4-e5f6-7890-abcd-ef1234567890/certificates-of-compliance/decl-204872'

    it('renders the Current year heading', async () => {
      const response = await inject(bothUrl)
      expect(response.payload).toContain('Current year')
    })

    it('renders the empty-state message when there are no prior submissions', async () => {
      const response = await inject(emptyUrl)
      expect(response.payload).toContain('No previous submissions')
    })

    it('renders the accepted declaration in current year when there is no separate history', async () => {
      const response = await inject(
        '/a1b2c3d4-e5f6-7890-abcd-ef1234567890/certificates-of-compliance/decl-309145'
      )
      expect(response.payload).toContain('15 January 2027 at 14:30')
      expect(response.payload).toContain('James Walker')
      expect(response.payload).not.toContain('No previous submissions')
    })

    it('renders an Accepted-only page with the blue tag, regulator name, and empty reason', async () => {
      const response = await inject(acceptedOnlyUrl)
      expect(response.payload).toContain('15 April 2026 at 11:20')
      expect(response.payload).toContain('govuk-tag govuk-tag--blue')
      expect(response.payload).toContain('James Walker')
      expect(response.payload).not.toContain('Not applicable')
    })

    it('renders a Cancelled-only page with the grey tag, submitter, and the audit reason', async () => {
      const response = await inject(cancelledOnlyUrl)
      expect(response.payload).toContain('8 April 2026 at 10:00')
      expect(response.payload).toContain('govuk-tag govuk-tag--grey')
      expect(response.payload).toContain('Test Submitter C')
      expect(response.payload).toContain('Information could not be verified')
    })

    it('renders both Accepted and Cancelled rows when the org has both', async () => {
      const response = await inject(bothUrl)
      expect(response.payload).toContain('13 February 2026 at 09:42')
      expect(response.payload).toContain('22 May 2026 at 14:18')
    })

    it('renders rows in the order returned by the API (newest first)', async () => {
      const response = await inject(bothUrl)
      const cancelledIdx = response.payload.indexOf('22 May 2026 at 14:18')
      const acceptedIdx = response.payload.indexOf('13 February 2026 at 09:42')
      expect(cancelledIdx).toBeGreaterThan(-1)
      expect(acceptedIdx).toBeGreaterThan(-1)
      expect(cancelledIdx).toBeLessThan(acceptedIdx)
    })

    it('renders a View submission link on each current year row', async () => {
      const response = await inject(bothUrl)
      const { currentYear } = loadDetailPage(response.payload)

      expect(currentYear.rows).toHaveLength(2)
      for (const row of currentYear.rows) {
        expect(row.viewSubmissionUrl).toBeTruthy()
      }
    })

    it('links each current year row to the declaration that action was taken on', async () => {
      const response = await inject(bothUrl)
      const { currentYear } = loadDetailPage(response.payload)

      expect(currentYear.rows[0].viewSubmissionUrl).toBe(
        `/${howcoOrgId}/certificates-of-compliance/${MOCK_DECL_HOWCO_PREV_CANCELLED_ID}`
      )
      expect(currentYear.rows[1].viewSubmissionUrl).toBe(
        `/${howcoOrgId}/certificates-of-compliance/${MOCK_DECL_HOWCO_PREV_ACCEPTED_ID}`
      )
    })

    it('links compliance scheme current year rows to prior accepted and cancelled declarations', async () => {
      const response = await inject(csBothUrl)
      const { currentYear } = loadDetailPage(response.payload)

      expect(currentYear.rows).toHaveLength(2)
      expect(currentYear.rows[0].viewSubmissionUrl).toBe(
        `/${ecopackOrgId}/certificates-of-compliance/${MOCK_DECL_CS_PREV_CANCELLED_ID}`
      )
      expect(currentYear.rows[1].viewSubmissionUrl).toBe(
        `/${ecopackOrgId}/certificates-of-compliance/${MOCK_DECL_CS_PREV_ACCEPTED_ID}`
      )
    })

    it('loads the accepted submission when following a current year View submission link', async () => {
      const listResponse = await inject(bothUrl)
      const { currentYear } = loadDetailPage(listResponse.payload)
      const acceptedLink = currentYear.rows.find(
        (row) => row.action === 'Accepted'
      )?.viewSubmissionUrl

      const detailResponse = await inject(acceptedLink)
      const acceptedPage = loadDetailPage(detailResponse.payload)

      expect(detailResponse.statusCode).toBe(statusCodes.ok)
      expect(acceptedPage.summaryRows.submissionStatus?.tag?.text).toBe(
        'Accepted'
      )
    })

    it('loads the cancelled submission when following a current year View submission link', async () => {
      const listResponse = await inject(bothUrl)
      const { currentYear } = loadDetailPage(listResponse.payload)
      const cancelledLink = currentYear.rows.find(
        (row) => row.action === 'Cancelled'
      )?.viewSubmissionUrl

      const detailResponse = await inject(cancelledLink)
      const cancelledPage = loadDetailPage(detailResponse.payload)

      expect(detailResponse.statusCode).toBe(statusCodes.ok)
      expect(cancelledPage.summaryRows.submissionStatus?.tag?.text).toBe(
        'Cancelled'
      )
    })

    it('links an Accepted-only current year row to that accepted submission', async () => {
      const response = await inject(acceptedOnlyUrl)
      const { currentYear } = loadDetailPage(response.payload)

      expect(currentYear.rows).toHaveLength(1)
      expect(currentYear.rows[0].viewSubmissionUrl).toBe(
        '/b0b1b2b3-b4b5-b6b7-b8b9-babbbcbdbebf/certificates-of-compliance/decl-accepted-only'
      )
    })

    it('links a Cancelled-only current year row to that cancelled submission', async () => {
      const response = await inject(cancelledOnlyUrl)
      const { currentYear } = loadDetailPage(response.payload)

      expect(currentYear.rows).toHaveLength(1)
      expect(currentYear.rows[0].viewSubmissionUrl).toBe(
        '/c0c1c2c3-c4c5-c6c7-c8c9-cacbcccdcecf/certificates-of-compliance/decl-cancelled-only'
      )
    })

    it('does not render View submission links when the current year table is empty', async () => {
      const response = await inject(emptyUrl)
      expect(response.payload).not.toContain('View submission')
    })
  })

  it('should render an error page when the obligations API returns 500', async () => {
    vi.spyOn(
      detailService,
      'getCertificateOfComplianceDetailViewModel'
    ).mockRejectedValueOnce(
      ApiError.from({
        message: 'waste-obligations API request failed with status 500',
        status: 500,
        serviceName: 'waste-obligations'
      })
    )

    const response = await inject(
      '/497f6eca-6276-4993-bfeb-53cbbbba6f08/certificates-of-compliance/decl-101411'
    )

    expect(response.statusCode).toBe(statusCodes.internalServerError)
    expect(response.payload).toContain(
      'Sorry, there is a problem with the service'
    )
    vi.restoreAllMocks()
  })
})
