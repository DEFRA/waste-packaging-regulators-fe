import Hapi from '@hapi/hapi'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { accountDetailsContext } from './account-details-context.js'

const { mockLoadAccountDetails, mockGetSessionUser } = vi.hoisted(() => ({
  mockLoadAccountDetails: vi.fn(),
  mockGetSessionUser: vi.fn()
}))

vi.mock('#server/common/helpers/load-account-details.js', () => ({
  loadAccountDetails: mockLoadAccountDetails
}))

vi.mock('#server/common/helpers/get-session-user.js', () => ({
  getSessionUser: mockGetSessionUser
}))

describe('accountDetailsContext', () => {
  let server

  beforeEach(async () => {
    vi.clearAllMocks()
    mockLoadAccountDetails.mockResolvedValue({})

    server = Hapi.server()
    await server.register(accountDetailsContext)
    server.route({
      method: 'GET',
      path: '/',
      handler: () => ({ ok: true })
    })
  })

  it('loads account details for authenticated requests', async () => {
    mockGetSessionUser.mockReturnValue({ id: 'user-123' })

    const response = await server.inject({
      method: 'GET',
      url: '/'
    })

    expect(response.statusCode).toBe(200)
    expect(mockLoadAccountDetails).toHaveBeenCalledOnce()
  })

  it('skips account details loading when no session user is present', async () => {
    mockGetSessionUser.mockReturnValue(null)

    const response = await server.inject({
      method: 'GET',
      url: '/'
    })

    expect(response.statusCode).toBe(200)
    expect(mockLoadAccountDetails).not.toHaveBeenCalled()
  })
})
