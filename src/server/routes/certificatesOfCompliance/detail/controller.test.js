import { createServer } from '#/server/server.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { mockDetailData } from '../certificates-of-compliance.service.js'

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

  it('should render the compliance year in the caption', async () => {
    const response = await inject('/org-123/certificates-of-compliance/101411')
    expect(response.payload).toContain(
      `${mockDetailData.obligationYear} certificate of compliance`
    )
  })

  it('should render the company name as the heading', async () => {
    const response = await inject('/org-123/certificates-of-compliance/101411')
    expect(response.payload).toContain(mockDetailData.organisation.name)
  })

  it('should render the recycling obligations status', async () => {
    const response = await inject('/org-123/certificates-of-compliance/101411')
    // mockDetailData.obligationStatus === 'Met' → renders 'Met'
    expect(response.payload).toContain('Met')
  })

  it('should render the formatted date declaration was submitted', async () => {
    const response = await inject('/org-123/certificates-of-compliance/101411')
    // '2027-01-31T00:00:00Z' formats to '31 January 2027'
    expect(response.payload).toContain('31 January 2027')
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
    expect(response.payload).toContain(
      '/org-123/certificates-of-compliance/101411/approve'
    )
    expect(response.payload).toContain(
      '/org-123/certificates-of-compliance/101411/cancel'
    )
  })

  it('should not render action buttons for an accepted certificate', async () => {
    const response = await inject(
      '/497f6eca-6276-4993-bfeb-53cbbbba6f08/certificates-of-compliance/decl-309145'
    )
    expect(response.payload).not.toContain('/approve')
    expect(response.payload).not.toContain('Accept certificate')
  })
})
