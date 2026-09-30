import { describe, it, expect, vi, beforeEach } from 'vitest'
import { loadAccountDetails } from './load-account-details.js'

const {
  mockGetAccountDetailsById,
  mockMapAccountDetailsDtoToViewModel,
  mockConfigGet
} = vi.hoisted(() => ({
  mockGetAccountDetailsById: vi.fn(),
  mockMapAccountDetailsDtoToViewModel: vi.fn(),
  mockConfigGet: vi.fn()
}))

vi.mock('#services/account-api.service.js', () => ({
  createAccountApiService: () => ({
    getAccountDetailsById: mockGetAccountDetailsById
  }),
  mapAccountDetailsDtoToViewModel: mockMapAccountDetailsDtoToViewModel
}))

vi.mock('#config/config.js', () => ({
  config: { get: mockConfigGet }
}))

const ACCOUNT_DETAILS_ERROR = 'We could not load your account details.'
const USER_ID_ERROR = 'We could not determine your user id.'

function mockRequest({
  user,
  app = {},
  headers = {},
  logger = { error: vi.fn() }
} = {}) {
  return {
    yar: {
      id: user === undefined ? null : 'session-id',
      get: (key) => (key === 'user' ? user : null)
    },
    app,
    headers,
    logger
  }
}

describe('loadAccountDetails', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockConfigGet.mockReturnValue('x-trace-id')
    mockMapAccountDetailsDtoToViewModel.mockImplementation((dto) => ({
      firstName: dto.firstName ?? '',
      lastName: dto.lastName ?? '',
      serviceRole: dto.serviceRole ?? '',
      serviceRoleId: dto.serviceRoleId,
      email: dto.contactEmail ?? '',
      telephone: dto.telephone ?? '',
      organisationName: dto.organisationName ?? '',
      nationId: dto.nationId
    }))
  })

  it('returns empty result when no session user is present', async () => {
    const request = mockRequest({ user: null })

    const result = await loadAccountDetails(request)

    expect(result).toEqual({
      user: null,
      accountDetails: null,
      accountDetailsError: null
    })
    expect(mockGetAccountDetailsById).not.toHaveBeenCalled()
    expect(request.app.accountDetails).toBeUndefined()
  })

  it('loads account details by session user id and stores them on request.app', async () => {
    const request = mockRequest({
      user: { id: 'user-123' },
      headers: { 'x-trace-id': 'trace-abc' }
    })
    mockGetAccountDetailsById.mockResolvedValue({
      firstName: 'Jane',
      lastName: 'Smith',
      organisationName: 'Environment Agency',
      serviceRoleId: 4,
      nationId: 1
    })

    const result = await loadAccountDetails(request)

    expect(mockGetAccountDetailsById).toHaveBeenCalledWith(
      'user-123',
      'trace-abc'
    )
    expect(result.accountDetails).toEqual(
      expect.objectContaining({
        firstName: 'Jane',
        lastName: 'Smith',
        organisationName: 'Environment Agency',
        serviceRoleId: 4,
        nationId: 1
      })
    )
    expect(result.accountDetailsError).toBeUndefined()
    expect(request.app.accountDetails).toEqual(result.accountDetails)
  })

  it('resolves user id from profile oid when id is absent', async () => {
    const request = mockRequest({
      user: { profile: { oid: '  oid-from-profile  ' } }
    })
    mockGetAccountDetailsById.mockResolvedValue({
      firstName: 'Alex',
      lastName: 'Taylor',
      organisationName: 'SEPA',
      serviceRoleId: 3,
      nationId: 2
    })

    await loadAccountDetails(request)

    expect(mockGetAccountDetailsById).toHaveBeenCalledWith(
      'oid-from-profile',
      undefined
    )
  })

  it('returns a user id error when the session user has no resolvable id', async () => {
    const request = mockRequest({ user: { name: 'No Id User' } })

    const result = await loadAccountDetails(request)

    expect(result.accountDetailsError).toBe(USER_ID_ERROR)
    expect(result.accountDetails).toBeUndefined()
    expect(mockGetAccountDetailsById).not.toHaveBeenCalled()
  })

  it('treats blank mapped account details as a load failure', async () => {
    const request = mockRequest({ user: { id: 'user-123' } })
    mockGetAccountDetailsById.mockResolvedValue({})

    const result = await loadAccountDetails(request)

    expect(result.accountDetails).toBeNull()
    expect(result.accountDetailsError).toBe(ACCOUNT_DETAILS_ERROR)
    expect(request.app.accountDetails).toBeNull()
  })

  it('returns an account details error when the Account API throws', async () => {
    const request = mockRequest({ user: { id: 'user-123' } })
    const error = new Error('Account API unavailable')
    mockGetAccountDetailsById.mockRejectedValue(error)

    const result = await loadAccountDetails(request)

    expect(result.accountDetailsError).toBe(ACCOUNT_DETAILS_ERROR)
    expect(request.logger.error).toHaveBeenCalledWith(
      { err: error },
      'Failed to load account details'
    )
  })
})
