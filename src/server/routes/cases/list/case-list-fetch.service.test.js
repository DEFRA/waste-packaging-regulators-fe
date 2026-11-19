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
})
