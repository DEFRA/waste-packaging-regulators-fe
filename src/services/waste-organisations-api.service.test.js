import { describe, expect, test, vi } from 'vitest'

import {
  createWasteOrganisationsApiService,
  WasteOrganisationsApiService
} from './waste-organisations-api.service.js'
import { WasteObligationsApiService } from '#/services/waste-obligations-api.service.js'

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
  test('listComplianceOrganisations calls endpoint with default params when none provided', async () => {
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

    await service.listComplianceOrganisations({})

    expect(fetchImpl).toHaveBeenCalledWith(
      'http://localhost:9090/organisations?statuses=REGISTERED',
      expect.objectContaining({ method: 'GET' })
    )
  })

  test('listComplianceOrganisations builds query string from provided filters', async () => {
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

    await service.listComplianceOrganisations(
      {
        registrationType: 'ComplianceScheme',
        registrationYears: [2025]
      },
      'trace-1'
    )

    expect(fetchImpl).toHaveBeenCalledWith(
      'http://localhost:9090/organisations?statuses=REGISTERED&registrations=COMPLIANCE_SCHEME&registrationYears=2025',
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

  test('listComplianceOrganisations builds query string from provided filters for DirectProducers', async () => {
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

    await service.listComplianceOrganisations(
      {
        registrationType: 'DirectProducer',
        registrationYears: [2025]
      },
      'trace-1'
    )

    expect(fetchImpl).toHaveBeenCalledWith(
      'http://localhost:9090/organisations?statuses=REGISTERED&registrations=SMALL_PRODUCER%2CLARGE_PRODUCER&registrationYears=2025',
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

    await expect(service.listComplianceOrganisations({})).rejects.toMatchObject(
      {
        name: 'ApiError',
        status: 500,
        title: 'Internal Server Error',
        message: 'waste-organisations API request failed with status 500'
      }
    )
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

  test('includes x-api-key header when configured', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        mockOkResponse({ complianceDeclarations: [], total: 0 })
      )
    const service = new WasteOrganisationsApiService({
      baseUrl: 'http://localhost:8080',
      clientId: 'Developer',
      clientSecret: 'developer-pwd',
      headers: { 'x-api-key': 'test-api-key' },
      fetchImpl
    })

    await service.listComplianceOrganisations({})

    expect(fetchImpl).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ 'x-api-key': 'test-api-key' })
      })
    )
  })

  test('does not include x-api-key header when not configured', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        mockOkResponse({ complianceDeclarations: [], total: 0 })
      )
    const service = new WasteOrganisationsApiService({
      baseUrl: 'http://localhost:8080',
      clientId: 'Developer',
      clientSecret: 'developer-pwd',
      fetchImpl
    })

    await service.listComplianceOrganisations({})

    const [, init] = fetchImpl.mock.calls[0]
    expect(init.headers).not.toHaveProperty('x-api-key')
  })
})
