import { http, HttpResponse } from 'msw'

import { config } from '#config/config.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { getMockServer } from '#mocks/server.js'
import { setupRegulatorsApp } from '#test-helpers/msw/harness.js'

function respondWithAccountUser(user) {
  const base = String(config.get('accountApi.baseUrl')).replace(/\/+$/, '')
  getMockServer().use(
    http.get(`${base}/api/users/user-organisations`, () =>
      HttpResponse.json({ user })
    )
  )
}

describe('regulator permission gate at sign-in', () => {
  const app = setupRegulatorsApp()

  it('grants a regulator user access to the certificates list', async () => {
    const response = await app.get(
      '/certificates-of-compliance?type=direct-producers&tab=pending'
    )

    expect(response.statusCode).toBe(statusCodes.ok)
  })

  it('denies sign-in for a user without a regulator service role', async () => {
    respondWithAccountUser({
      firstName: 'Percy',
      lastName: 'Producer',
      serviceRole: 'Basic User',
      serviceRoleId: 3,
      organisations: []
    })

    const response = await app.server.inject({
      method: 'GET',
      url: '/signin-oidc'
    })

    expect(response.statusCode).toBe(statusCodes.forbidden)
    expect(response.payload).toContain(
      'You do not have permission to access this page'
    )
  })

  it('denies sign-in for a valid login with no account', async () => {
    respondWithAccountUser(null)

    const response = await app.server.inject({
      method: 'GET',
      url: '/signin-oidc'
    })

    expect(response.statusCode).toBe(statusCodes.forbidden)
  })
})
