import { describe, expect, test, vi } from 'vitest'

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
  test('getOrganisationsByExternalIds POSTs the ids and returns the parsed body', async () => {
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
})
