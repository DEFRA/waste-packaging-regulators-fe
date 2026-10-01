import { setupRegulatorsApp } from '#test-helpers/msw/harness.js'
import { statusCodes } from '#server/common/constants/status-codes.js'

describe('signed-out page', () => {
  const app = setupRegulatorsApp()

  it('renders the signed out message and header sign-in link pointing to /certificates-of-compliance/signin-oidc', async () => {
    const response = await app.get(
      '/certificates-of-compliance/signed-out',
      null
    )

    expect(response.statusCode).toBe(statusCodes.ok)
    expect(response.payload).toContain('You have signed out.')
    expect(response.payload).not.toContain('Sign in again')
    expect(response.payload).toContain(
      'href="/certificates-of-compliance/signin-oidc"'
    )
  })

  it('renders the signed out message and header sign-in link pointing to /signin-oidc when accessed directly', async () => {
    const response = await app.server.inject({
      method: 'GET',
      url: '/signed-out'
    })

    expect(response.statusCode).toBe(statusCodes.ok)
    expect(response.payload).toContain('You have signed out.')
    expect(response.payload).not.toContain('Sign in again')
    expect(response.payload).toContain('href="/signin-oidc"')
  })

  it('renders the Welsh equivalent message when lang=cy is requested', async () => {
    const response = await app.server.inject({
      method: 'GET',
      url: '/signed-out?lang=cy'
    })

    expect(response.statusCode).toBe(statusCodes.ok)
    expect(response.payload).toContain('Rydych chi wedi cael eich allgofnodi.')
    expect(response.payload).not.toContain('Sign in again')
    expect(response.payload).toContain('href="/signin-oidc?lang=cy"')
  })
})
