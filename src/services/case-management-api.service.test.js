import { describe, expect, test, vi } from 'vitest'

import { config } from '#config/config.js'
import {
  CaseManagementApiService,
  createCaseManagementApiService
} from './case-management-api.service.js'

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

const eaSessionUser = {
  id: 'user-1',
  name: 'Alex Regulator',
  email: 'alex@example.com',
  nationId: 1
}

describe('CaseManagementApiService', () => {
  test('listCases calls GET /cases with query params', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(mockOkResponse({ items: [], totalCount: 0 }))
    const service = new CaseManagementApiService({
      baseUrl: 'http://localhost:8085',
      authMode: 'none',
      headers: { 'x-cdp-client-id': 'frontend' },
      fetchImpl
    })

    await service.listCases({
      caseType: 'CSoC',
      unassigned: true,
      page: 2,
      pageSize: 10
    })

    expect(fetchImpl).toHaveBeenCalledWith(
      'http://localhost:8085/cases?caseType=CSoC&unassigned=true&page=2&pageSize=10',
      expect.objectContaining({ method: 'GET' })
    )
  })

  test('listCases supports multiple caseType values', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(mockOkResponse({ items: [], totalCount: 0 }))
    const service = new CaseManagementApiService({
      baseUrl: 'http://localhost:8085',
      authMode: 'none',
      fetchImpl
    })

    await service.listCases({ caseType: ['CSoC', 'Other'] })

    expect(fetchImpl).toHaveBeenCalledWith(
      'http://localhost:8085/cases?caseType=CSoC&caseType=Other',
      expect.any(Object)
    )
  })
})

describe('createCaseManagementApiService', () => {
  test('throws when session user has no mapped nation', () => {
    expect(() =>
      createCaseManagementApiService({ sessionUser: { nationId: 99 } })
    ).toThrow(/mapped regulator nation/)
  })

  test('sends trust headers on requests', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(mockOkResponse({ items: [], totalCount: 0 }))
    const service = createCaseManagementApiService({
      sessionUser: eaSessionUser,
      fetchImpl
    })

    await service.listCases({ caseType: 'CSoC' }, 'trace-cm-1')

    expect(fetchImpl).toHaveBeenCalledWith(
      'http://localhost:8085/cases?caseType=CSoC',
      expect.objectContaining({
        headers: expect.objectContaining({
          'x-cdp-client-id': 'frontend',
          'x-cdp-user-id': 'user-1',
          'x-cdp-user-nation': 'ENGLAND',
          'x-cdp-request-id': 'trace-cm-1'
        })
      })
    )
  })

  test('createCaseManagementApiService creates service instance', () => {
    const service = createCaseManagementApiService({
      sessionUser: eaSessionUser,
      baseUrl: config.get('caseManagementApi.baseUrl'),
      fetchImpl: vi.fn()
    })

    expect(service).toBeInstanceOf(CaseManagementApiService)
  })
})
