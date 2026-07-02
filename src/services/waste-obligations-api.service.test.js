import { describe, expect, test, vi } from 'vitest'

import {
  createWasteObligationsApiService,
  WasteObligationsApiService
} from './waste-obligations-api.service.js'

function mockOkResponse(data, status = 200) {
  return {
    ok: true,
    status,
    headers: {
      get: vi.fn().mockReturnValue('application/json; charset=utf-8')
    },
    json: vi.fn().mockResolvedValue(data)
  }
}

describe('WasteObligationsApiService', () => {
  test('listComplianceDeclarations calls endpoint with no params when none provided', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        mockOkResponse({ complianceDeclarations: [], total: 0 })
      )
    const service = new WasteObligationsApiService({
      baseUrl: 'http://localhost:8080',
      clientId: 'Developer',
      clientSecret: 'developer-pwd',
      fetchImpl
    })

    await service.listComplianceDeclarations({})

    expect(fetchImpl).toHaveBeenCalledWith(
      'http://localhost:8080/compliance-declarations',
      expect.objectContaining({ method: 'GET' })
    )
  })

  test('listComplianceDeclarations builds query string from provided filters', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        mockOkResponse({ complianceDeclarations: [], total: 0 })
      )
    const service = new WasteObligationsApiService({
      baseUrl: 'http://localhost:8080',
      clientId: 'Developer',
      clientSecret: 'developer-pwd',
      fetchImpl
    })

    await service.listComplianceDeclarations(
      {
        status: 'Submitted',
        registrationType: 'DirectProducer',
        page: 1,
        pageSize: 20
      },
      'trace-1'
    )

    expect(fetchImpl).toHaveBeenCalledWith(
      'http://localhost:8080/compliance-declarations?status=Submitted&registrationType=DirectProducer&page=1&pageSize=20',
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

  test('listComplianceDeclarations omits undefined filter params', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        mockOkResponse({ complianceDeclarations: [], total: 0 })
      )
    const service = new WasteObligationsApiService({
      baseUrl: 'http://localhost:8080',
      clientId: 'Developer',
      clientSecret: 'developer-pwd',
      fetchImpl
    })

    await service.listComplianceDeclarations({ status: 'Accepted' })

    expect(fetchImpl).toHaveBeenCalledWith(
      'http://localhost:8080/compliance-declarations?status=Accepted',
      expect.any(Object)
    )
  })

  test('listOrganisationComplianceDeclarations targets the org-scoped endpoint with obligationYear', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(mockOkResponse({ complianceDeclarations: [] }))
    const service = new WasteObligationsApiService({
      baseUrl: 'http://localhost:8080',
      clientId: 'Developer',
      clientSecret: 'developer-pwd',
      fetchImpl
    })

    await service.listOrganisationComplianceDeclarations(
      { organisationId: 'org-1', obligationYear: 2026 },
      'trace-y'
    )

    expect(fetchImpl).toHaveBeenCalledWith(
      'http://localhost:8080/organisations/org-1/compliance-declarations?obligationYear=2026',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ 'x-cdp-request-id': 'trace-y' })
      })
    )
  })

  test('includes x-api-key header when configured', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        mockOkResponse({ complianceDeclarations: [], total: 0 })
      )
    const service = new WasteObligationsApiService({
      baseUrl: 'http://localhost:8080',
      clientId: 'Developer',
      clientSecret: 'developer-pwd',
      headers: { 'x-api-key': 'test-api-key' },
      fetchImpl
    })

    await service.listComplianceDeclarations({})

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
    const service = new WasteObligationsApiService({
      baseUrl: 'http://localhost:8080',
      clientId: 'Developer',
      clientSecret: 'developer-pwd',
      fetchImpl
    })

    await service.listComplianceDeclarations({})

    const [, init] = fetchImpl.mock.calls[0]
    expect(init.headers).not.toHaveProperty('x-api-key')
  })

  test('throws when API responds with non-success status', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      headers: {
        get: vi.fn().mockReturnValue('application/problem+json')
      },
      json: vi.fn().mockResolvedValue({
        type: 'https://tools.ietf.org/html/rfc9110#section-15.5.5',
        title: 'Not Found',
        status: 404
      })
    })
    const service = new WasteObligationsApiService({
      baseUrl: 'http://localhost:8080',
      clientId: 'Developer',
      clientSecret: 'developer-pwd',
      fetchImpl
    })

    await expect(service.listComplianceDeclarations({})).rejects.toMatchObject({
      name: 'ApiError',
      status: 404,
      title: 'Not Found',
      message: 'waste-obligations API request failed with status 404'
    })
  })

  test('getComplianceDeclaration calls the correct endpoint', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(mockOkResponse({ id: 'decl-1', status: 'Submitted' }))
    const service = new WasteObligationsApiService({
      baseUrl: 'http://localhost:8080',
      clientId: 'Developer',
      clientSecret: 'developer-pwd',
      fetchImpl
    })

    await service.getComplianceDeclaration(
      { organisationId: 'org-abc', id: 'decl-1' },
      'trace-2'
    )

    expect(fetchImpl).toHaveBeenCalledWith(
      'http://localhost:8080/organisations/org-abc/compliance-declarations/decl-1',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ 'x-cdp-request-id': 'trace-2' })
      })
    )
  })

  describe('getComplianceDeclarationOrNull', () => {
    test('returns data when declaration exists', async () => {
      const fetchImpl = vi
        .fn()
        .mockResolvedValue(
          mockOkResponse({ id: 'decl-1', status: 'Submitted' })
        )
      const service = new WasteObligationsApiService({
        baseUrl: 'http://localhost:8080',
        clientId: 'Developer',
        clientSecret: 'developer-pwd',
        fetchImpl
      })

      const result = await service.getComplianceDeclarationOrNull({
        organisationId: 'org-abc',
        id: 'decl-1'
      })

      expect(result).toMatchObject({ id: 'decl-1', status: 'Submitted' })
    })

    test('returns null when the API responds with 404', async () => {
      const fetchImpl = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        headers: { get: vi.fn().mockReturnValue('application/problem+json') },
        json: vi.fn().mockResolvedValue({ title: 'Not Found', status: 404 })
      })
      const service = new WasteObligationsApiService({
        baseUrl: 'http://localhost:8080',
        clientId: 'Developer',
        clientSecret: 'developer-pwd',
        fetchImpl
      })

      const result = await service.getComplianceDeclarationOrNull({
        organisationId: 'org-abc',
        id: 'decl-1'
      })

      expect(result).toBeNull()
    })

    test('re-throws non-404 API errors', async () => {
      const fetchImpl = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        headers: { get: vi.fn().mockReturnValue('application/problem+json') },
        json: vi
          .fn()
          .mockResolvedValue({ title: 'Internal Server Error', status: 500 })
      })
      const service = new WasteObligationsApiService({
        baseUrl: 'http://localhost:8080',
        clientId: 'Developer',
        clientSecret: 'developer-pwd',
        fetchImpl
      })

      await expect(
        service.getComplianceDeclarationOrNull({
          organisationId: 'org-abc',
          id: 'decl-1'
        })
      ).rejects.toMatchObject({ name: 'ApiError', status: 500 })
    })
  })

  test('createWasteObligationsApiService creates service instance', () => {
    const service = createWasteObligationsApiService({
      baseUrl: 'http://localhost:8080',
      clientId: 'Developer',
      clientSecret: 'developer-pwd',
      fetchImpl: vi.fn()
    })

    expect(service).toBeInstanceOf(WasteObligationsApiService)
  })

  test('getComplianceObligation calls the correct endpoint with obligationYear', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(mockOkResponse({ obligations: [] }))
    const service = new WasteObligationsApiService({
      baseUrl: 'http://localhost:8080',
      clientId: 'Developer',
      clientSecret: 'developer-pwd',
      fetchImpl
    })

    await service.getComplianceObligation(
      { organisationId: 'org-abc', complianceYear: 2026 },
      'trace-2'
    )

    expect(fetchImpl).toHaveBeenCalledWith(
      'http://localhost:8080/organisations/org-abc/obligations?obligationYear=2026',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ 'x-cdp-request-id': 'trace-2' })
      })
    )
  })

  test('updateComplianceDeclaration calls the correct PATCH endpoint', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(mockOkResponse({ id: 'decl-1', status: 'Accepted' }))
    const service = new WasteObligationsApiService({
      baseUrl: 'http://localhost:8080',
      clientId: 'Developer',
      clientSecret: 'developer-pwd',
      fetchImpl
    })

    await service.updateComplianceDeclaration(
      {
        organisationId: 'org-abc',
        id: 'decl-1',
        status: 'Accepted',
        user: { id: 'user-1', email: 'user@example.com' }
      },
      'trace-3'
    )

    expect(fetchImpl).toHaveBeenCalledWith(
      'http://localhost:8080/organisations/org-abc/compliance-declarations/decl-1',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({
          status: 'Accepted',
          user: { id: 'user-1', email: 'user@example.com' }
        }),
        headers: expect.objectContaining({ 'x-cdp-request-id': 'trace-3' })
      })
    )
  })
})
