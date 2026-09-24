import { setupRegulatorsApp } from '#test-helpers/msw/harness.js'
import { statusCodes } from '#server/common/constants/status-codes.js'

describe('signed-out page', () => {
  const app = setupRegulatorsApp()

  it('renders the sign-in link pointing to the dashboard', async () => {
    const response = await app.get(
      '/certificates-of-compliance/signed-out',
      null
    )

    expect(response.statusCode).toBe(statusCodes.ok)
    expect(response.payload).toContain('href="/dashboard"')
  })

  it('renders the sign-in link pointing to the dashboard when accessed directly', async () => {
    const response = await app.server.inject({
      method: 'GET',
      url: '/signed-out'
    })

    expect(response.statusCode).toBe(statusCodes.ok)
    expect(response.payload).toContain('href="/dashboard"')
  })
})
