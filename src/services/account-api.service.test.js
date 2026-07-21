import { describe, expect, test, vi } from 'vitest'

import { config } from '#/config/config.js'
import {
  createAccountApiService,
  AccountApiService,
  mockAccountDetails
} from './account-api.service.js'

function mockOkResponse(data) {
  return {
    ok: true,
    status: 200,
    headers: {
      get: vi.fn().mockReturnValue('application/json; charset=utf-8')
    },
    json: vi.fn().mockResolvedValue(data)
  }
}

const externalIds = [
  'd1e2f3a4-b5c6-7890-abcd-ef1234567890',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
]

describe('AccountApiService', () => {
  test('getOrganisationsByExternalIds POSTs the ids and normalises the camelCase response', async () => {
    const responseBody = {
      organisations: [
        {
          externalId: externalIds[0],
          name: 'Redwood Retail Group',
          referenceNumber: '518293'
        }
      ],
      notFoundExternalIds: [externalIds[1]]
    }
    const fetchImpl = vi.fn().mockResolvedValue(mockOkResponse(responseBody))
    const service = new AccountApiService({
      baseUrl: 'http://localhost:3001',
      clientId: 'Developer',
      clientSecret: 'developer-pwd',
      fetchImpl
    })

    const result = await service.getOrganisationsByExternalIds(
      externalIds,
      'trace-1'
    )

    expect(result).toEqual(responseBody)
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://localhost:3001/api/organisations/organisations-by-externalIds',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ externalIds }),
        headers: expect.objectContaining({
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: expect.stringMatching(/^Basic /),
          'x-cdp-request-id': 'trace-1'
        })
      })
    )
  })

  test('getOrganisationsByExternalIds normalises PascalCase response keys', async () => {
    const org = {
      externalId: externalIds[0],
      name: 'Redwood Retail Group',
      referenceNumber: '518293'
    }
    const fetchImpl = vi.fn().mockResolvedValue(
      mockOkResponse({
        Organisations: [org],
        NotFoundExternalIds: [externalIds[1]]
      })
    )
    const service = new AccountApiService({
      baseUrl: 'http://localhost:3001',
      clientId: 'Developer',
      clientSecret: 'developer-pwd',
      fetchImpl
    })

    const result = await service.getOrganisationsByExternalIds(externalIds)

    expect(result).toEqual({
      organisations: [org],
      notFoundExternalIds: [externalIds[1]]
    })
  })

  test('getOrganisationsByCompaniesHouseNumbers POSTs the numbers and returns the matching organisations', async () => {
    const companiesHouseNumbers = ['12345678', '87654321']
    const responseBody = [
      {
        externalId: externalIds[0],
        name: 'EcoPack Compliance Ltd',
        referenceNumber: '530001',
        companiesHouseNumber: '12345678',
        isComplianceScheme: true
      }
    ]
    const fetchImpl = vi.fn().mockResolvedValue(mockOkResponse(responseBody))
    const service = new AccountApiService({
      baseUrl: 'http://localhost:3001',
      clientId: 'Developer',
      clientSecret: 'developer-pwd',
      fetchImpl
    })

    const result = await service.getOrganisationsByCompaniesHouseNumbers(
      companiesHouseNumbers,
      'trace-1'
    )

    expect(result).toEqual(responseBody)
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://localhost:3001/api/organisations/organisations-by-companies-house-numbers',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ companiesHouseNumbers }),
        headers: expect.objectContaining({
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: expect.stringMatching(/^Basic /),
          'x-cdp-request-id': 'trace-1'
        })
      })
    )
  })

  test('getOrganisationsByCompaniesHouseNumbers returns an empty array when the response is not a list', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(mockOkResponse(''))
    const service = new AccountApiService({
      baseUrl: 'http://localhost:3001',
      clientId: 'Developer',
      clientSecret: 'developer-pwd',
      fetchImpl
    })

    const result = await service.getOrganisationsByCompaniesHouseNumbers([
      '12345678'
    ])

    expect(result).toEqual([])
  })

  test('throws when the Account API responds with a non-success status', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      headers: {
        get: vi.fn().mockReturnValue('application/problem+json')
      },
      json: vi.fn().mockResolvedValue({
        title: 'Internal Server Error',
        status: 500
      })
    })
    const service = new AccountApiService({
      baseUrl: 'http://localhost:3001',
      clientId: 'Developer',
      clientSecret: 'developer-pwd',
      fetchImpl
    })

    await expect(
      service.getOrganisationsByExternalIds(externalIds)
    ).rejects.toMatchObject({
      name: 'ApiError',
      status: 500,
      title: 'Internal Server Error',
      message: 'account API request failed with status 500'
    })
  })

  test('createAccountApiService creates a service instance', () => {
    const service = createAccountApiService({
      baseUrl: 'http://localhost:3001',
      clientId: 'Developer',
      clientSecret: 'developer-pwd',
      fetchImpl: vi.fn()
    })

    expect(service).toBeInstanceOf(AccountApiService)
  })

  describe('getAccountDetailsById', () => {
    test('returns mockAccountDetails when useMockApi is true', async () => {
      const getSpy = vi
        .spyOn(config, 'get')
        .mockImplementation((key) => (key === 'useMockApi' ? true : undefined))

      const service = new AccountApiService({
        baseUrl: 'http://localhost:3001',
        clientId: 'Developer',
        clientSecret: 'developer-pwd',
        fetchImpl: vi.fn()
      })

      const result = await service.getAccountDetailsById('some-user-id')

      expect(result).toEqual(mockAccountDetails)
      getSpy.mockRestore()
    })

    test('does not call the API when useMockApi is true', async () => {
      const getSpy = vi
        .spyOn(config, 'get')
        .mockImplementation((key) => (key === 'useMockApi' ? true : undefined))
      const fetchImpl = vi.fn()
      const service = new AccountApiService({
        baseUrl: 'http://localhost:3001',
        clientId: 'Developer',
        clientSecret: 'developer-pwd',
        fetchImpl
      })

      await service.getAccountDetailsById('some-user-id')

      expect(fetchImpl).not.toHaveBeenCalled()
      getSpy.mockRestore()
    })

    test('calls the account API and maps the response when useMockApi is false', async () => {
      const getSpy = vi
        .spyOn(config, 'get')
        .mockImplementation((key) => (key === 'useMockApi' ? false : undefined))

      const apiResponse = {
        user: {
          firstName: 'Alice',
          lastName: 'Jones',
          email: 'alice@example.com',
          telephone: '01234 567890',
          serviceRole: 'Regulator',
          serviceRoleId: 3,
          organisations: [{ name: 'Environment Agency', nationId: 2 }]
        }
      }
      const fetchImpl = vi.fn().mockResolvedValue(mockOkResponse(apiResponse))
      const service = new AccountApiService({
        baseUrl: 'http://localhost:3001',
        clientId: 'Developer',
        clientSecret: 'developer-pwd',
        fetchImpl
      })

      const result = await service.getAccountDetailsById('alice-user-id')

      expect(result).toEqual({
        firstName: 'Alice',
        lastName: 'Jones',
        contactEmail: 'alice@example.com',
        telephone: '01234 567890',
        serviceRole: 'Regulator',
        serviceRoleId: 3,
        organisationName: 'Environment Agency',
        nationId: 2
      })
      getSpy.mockRestore()
    })

    test('maps Telephone from PascalCase API response', async () => {
      const getSpy = vi
        .spyOn(config, 'get')
        .mockImplementation((key) => (key === 'useMockApi' ? false : undefined))

      const apiResponse = {
        user: {
          firstName: 'Bob',
          lastName: 'Smith',
          email: 'bob@example.com',
          Telephone: '01987 654321',
          serviceRole: 'Admin',
          serviceRoleId: 1,
          organisations: []
        }
      }
      const fetchImpl = vi.fn().mockResolvedValue(mockOkResponse(apiResponse))
      const service = new AccountApiService({
        baseUrl: 'http://localhost:3001',
        clientId: 'Developer',
        clientSecret: 'developer-pwd',
        fetchImpl
      })

      const result = await service.getAccountDetailsById('bob-user-id')

      expect(result.telephone).toBe('01987 654321')
      getSpy.mockRestore()
    })

    test('returns an empty object when the API response has no user', async () => {
      const getSpy = vi
        .spyOn(config, 'get')
        .mockImplementation((key) => (key === 'useMockApi' ? false : undefined))

      const fetchImpl = vi
        .fn()
        .mockResolvedValue(mockOkResponse({ user: null }))
      const service = new AccountApiService({
        baseUrl: 'http://localhost:3001',
        clientId: 'Developer',
        clientSecret: 'developer-pwd',
        fetchImpl
      })

      const result = await service.getAccountDetailsById('unknown-id')

      expect(result).toEqual({})
      getSpy.mockRestore()
    })

    test('encodes the userId in the request URL', async () => {
      const getSpy = vi
        .spyOn(config, 'get')
        .mockImplementation((key) => (key === 'useMockApi' ? false : undefined))

      const apiResponse = { user: null }
      const fetchImpl = vi.fn().mockResolvedValue(mockOkResponse(apiResponse))
      const service = new AccountApiService({
        baseUrl: 'http://localhost:3001',
        clientId: 'Developer',
        clientSecret: 'developer-pwd',
        fetchImpl
      })

      await service.getAccountDetailsById('user id with spaces')

      expect(fetchImpl).toHaveBeenCalledWith(
        expect.stringContaining('user%20id%20with%20spaces'),
        expect.anything()
      )
      getSpy.mockRestore()
    })
  })

  test('createAccountApiService forwards bearer OAuth config to the service', () => {
    const values = {
      'accountApi.baseUrl': 'http://account.test',
      'accountApi.authMode': 'bearer',
      'accountApi.clientId': 'client-1',
      'accountApi.clientSecret': 'secret-1',
      'accountApi.scope': 'api://account/.default',
      'accountApi.tokenEndpoint': 'https://login.test/token',
      'tracing.header': 'x-cdp-request-id'
    }
    const getSpy = vi
      .spyOn(config, 'get')
      .mockImplementation((key) => values[key])

    const service = createAccountApiService()

    expect(service).toBeInstanceOf(AccountApiService)
    expect(service.authMode).toBe('bearer')
    expect(service.scope).toBe('api://account/.default')
    expect(service.tokenEndpoint).toBe('https://login.test/token')

    getSpy.mockRestore()
  })
})
