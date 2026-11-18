import { describe, expect, test, vi } from 'vitest'

vi.mock('#services/case-management-api.service.js', () => ({
  createCaseManagementApiService: vi.fn()
}))

import { createCaseManagementApiService } from '#services/case-management-api.service.js'
import {
  fetchUnassignedCsocCases,
  mapCaseListItemToRow,
  filterDirectProducerCases
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

describe('filterDirectProducerCases', () => {
  test('keeps only DIRECT_PRODUCER rows', () => {
    const filtered = filterDirectProducerCases([
      { producerType: 'DIRECT_PRODUCER' },
      { producerType: 'COMPLIANCE_SCHEME' },
      { producerType: 'direct_producer' }
    ])
    expect(filtered).toHaveLength(2)
  })
})

describe('fetchUnassignedCsocCases', () => {
  test('calls listCases with CSoC unassigned and maps direct producers', async () => {
    const listCases = vi.fn().mockResolvedValue({
      items: [
        {
          id: '1',
          orgId: 'a',
          stateId: 'SUBMITTED',
          submittedAt: '2026-01-01T00:00:00.000Z',
          producerType: 'DIRECT_PRODUCER',
          displayData: {}
        },
        {
          id: '2',
          orgId: 'b',
          stateId: 'SUBMITTED',
          submittedAt: '2026-01-01T00:00:00.000Z',
          producerType: 'COMPLIANCE_SCHEME',
          displayData: {}
        }
      ],
      totalCount: 2,
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
        unassigned: true,
        page: 1,
        pageSize: 20
      },
      'trace-1'
    )
    expect(result.items).toHaveLength(1)
    expect(result.totalCount).toBe(1)
  })
})
