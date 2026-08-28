import { statusCodes } from '#server/common/constants/status-codes.js'
import { setupRegulatorsApp } from '#test-helpers/msw/harness.js'

// The declarations this controller acts on are declared inline, so the org
// wording each assertion checks traces back to this input.
const ORGS = [
  { name: 'Halvern Producers Ltd' },
  { name: 'Marisco Compliance Operators', type: 'compliance-scheme' },
  { name: 'Ashvale Producers Ltd', status: 'accepted' }
]
const itemOf = (org) => ({
  organisationId: org.organisationId,
  id: org.declarationId,
  name: org.name
})

const acceptUrlFor = (item) =>
  `/${item.organisationId}/certificates-of-compliance/${item.id}/accept`
const detailUrlFor = (item) =>
  `/${item.organisationId}/certificates-of-compliance/${item.id}`

describe('#certificatesOfComplianceAcceptController', () => {
  const app = setupRegulatorsApp()
  let DP_ITEM
  let CS_ITEM
  let ACCEPTED_ITEM

  // Fresh scenario per test so an approve in one test never leaks into the next.
  beforeEach(() => {
    const scenario = app.given(ORGS)
    DP_ITEM = itemOf(scenario.byName('Halvern Producers Ltd'))
    CS_ITEM = itemOf(scenario.byName('Marisco Compliance Operators'))
    ACCEPTED_ITEM = itemOf(scenario.byName('Ashvale Producers Ltd'))
  })

  describe('GET', () => {
    it('redirects unauthenticated users to /signin-oidc', async () => {
      const response = await app.server.inject({
        method: 'GET',
        url: acceptUrlFor(DP_ITEM)
      })
      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe('/signin-oidc')
    })

    it('renders the confirmation form with certificate wording for a Direct Producer', async () => {
      const cookie = await app.signIn()
      const response = await app.get(acceptUrlFor(DP_ITEM), cookie)
      expect(response.statusCode).toBe(statusCodes.ok)
      expect(response.payload).toContain(
        `Are you sure you want to accept this certificate for ${DP_ITEM.name}?`
      )
      expect(response.payload).toContain('name="confirm-accept"')
      expect(response.payload).toContain('value="yes"')
      expect(response.payload).toContain('value="no"')
      expect(response.payload).toContain('Continue')
    })

    it('renders a CSRF token in the confirmation form', async () => {
      const cookie = await app.signIn()
      const response = await app.get(acceptUrlFor(DP_ITEM), cookie)
      expect(response.statusCode).toBe(statusCodes.ok)
      expect(response.payload).toContain('name="CSRFToken"')
      expect(response.payload).toContain('id="csrf-crumb"')
    })

    it('renders the confirmation form with statement wording for a Compliance Scheme', async () => {
      const cookie = await app.signIn()
      const response = await app.get(acceptUrlFor(CS_ITEM), cookie)
      expect(response.statusCode).toBe(statusCodes.ok)
      expect(response.payload).toContain(
        `Are you sure you want to accept this statement for ${CS_ITEM.name}?`
      )
    })

    it('redirects to the detail page when the declaration is no longer pending', async () => {
      const cookie = await app.signIn()
      const response = await app.get(acceptUrlFor(ACCEPTED_ITEM), cookie)
      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe(detailUrlFor(ACCEPTED_ITEM))
    })
  })

  describe('POST', () => {
    it('redirects unauthenticated users to /signin-oidc', async () => {
      const response = await app.post(
        acceptUrlFor(DP_ITEM),
        'confirm-accept=yes',
        await app.anonCrumb()
      )
      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe('/signin-oidc')
    })

    it('rejects a request with no CSRF token', async () => {
      const response = await app.server.inject({
        method: 'POST',
        url: acceptUrlFor(DP_ITEM),
        payload: 'confirm-accept=yes',
        headers: { 'content-type': 'application/x-www-form-urlencoded' }
      })
      expect(response.statusCode).toBe(statusCodes.forbidden)
    })

    it('re-renders the form with an error summary when no choice is made', async () => {
      const cookie = await app.signIn()
      const response = await app.post(acceptUrlFor(DP_ITEM), '', cookie)
      expect(response.statusCode).toBe(statusCodes.ok)
      expect(response.payload).toContain('There is a problem')
      expect(response.payload).toContain('Select yes or no')
      expect(response.payload).toContain('href="#confirm-accept"')
    })

    it('re-renders the form when an invalid choice is sent', async () => {
      const cookie = await app.signIn()
      const response = await app.post(
        acceptUrlFor(DP_ITEM),
        'confirm-accept=maybe',
        cookie
      )
      expect(response.statusCode).toBe(statusCodes.ok)
      expect(response.payload).toContain('Select yes or no')
    })

    it('redirects to the detail page when "no" is chosen and shows no banner', async () => {
      const cookie = await app.signIn()
      const noResponse = await app.post(
        acceptUrlFor(DP_ITEM),
        'confirm-accept=no',
        cookie
      )
      expect(noResponse.statusCode).toBe(302)
      expect(noResponse.headers.location).toBe(detailUrlFor(DP_ITEM))

      const detailResponse = await app.get(
        detailUrlFor(DP_ITEM),
        app.nextCookie(noResponse, cookie)
      )
      expect(detailResponse.statusCode).toBe(statusCodes.ok)
      expect(detailResponse.payload).not.toContain('govuk-notification-banner')
    })

    it('redirects to the detail page when "yes" is chosen and shows the accepted banner', async () => {
      const cookie = await app.signIn()
      const yesResponse = await app.post(
        acceptUrlFor(DP_ITEM),
        'confirm-accept=yes',
        cookie
      )
      expect(yesResponse.statusCode).toBe(302)
      expect(yesResponse.headers.location).toBe(detailUrlFor(DP_ITEM))

      const detailResponse = await app.get(
        detailUrlFor(DP_ITEM),
        app.nextCookie(yesResponse, cookie)
      )
      expect(detailResponse.statusCode).toBe(statusCodes.ok)
      expect(detailResponse.payload).toContain('Certificate accepted')
      expect(detailResponse.payload).toContain('Certificate has been accepted.')
    })

    it('shows "Statement accepted" banner copy for a Compliance Scheme after "yes"', async () => {
      const cookie = await app.signIn()
      const yesResponse = await app.post(
        acceptUrlFor(CS_ITEM),
        'confirm-accept=yes',
        cookie
      )
      expect(yesResponse.statusCode).toBe(302)

      const detailResponse = await app.get(
        detailUrlFor(CS_ITEM),
        app.nextCookie(yesResponse, cookie)
      )
      expect(detailResponse.payload).toContain('Statement accepted')
      expect(detailResponse.payload).toContain('Statement has been accepted.')
    })
  })
})
