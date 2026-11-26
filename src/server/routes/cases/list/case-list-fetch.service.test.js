import { describe, expect, test, vi } from 'vitest'

vi.mock('#services/case-management-api.service.js', () => ({
  createCaseManagementApiService: vi.fn()
}))

import { createCaseManagementApiService } from '#services/case-management-api.service.js'
import {
  fetchUnassignedCsocCases,
  mapCaseListItemToRow
} from './case-list-fetch.service.js'

describe('mapCaseListItemToRow', () => {
  test('reads organisation fields from displayData', () => {
    expect(
      mapCaseListItemToRow({
        id: 'case-1',
        orgId: '100010',
        stateId: 'SUBMITTED',
        submittedAt: '2026-11-10T10:30:00.000Z',
        producerType: 'DIRECT_PRODUCER',
        displayData: {
          organisationName: { value: 'Acme Ltd', type: 'string' }
        }
      })
    ).toEqual({
      caseId: 'case-1',
      organisationName: 'Acme Ltd',
      organisationId: '100010',
      dateSubmitted: '2026-11-10T10:30:00.000Z',
      submissionStatus: 'SUBMITTED',
      producerType: 'DIRECT_PRODUCER'
    })
  })

  test('falls back to null, or to displayData, for missing fields', () => {
    expect(
      mapCaseListItemToRow({
        id: 'case-2',
        displayData: { organisationName: 'Plain Ltd', organisationId: 100020 }
      })
    ).toEqual({
      caseId: 'case-2',
      organisationName: 'Plain Ltd',
      organisationId: '100020',
      dateSubmitted: null,
      submissionStatus: null,
      producerType: null
    })
  })

  test('reads a display field with no value, or no displayData, as null', () => {
    expect(
      mapCaseListItemToRow({
        id: 'case-3',
        displayData: { organisationName: { value: null, type: 'string' } }
      }).organisationName
    ).toBeNull()
    expect(mapCaseListItemToRow({ id: 'case-4' }).organisationName).toBeNull()
  })
})

describe('fetchUnassignedCsocCases', () => {
  test('asks for open unassigned direct producer CSoC cases and keeps the total', async () => {
    const listCases = vi.fn().mockResolvedValue({
      items: [
        {
          id: '1',
          orgId: 'a',
          stateId: 'SUBMITTED',
          submittedAt: '2026-01-01T00:00:00.000Z',
          producerType: 'DIRECT_PRODUCER',
          displayData: {}
        }
      ],
      totalCount: 244,
      page: 1,
      pageSize: 20
    })
    createCaseManagementApiService.mockReturnValue({ listCases })

    const sessionUser = { nationId: 1 }
    const result = await fetchUnassignedCsocCases(sessionUser, 'trace-1', {
      page: 1,
      pageSize: 20
    })

    expect(listCases).toHaveBeenCalledWith(
      {
        caseType: 'CSoC',
        producerType: 'DIRECT_PRODUCER',
        unassigned: true,
        isTerminal: false,
        page: 1,
        pageSize: 20
      },
      'trace-1'
    )
    expect(result.items).toHaveLength(1)
    expect(result.totalCount).toBe(244)
  })

  test('uses the requested paging and no cases when the response leaves them out', async () => {
    createCaseManagementApiService.mockReturnValue({
      listCases: vi.fn().mockResolvedValue({})
    })

    const result = await fetchUnassignedCsocCases({ nationId: 1 }, 'trace-2', {
      page: 3,
      pageSize: 50
    })

    expect(result).toEqual({ items: [], totalCount: 0, page: 3, pageSize: 50 })
  })

  test('asks for the first page of 20 by default', async () => {
    const listCases = vi.fn().mockResolvedValue({})
    createCaseManagementApiService.mockReturnValue({ listCases })

    await fetchUnassignedCsocCases({ nationId: 1 }, 'trace-3')

    expect(listCases).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, pageSize: 20 }),
      'trace-3'
    )
  })
})
