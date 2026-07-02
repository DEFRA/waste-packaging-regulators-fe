import { describe, expect, test, vi } from 'vitest'

import { config } from '#/config/config.js'
import {
  createAccountApiService,
  AccountApiService
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
