import { vi } from 'vitest'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { ApiError } from '#services/apiBaseClient/api-error.js'
import * as detailService from './detail.service.js'
import { loadDetailPage } from './detail.page-object.js'
import { setupRegulatorsApp } from '#test-helpers/msw/harness.js'
import { materialRow } from '#test-helpers/msw/obligations.js'

// The organisations every assertion below traces back to are declared once in
// the shared world, so the input that produces each asserted value is visible
// here rather than in a per-scenario fixture.
const GLASS_BREAKDOWN_MATERIALS = new Set(['GlassRemelt', 'RemainingGlass'])

// A fully-met set of obligations with varied tonnages, so the material and totals assertions
// are distinctive and trace back to these numbers.
const metObligations = [
  materialRow('Aluminium', 215, 215),
  materialRow('Glass', 640, 640),
  materialRow('PaperBoardFibre', 870, 870),
  materialRow('Plastic', 1740, 1740),
  materialRow('Steel', 365, 365),
  materialRow('Wood', 80, 80),
  materialRow('GlassRemelt', 420, 420),
  materialRow('RemainingGlass', 220, 220)
]
const metMaterials = metObligations.filter(
  (o) => !GLASS_BREAKDOWN_MATERIALS.has(o.material)
)
const metGlassBreakdown = metObligations.filter((o) =>
  GLASS_BREAKDOWN_MATERIALS.has(o.material)
)
const metTotalObligated = metMaterials.reduce(
  (sum, o) => sum + o.tonnages.obligated,
  0
)
const metTotalAccepted = metMaterials.reduce(
  (sum, o) => sum + o.tonnages.accepted,
  0
)

const mixedObligations = [
  materialRow('Aluminium', 215, 215, 'Met'),
  materialRow('Plastic', 1740, 1500, 'NotMet')
]

const PENDING_DP_NAME = 'Marlow Packaging Ltd'

describe('#certificatesOfComplianceDetailController', () => {
  const app = setupRegulatorsApp()

  let pendingDp
  let mixedDp
  let pendingCs
  let acceptedDp
  let acceptedCs
  let notSubmitted
  let acceptedOnly
  let cancelledOnly
  let emptyHistoryDp

  // A fresh world each test, so an action in one test never leaks into the next.
  beforeEach(() => {
    const scenario = app.given([
      {
        name: PENDING_DP_NAME,
        reference: '551234',
        companiesHouseNumber: '12345678',
        status: 'pending',
        obligations: metObligations,
        submitter: 'Dana Fielding',
        dateSubmitted: '2027-01-31',
        history: [
          {
            status: 'accepted',
            at: '2026-02-13T09:42:00Z',
            by: 'Alex Prior'
          },
          {
            status: 'cancelled',
            at: '2026-05-22T14:18:00Z',
            by: 'Alex Prior',
            reason: 'Submitted late'
          }
        ]
      },
      {
        name: 'Halden Producers Ltd',
        status: 'pending',
        obligations: mixedObligations
      },
      {
        name: 'EcoPack Group',
        type: 'compliance-scheme',
        companiesHouseNumber: 'CS_GENERATED_0923795',
        status: 'pending',
        regulation43: false,
        history: [
          {
            status: 'accepted',
            at: '2026-03-04T11:05:00Z',
            by: 'Alex Prior'
          },
          {
            status: 'cancelled',
            at: '2026-05-12T13:30:00Z',
            by: 'Alex Prior',
            reason: 'Discrepancy'
          }
        ]
      },
      {
        name: 'Oakfield Producers Ltd',
        reference: '552030',
        status: 'accepted',
        acceptedBy: 'James Walker',
        acceptedDate: '2027-01-15T14:30:00Z'
      },
      {
        name: 'Nationwide Packaging Group',
        type: 'compliance-scheme',
        status: 'accepted',
        regulation43: true,
        acceptedBy: 'James Walker',
        acceptedDate: '2027-01-12T12:05:00Z'
      },
      {
        name: 'Seaford Producers Ltd',
        reference: '670001',
        status: 'not-submitted',
        companiesHouseNumber: null
      },
      {
        name: 'Hillcrest Producers Ltd',
        status: 'accepted',
        listed: false,
        submitted: false,
        acceptedBy: 'James Walker',
        acceptedDate: '2026-04-15T11:20:00Z'
      },
      {
        name: 'Brookvale Producers Ltd',
        status: 'cancelled',
        listed: false,
        submitter: 'Test Submitter C',
        cancelledBy: 'James Walker',
        cancelledDate: '2026-04-08T10:00:00Z',
        cancelledReason: 'Information could not be verified'
      },
      { name: 'Lone Producers Ltd', status: 'pending' }
    ])

    pendingDp = scenario.byName(PENDING_DP_NAME)
    mixedDp = scenario.byName('Halden Producers Ltd')
    pendingCs = scenario.byName('EcoPack Group')
    acceptedDp = scenario.byName('Oakfield Producers Ltd')
    acceptedCs = scenario.byName('Nationwide Packaging Group')
    notSubmitted = scenario.byName('Seaford Producers Ltd')
    acceptedOnly = scenario.byName('Hillcrest Producers Ltd')
    cancelledOnly = scenario.byName('Brookvale Producers Ltd')
    emptyHistoryDp = scenario.byName('Lone Producers Ltd')
  })

  it('should return a 200 status code', async () => {
    const response = await app.get(pendingDp.detailPath)
    expect(response.statusCode).toBe(statusCodes.ok)
  })

  it('should redirect to /signin-oidc when unauthenticated', async () => {
    const response = await app.server.inject({
      method: 'GET',
      url: pendingDp.detailPath
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
      expected: '2026 certificate of compliance'
    },
    {
      description: 'the company name as the heading',
      expected: PENDING_DP_NAME
    }
  ])('should render $description', async ({ expected }) => {
    const response = await app.get(pendingDp.detailPath)
    expect(response.payload).toContain(expected)
  })

  it('should render the compliance type label in the caption for a compliance scheme', async () => {
    const response = await app.get(pendingCs.detailPath)
    expect(response.payload).toContain('2026 statement of compliance')
  })

  it('should render the recycling obligations status', async () => {
    const response = await app.get(mixedDp.detailPath)
    expect(response.payload).toContain('Not met')
  })

  it('should not render Regulation 43 for a direct producer', async () => {
    const response = await app.get(pendingDp.detailPath)
    expect(response.payload).not.toContain('Regulation 43')
  })

  it('should render a red Not compliant Regulation 43 tag for a pending compliance scheme', async () => {
    const response = await app.get(pendingCs.detailPath)
    expect(response.payload).toContain('Regulation 43')
    expect(response.payload).toContain('Not compliant')
    expect(response.payload).toContain('govuk-tag--red')
  })

  it('should render a green Compliant Regulation 43 tag for an accepted compliance scheme', async () => {
    const response = await app.get(acceptedCs.detailPath)
    expect(response.payload).toContain('Regulation 43')
    expect(response.payload).toContain('Compliant')
    expect(response.payload).toContain('govuk-tag--green')
  })

  it('should render the not complied Regulation 43 statement for a not compliant compliance scheme', async () => {
    const response = await app.get(pendingCs.detailPath)
    expect(response.payload).toContain(
      'EcoPack Group declared they have not complied with all other requirements in regulation 43.'
    )
  })

  it('should render the complied Regulation 43 statement for a compliant compliance scheme', async () => {
    const response = await app.get(acceptedCs.detailPath)
    expect(response.payload).toContain(
      'Nationwide Packaging Group declared they have complied with all other requirements in regulation 43.'
    )
  })

  it('should render the formatted date declaration was submitted', async () => {
    const response = await app.get(pendingDp.detailPath)
    expect(response.payload).toContain('31 January 2027 at 00:00')
  })

  it('should render the organisation type', async () => {
    const response = await app.get(pendingDp.detailPath)
    expect(response.payload).toContain('Direct producer')
  })

  it('should render the organisation ID', async () => {
    const response = await app.get(pendingDp.detailPath)
    expect(response.payload).toContain(pendingDp.reference)
  })

  it('should render the Companies House link when a company number is present', async () => {
    const response = await app.get(pendingDp.detailPath)
    expect(response.payload).toContain('View on Companies House')
    expect(response.payload).toContain('company/12345678')
  })

  it('should render the Companies House link for a compliance scheme declaration', async () => {
    const response = await app.get(pendingCs.detailPath)
    expect(response.payload).toContain('View on Companies House')
    expect(response.payload).toContain('company/CS_GENERATED_0923795')
  })

  it('should not render the Companies House link when company number is No data', async () => {
    const response = await app.get(notSubmitted.detailPath)
    expect(response.payload).toContain('No data')
    expect(response.payload).not.toContain('View on Companies House')
  })

  it('should render the declaration signer name', async () => {
    const response = await app.get(pendingDp.detailPath)
    expect(response.payload).toContain('Dana Fielding')
  })

  it('should render all main material names in the recycling obligations table', async () => {
    const response = await app.get(pendingDp.detailPath)
    for (const obligation of metMaterials) {
      expect(response.payload).toContain(obligation.material)
    }
  })

  it('should render non-zero material obligation tonnages', async () => {
    const response = await app.get(pendingDp.detailPath)
    for (const obligation of metMaterials) {
      if (obligation.tonnages.obligated > 0) {
        expect(response.payload).toContain(
          String(obligation.tonnages.obligated)
        )
      }
    }
  })

  it('should render material totals row', async () => {
    const response = await app.get(pendingDp.detailPath)
    expect(response.payload).toContain(String(metTotalObligated))
    expect(response.payload).toContain(String(metTotalAccepted))
  })

  it('should render glass breakdown material names', async () => {
    const response = await app.get(pendingDp.detailPath)
    for (const obligation of metGlassBreakdown) {
      expect(response.payload).toContain(obligation.material)
    }
  })

  it('should render two Totals rows — one per table', async () => {
    const response = await app.get(pendingDp.detailPath)
    const occurrences = (response.payload.match(/Totals/g) ?? []).length
    expect(occurrences).toBeGreaterThanOrEqual(2)
  })

  it('should render action buttons for a pending certificate', async () => {
    const response = await app.get(pendingDp.detailPath)
    expect(response.payload).toContain('Accept certificate')
    expect(response.payload).toContain('Cancel certificate')
    expect(response.payload).toContain(`href="${pendingDp.detailPath}/accept"`)
    expect(response.payload).toContain(
      `href="${pendingDp.detailPath}/cancel/reason"`
    )
  })

  it('should render cancel only for an accepted certificate', async () => {
    const response = await app.get(acceptedDp.detailPath)
    expect(response.payload).not.toContain('Accept certificate')
    expect(response.payload).toContain('Cancel certificate')
    expect(response.payload).toContain(
      `href="${acceptedDp.detailPath}/cancel/reason"`
    )
  })

  describe('Submission status label', () => {
    it('renders the Submission status label for a submitted declaration', async () => {
      const response = await app.get(pendingDp.detailPath)
      expect(response.payload).toContain('Submission status')
    })

    it('renders a blue Pending tag for a submitted (pending review) declaration', async () => {
      const response = await app.get(pendingDp.detailPath)
      expect(response.payload).toContain('govuk-tag--blue')
      expect(response.payload).toContain('Pending')
    })

    it('renders a teal Accepted tag for an accepted declaration', async () => {
      const response = await app.get(acceptedDp.detailPath)
      expect(response.payload).toContain('govuk-tag--teal')
      expect(response.payload).toContain('Accepted')
    })

    it('renders a grey Not submitted tag for an unsubmitted organisation', async () => {
      const response = await app.get(notSubmitted.detailPath)
      expect(response.payload).toContain('govuk-tag--grey')
      expect(response.payload).toContain('Not submitted')
    })

    it('renders the Submission status label for an unsubmitted organisation', async () => {
      const response = await app.get(notSubmitted.detailPath)
      expect(response.payload).toContain('Submission status')
    })

    it('does not render Submitted on or Name on account for an unsubmitted organisation', async () => {
      const { summaryRows } = loadDetailPage(
        (await app.get(notSubmitted.detailPath)).payload
      )
      expect(summaryRows.submittedOn.present).toBe(false)
      expect(summaryRows.nameOnAccount.present).toBe(false)
    })

    it('renders Submitted on and Name on account for a submitted declaration', async () => {
      const { summaryRows } = loadDetailPage(
        (await app.get(acceptedDp.detailPath)).payload
      )
      expect(summaryRows.submittedOn.present).toBe(true)
      expect(summaryRows.nameOnAccount.present).toBe(true)
    })
  })

  describe('Accepted outcome summary', () => {
    it('renders submission status, accepted by, and accepted date for an accepted direct producer', async () => {
      const response = await app.get(acceptedDp.detailPath)
      expect(response.payload).toContain('Submission status')
      expect(response.payload).toContain('Accepted by')
      expect(response.payload).toContain('Accepted date')
      expect(response.payload).toContain('James Walker')
      expect(response.payload).toContain('15 January 2027 at 14:30')
    })

    it('renders submission status for an accepted compliance scheme', async () => {
      const response = await app.get(acceptedCs.detailPath)
      expect(response.payload).toContain('Submission status')
      expect(response.payload).toContain('Accepted by')
      expect(response.payload).toContain('James Walker')
      expect(response.payload).toContain('12 January 2027 at 12:05')
    })
  })

  describe('Current year history', () => {
    it('renders the Current year heading', async () => {
      const response = await app.get(pendingDp.detailPath)
      expect(response.payload).toContain('Current year')
    })

    it('renders the empty-state message when there are no prior submissions', async () => {
      const response = await app.get(emptyHistoryDp.detailPath)
      expect(response.payload).toContain('No previous submissions')
    })

    it('renders the accepted declaration in current year when there is no separate history', async () => {
      const response = await app.get(acceptedDp.detailPath)
      expect(response.payload).toContain('15 January 2027 at 14:30')
      expect(response.payload).toContain('James Walker')
      expect(response.payload).not.toContain('No previous submissions')
    })

    it('renders an Accepted-only page with the blue tag, regulator name, and empty reason', async () => {
      const response = await app.get(acceptedOnly.detailPath)
      expect(response.payload).toContain('15 April 2026 at 11:20')
      expect(response.payload).toContain('govuk-tag govuk-tag--blue')
      expect(response.payload).toContain('James Walker')
      expect(response.payload).not.toContain('Not applicable')
    })

    it('renders a Cancelled-only page with the grey tag, submitter, and the audit reason', async () => {
      const response = await app.get(cancelledOnly.detailPath)
      expect(response.payload).toContain('8 April 2026 at 10:00')
      expect(response.payload).toContain('govuk-tag govuk-tag--grey')
      expect(response.payload).toContain('Test Submitter C')
      expect(response.payload).toContain('Information could not be verified')
    })

    it('renders both Accepted and Cancelled rows when the org has both', async () => {
      const response = await app.get(pendingDp.detailPath)
      expect(response.payload).toContain('13 February 2026 at 09:42')
      expect(response.payload).toContain('22 May 2026 at 14:18')
    })

    it('renders rows in the order returned by the API (newest first)', async () => {
      const response = await app.get(pendingDp.detailPath)
      const cancelledIdx = response.payload.indexOf('22 May 2026 at 14:18')
      const acceptedIdx = response.payload.indexOf('13 February 2026 at 09:42')
      expect(cancelledIdx).toBeGreaterThan(-1)
      expect(acceptedIdx).toBeGreaterThan(-1)
      expect(cancelledIdx).toBeLessThan(acceptedIdx)
    })

    it('renders a View submission link on each current year row', async () => {
      const response = await app.get(pendingDp.detailPath)
      const { currentYear } = loadDetailPage(response.payload)

      expect(currentYear.rows).toHaveLength(2)
      for (const row of currentYear.rows) {
        expect(row.viewSubmissionUrl).toBeTruthy()
      }
    })

    it('links each current year row to the declaration that action was taken on', async () => {
      const response = await app.get(pendingDp.detailPath)
      const { currentYear } = loadDetailPage(response.payload)

      expect(currentYear.rows[0].viewSubmissionUrl).toBe(
        pendingDp.history.find((h) => h.action === 'Cancelled').url
      )
      expect(currentYear.rows[1].viewSubmissionUrl).toBe(
        pendingDp.history.find((h) => h.action === 'Accepted').url
      )
    })

    it('links compliance scheme current year rows to prior accepted and cancelled declarations', async () => {
      const response = await app.get(pendingCs.detailPath)
      const { currentYear } = loadDetailPage(response.payload)

      expect(currentYear.rows).toHaveLength(2)
      expect(currentYear.rows[0].viewSubmissionUrl).toBe(
        pendingCs.history.find((h) => h.action === 'Cancelled').url
      )
      expect(currentYear.rows[1].viewSubmissionUrl).toBe(
        pendingCs.history.find((h) => h.action === 'Accepted').url
      )
    })

    it('loads the accepted submission when following a current year View submission link', async () => {
      const listResponse = await app.get(pendingDp.detailPath)
      const { currentYear } = loadDetailPage(listResponse.payload)
      const acceptedLink = currentYear.rows.find(
        (row) => row.action === 'Accepted'
      )?.viewSubmissionUrl

      const detailResponse = await app.get(acceptedLink)
      const acceptedPage = loadDetailPage(detailResponse.payload)

      expect(detailResponse.statusCode).toBe(statusCodes.ok)
      expect(acceptedPage.summaryRows.submissionStatus?.tag?.text).toBe(
        'Accepted'
      )
    })

    it('loads the cancelled submission when following a current year View submission link', async () => {
      const listResponse = await app.get(pendingDp.detailPath)
      const { currentYear } = loadDetailPage(listResponse.payload)
      const cancelledLink = currentYear.rows.find(
        (row) => row.action === 'Cancelled'
      )?.viewSubmissionUrl

      const detailResponse = await app.get(cancelledLink)
      const cancelledPage = loadDetailPage(detailResponse.payload)

      expect(detailResponse.statusCode).toBe(statusCodes.ok)
      expect(cancelledPage.summaryRows.submissionStatus?.tag?.text).toBe(
        'Cancelled'
      )
    })

    it('links an Accepted-only current year row to that accepted submission', async () => {
      const response = await app.get(acceptedOnly.detailPath)
      const { currentYear } = loadDetailPage(response.payload)

      expect(currentYear.rows).toHaveLength(1)
      expect(currentYear.rows[0].viewSubmissionUrl).toBe(
        acceptedOnly.detailPath
      )
    })

    it('links a Cancelled-only current year row to that cancelled submission', async () => {
      const response = await app.get(cancelledOnly.detailPath)
      const { currentYear } = loadDetailPage(response.payload)

      expect(currentYear.rows).toHaveLength(1)
      expect(currentYear.rows[0].viewSubmissionUrl).toBe(
        cancelledOnly.detailPath
      )
    })

    it('does not render View submission links when the current year table is empty', async () => {
      const response = await app.get(emptyHistoryDp.detailPath)
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

    const response = await app.get(pendingDp.detailPath)

    expect(response.statusCode).toBe(statusCodes.internalServerError)
    expect(response.payload).toContain(
      'Sorry, there is a problem with the service'
    )
    vi.restoreAllMocks()
  })
})
