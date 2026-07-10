import { vi } from 'vitest'
import { createServer } from '#server/server.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { ApiError } from '#services/apiBaseClient/api-error.js'
import * as certificatesService from '../certificates-of-compliance.service.js'
import {
  mockComplianceSchemeDetailData,
  mockDetailData
} from '../certificates-of-compliance.service.js'

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

  it('should return a 200 status code', async () => {
    const response = await inject('/org-123/certificates-of-compliance/101411')
    expect(response.statusCode).toBe(statusCodes.ok)
  })

  it('should redirect to /signin-oidc when unauthenticated', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/org-123/certificates-of-compliance/101411'
    })
    expect(response.statusCode).toBe(302)
    expect(response.headers.location).toBe('/signin-oidc')
  })

  it('should render the compliance type label in the caption for a direct producer', async () => {
    const response = await inject('/org-123/certificates-of-compliance/101411')
    expect(response.payload).toContain(
      `${mockDetailData.obligationYear} certificate of compliance`
    )
  })

  it('should render the compliance type label in the caption for a compliance scheme', async () => {
    const response = await inject(
      '/923fa611-571c-4948-ab7d-fbb75e75ed65/certificates-of-compliance/decl-cs-001'
    )
    expect(response.payload).toContain(
      `${mockComplianceSchemeDetailData.obligationYear} statement of compliance`
    )
  })

  it('should render the company name as the heading', async () => {
    const response = await inject('/org-123/certificates-of-compliance/101411')
    expect(response.payload).toContain(mockDetailData.organisation.name)
  })

  it('should render the recycling obligations status', async () => {
    const response = await inject(
      '/b1e2c3d4-e5f6-7890-abcd-ef1234567890/certificates-of-compliance/decl-204872'
    )
    expect(response.payload).toContain('Not met')
  })

  it('should not render Regulation 43 for a direct producer', async () => {
    const response = await inject('/org-123/certificates-of-compliance/101411')
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
      'EcoPack Compliance Ltd declared they have not complied with regulation 43 requirements.'
    )
  })

  it('should render the complied Regulation 43 statement for a compliant compliance scheme', async () => {
    const response = await inject(
      '/e1d2c3b4-a596-4878-9abc-def012345678/certificates-of-compliance/decl-cs-101'
    )
    expect(response.payload).toContain(
      'Nationwide Packaging Scheme declared they have complied with regulation 43 requirements.'
    )
  })

  it('should render the formatted date declaration was submitted', async () => {
    const response = await inject('/org-123/certificates-of-compliance/101411')
    expect(response.payload).toContain('31 January 2027 at 00:00')
  })

  it('should render the organisation type', async () => {
    const response = await inject('/org-123/certificates-of-compliance/101411')
    // DirectProducer maps to 'Direct producer'
    expect(response.payload).toContain('Direct producer')
  })

  it('should render the organisation ID', async () => {
    const response = await inject('/org-123/certificates-of-compliance/101411')
    expect(response.payload).toContain(
      mockDetailData.organisation.referenceNumber
    )
  })

  it('should render the Companies House link when a company number is present', async () => {
    const response = await inject('/org-123/certificates-of-compliance/101411')
    expect(response.payload).toContain('View on Companies House')
    expect(response.payload).toContain(
      `company/${mockDetailData.organisation.companiesHouseNumber}`
    )
  })

  it('should not render the Companies House link when company number is No data', async () => {
    const response = await inject(
      '/e2f3a4b5-c6d7-8901-bcde-f23456789012/certificates-of-compliance?obligationYear=2026'
    )
    expect(response.payload).toContain('No data')
    expect(response.payload).not.toContain('View on Companies House')
  })

  it('should render the declaration signer name', async () => {
    const response = await inject('/org-123/certificates-of-compliance/101411')
    expect(response.payload).toContain(mockDetailData.submitterName)
  })

  it('should render all main material names in the recycling obligations table', async () => {
    const response = await inject('/org-123/certificates-of-compliance/101411')
    for (const obligation of expectedMaterials) {
      expect(response.payload).toContain(obligation.material)
    }
  })

  it('should render non-zero material obligation tonnages', async () => {
    const response = await inject('/org-123/certificates-of-compliance/101411')
    for (const obligation of expectedMaterials) {
      if (obligation.tonnages.obligated > 0) {
        expect(response.payload).toContain(
          String(obligation.tonnages.obligated)
        )
      }
    }
  })

  it('should render material totals row', async () => {
    const response = await inject('/org-123/certificates-of-compliance/101411')
    expect(response.payload).toContain(String(expectedMaterialTotalObligated))
    expect(response.payload).toContain(String(expectedMaterialTotalAccepted))
  })

  it('should render glass breakdown material names', async () => {
    const response = await inject('/org-123/certificates-of-compliance/101411')
    for (const obligation of expectedGlassBreakdown) {
      expect(response.payload).toContain(obligation.material)
    }
  })

  it('should render two Totals rows — one per table', async () => {
    const response = await inject('/org-123/certificates-of-compliance/101411')
    const occurrences = (response.payload.match(/Totals/g) ?? []).length
    expect(occurrences).toBeGreaterThanOrEqual(2)
  })

  it('should render action buttons for a pending certificate', async () => {
    const response = await inject('/org-123/certificates-of-compliance/101411')
    expect(response.payload).toContain('Accept certificate')
    expect(response.payload).toContain('Cancel certificate')
    // Accept is a link to the Yes/No confirmation page; Cancel posts directly.
    expect(response.payload).toContain(
      'href="/org-123/certificates-of-compliance/101411/accept"'
    )
    expect(response.payload).toContain(
      'action="/org-123/certificates-of-compliance/101411/cancel"'
    )
    expect(response.payload).toContain('data-prevent-double-click="true"')
  })

  it('should render cancel only for an accepted certificate', async () => {
    const response = await inject(
      '/a1b2c3d4-e5f6-7890-abcd-ef1234567890/certificates-of-compliance/decl-309145'
    )
    expect(response.payload).not.toContain('Accept certificate')
    expect(response.payload).toContain('Cancel certificate')
    expect(response.payload).toContain(
      'action="/a1b2c3d4-e5f6-7890-abcd-ef1234567890/certificates-of-compliance/decl-309145/cancel"'
    )
  })

  describe('Current year history', () => {
    const acceptedOnlyUrl =
      '/b0b1b2b3-b4b5-b6b7-b8b9-babbbcbdbebf/certificates-of-compliance/decl-accepted-only'
    const cancelledOnlyUrl =
      '/c0c1c2c3-c4c5-c6c7-c8c9-cacbcccdcecf/certificates-of-compliance/decl-cancelled-only'
    const bothUrl = '/org-123/certificates-of-compliance/101411'
    const emptyUrl =
      '/a1b2c3d4-e5f6-7890-abcd-ef1234567890/certificates-of-compliance/decl-309145'

    it('renders the Current year heading', async () => {
      const response = await inject(bothUrl)
      expect(response.payload).toContain('Current year')
    })

    it('renders the empty-state message when there are no prior submissions', async () => {
      const response = await inject(emptyUrl)
      expect(response.payload).toContain('No previous submissions')
    })

    it('renders an Accepted-only page with the blue tag, submitter, and "Not applicable" reason', async () => {
      const response = await inject(acceptedOnlyUrl)
      expect(response.payload).toContain('15 April 2026 at 11:20')
      expect(response.payload).toContain('govuk-tag govuk-tag--blue')
      expect(response.payload).toContain('Test Submitter D')
      expect(response.payload).toContain('Not applicable')
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
  })

  it('should render an error page when the obligations API returns 500', async () => {
    vi.spyOn(
      certificatesService,
      'getCertificateOfComplianceDetailViewModel'
    ).mockRejectedValueOnce(
      ApiError.from({
        message: 'waste-obligations API request failed with status 500',
        status: 500,
        serviceName: 'waste-obligations'
      })
    )

    const response = await inject('/org-123/certificates-of-compliance/101411')

    expect(response.statusCode).toBe(statusCodes.internalServerError)
    expect(response.payload).toContain('Something went wrong')
    vi.restoreAllMocks()
  })
})
