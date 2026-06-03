import { describe, expect, test, vi } from 'vitest'

import {
  createWasteOrganisationsApiService,
  WasteOrganisationsApiService
} from './waste-organisations-api.service.js'

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

describe('WasteOrganisationsApiService', () => {
  test('listComplianceDeclarations calls endpoint with no params when none provided', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        mockOkResponse({ complianceDeclarations: [], total: 0 })
      )
    const service = new WasteOrganisationsApiService({
      baseUrl: 'http://localhost:9090',
      clientId: 'Developer',
      clientSecret: 'developer-pwd',
      fetchImpl
    })

    await service.listComplianceDeclarations({})

    expect(fetchImpl).toHaveBeenCalledWith(
      'http://localhost:9090/compliance-declarations',
      expect.objectContaining({ method: 'GET' })
    )
  })

  test('listComplianceDeclarations builds query string from provided filters', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        mockOkResponse({ complianceDeclarations: [], total: 0 })
      )
    const service = new WasteOrganisationsApiService({
      baseUrl: 'http://localhost:9090',
      clientId: 'Developer',
      clientSecret: 'developer-pwd',
      fetchImpl
    })

    await service.listComplianceDeclarations(
      {
        status: 'Submitted',
        registrationType: 'ComplianceScheme',
        page: 1,
        pageSize: 20
      },
      'trace-1'
    )

    expect(fetchImpl).toHaveBeenCalledWith(
      'http://localhost:9090/compliance-declarations?status=Submitted&registrationType=ComplianceScheme&page=1&pageSize=20',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Accept: 'application/json',
          Authorization: expect.stringMatching(/^Basic /),
          'x-cdp-request-id': 'trace-1'
        })
      })
    )
  })

  test('throws when API responds with non-success status', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      headers: {
        get: vi.fn().mockReturnValue('application/problem+json')
      },
      json: vi.fn().mockResolvedValue({
        type: 'https://tools.ietf.org/html/rfc9110#section-15.6.1',
        title: 'Internal Server Error',
        status: 500
      })
    })
    const service = new WasteOrganisationsApiService({
      baseUrl: 'http://localhost:9090',
      clientId: 'Developer',
      clientSecret: 'developer-pwd',
      fetchImpl
    })

    await expect(service.listComplianceDeclarations({})).rejects.toMatchObject({
      name: 'ApiError',
      status: 500,
      title: 'Internal Server Error',
      message: 'waste-organisations API request failed with status 500'
    })
  })

  test('createWasteOrganisationsApiService creates service instance', () => {
    const service = createWasteOrganisationsApiService({
      baseUrl: 'http://localhost:9090',
      clientId: 'Developer',
      clientSecret: 'developer-pwd',
      fetchImpl: vi.fn()
    })

    expect(service).toBeInstanceOf(WasteOrganisationsApiService)
  })
})
