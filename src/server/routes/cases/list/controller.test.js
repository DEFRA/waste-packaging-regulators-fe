import { randomUUID } from 'node:crypto'
import { http, HttpResponse } from 'msw'

import { config } from '#config/config.js'
import { caseManagementHandlers } from '#mocks/case-management/handlers.js'
import { createCaseManagementStore } from '#mocks/case-management/store.js'
import { getMockServer } from '#mocks/server.js'
import { setupRegulatorsApp } from '#test-helpers/msw/harness.js'
import { getRegulatorCaseManagementNation } from '#server/common/helpers/regulator-case-management-nation.js'

vi.mock(
  '#server/common/helpers/regulator-case-management-nation.js',
  async (importOriginal) => {
    const actual = await importOriginal()
    return {
      getRegulatorCaseManagementNation: vi.fn(
        actual.getRegulatorCaseManagementNation
      )
    }
  }
)

function givenCases(records) {
  getMockServer().use(
    ...caseManagementHandlers(createCaseManagementStore(records))
  )
}

describe('#casesList', () => {
  const app = setupRegulatorsApp()

  beforeEach(() => {
    config.set('caseManagement.enabled', true)
  })

  afterEach(() => {
    config.set('caseManagement.enabled', false)
  })

  it('is not found when the case management flag is off', async () => {
    // Arrange
    config.set('caseManagement.enabled', false)

    // Act
    const response = await app.get('/cases')

    // Assert
    expect(response.statusCode).toBe(404)
  })

  it.each([
    ['organisation type', '/cases?type=everyone'],
    ['tab', '/cases?tab=everything']
  ])('is a bad request for an unknown %s', async (_, url) => {
    // Act
    const response = await app.get(url)

    // Assert
    expect(response.statusCode).toBe(400)
  })

  it('is forbidden when the regulator has no Case Management nation', async () => {
    // Arrange
    getRegulatorCaseManagementNation.mockReturnValueOnce(null)

    // Act
    const response = await app.get('/cases')

    // Assert
    expect(response.statusCode).toBe(403)
  })

  it.each([
    ['is down', () => new HttpResponse(null, { status: 503 })],
    ['is not found', () => new HttpResponse(null, { status: 404 })],
    ['cannot be reached', () => HttpResponse.error()]
  ])(
    'says the service is unavailable when Case Management %s',
    async (_, resolver) => {
      // Arrange
      getMockServer().use(
        http.get(`${config.get('caseManagementApi.baseUrl')}/cases`, resolver)
      )

      // Act
      const response = await app.get('/cases')

      // Assert
      expect(response.statusCode).toBe(503)
      expect(response.payload).toContain('Sorry, the service is unavailable')
    }
  )

  it('says there is a problem with the service when Case Management errors', async () => {
    // Arrange
    getMockServer().use(
      http.get(
        `${config.get('caseManagementApi.baseUrl')}/cases`,
        () => new HttpResponse(null, { status: 500 })
      )
    )

    // Act
    const response = await app.get('/cases')

    // Assert
    expect(response.statusCode).toBe(500)
    expect(response.payload).toContain(
      'Sorry, there is a problem with the service'
    )
  })

  it('shows a state it has no status for as it is', async () => {
    // Arrange
    givenCases([
      {
        id: randomUUID(),
        caseType: 'CSoC',
        stateId: 'UNDER_REVIEW',
        isTerminal: false,
        submittedAt: '2026-12-15T10:30:00.000Z',
        nation: 'ENGLAND',
        orgId: '100010',
        assignedToId: null,
        producerType: 'DIRECT_PRODUCER',
        displayData: {
          organisationName: { value: 'Producer Ltd', type: 'string' }
        }
      }
    ])

    // Act
    const response = await app.get('/cases')

    // Assert
    expect(response.payload).toContain('UNDER_REVIEW')
  })

  it('shows the page layout', async () => {
    // Arrange
    givenCases([])

    // Act
    const response = await app.get('/cases')

    // Assert
    expect(response.statusCode).toBe(200)
    expect(response.payload).toContain('2026 relevant year')
    expect(response.payload).toContain(
      'View certificates and statements of compliance'
    )
    expect(response.payload).toContain('Search by organisation name or ID')
    expect(response.payload).toContain(
      'aria-current="page" href="/cases?type=direct-producers">Direct producers'
    )
    expect(response.payload).toContain('Compliance schemes')
    expect(response.payload).toContain('Download report (Excel)')
    expect(response.payload).toContain('aria-current="page">Unassigned (0)')
    expect(response.payload).toContain('Assigned to me (0)')
    expect(response.payload).toContain('Assigned to team (0)')
    expect(response.payload).toContain('Completed (0)')
    expect(response.payload).toContain('>\n  Assign\n</a>')
    expect(response.payload).toContain('Assign to me\n</a>')
  })

  it('lists open unassigned direct producer cases in the regulator nation', async () => {
    // Arrange
    givenCases([
      {
        id: randomUUID(),
        caseType: 'CSoC',
        stateId: 'SUBMITTED',
        isTerminal: false,
        submittedAt: '2026-12-15T10:30:00.000Z',
        nation: 'ENGLAND',
        orgId: '100010',
        assignedToId: null,
        producerType: 'DIRECT_PRODUCER',
        displayData: {
          organisationName: {
            value: 'Unassigned Producer Ltd',
            type: 'string'
          }
        }
      },
      {
        id: randomUUID(),
        caseType: 'CSoC',
        stateId: 'SUBMITTED',
        isTerminal: false,
        submittedAt: '2026-12-15T10:30:00.000Z',
        nation: 'ENGLAND',
        orgId: '200001',
        assignedToId: null,
        producerType: 'COMPLIANCE_SCHEME',
        displayData: {
          organisationName: { value: 'Scheme Ltd', type: 'string' }
        }
      },
      {
        id: randomUUID(),
        caseType: 'CSoC',
        stateId: 'ACCEPTED',
        isTerminal: true,
        submittedAt: '2026-12-15T10:30:00.000Z',
        nation: 'ENGLAND',
        orgId: '100011',
        assignedToId: null,
        producerType: 'DIRECT_PRODUCER',
        displayData: {
          organisationName: { value: 'Concluded Producer Ltd', type: 'string' }
        }
      },
      {
        id: randomUUID(),
        caseType: 'CSoC',
        stateId: 'SUBMITTED',
        isTerminal: false,
        submittedAt: '2026-12-15T10:30:00.000Z',
        nation: 'WALES',
        orgId: '100012',
        assignedToId: null,
        producerType: 'DIRECT_PRODUCER',
        displayData: {
          organisationName: { value: 'Welsh Producer Ltd', type: 'string' }
        }
      }
    ])

    // Act
    const response = await app.get('/cases')

    // Assert
    expect(response.payload).toContain('Unassigned (1)')
    expect(response.payload).toContain(
      '<strong>1</strong>\n        unassigned case\n'
    )
    expect(response.payload).toContain('Unassigned Producer Ltd')
    expect(response.payload).toContain('100010')
    expect(response.payload).toContain('15 December 2026')
    expect(response.payload).toContain('govuk-tag--blue">Pending')
    expect(response.payload).toContain('id="select-all" data-todo')
    expect(response.payload).not.toContain('Scheme Ltd')
    expect(response.payload).not.toContain('Concluded Producer Ltd')
    expect(response.payload).not.toContain('Welsh Producer Ltd')
  })

  it('shows the number of unassigned cases', async () => {
    // Arrange
    getMockServer().use(
      http.get(`${config.get('caseManagementApi.baseUrl')}/cases`, () =>
        HttpResponse.json({
          items: [],
          totalCount: 244,
          page: 1,
          pageSize: 100
        })
      )
    )

    // Act
    const response = await app.get('/cases')

    // Assert
    expect(response.payload).toContain('Unassigned (244)')
    expect(response.payload).toContain(
      '<strong>244</strong>\n        unassigned cases\n'
    )
  })

  it('lists every unassigned case when there are more than fit on one Case Management page', async () => {
    // Arrange
    givenCases(
      Array.from({ length: 244 }, (_, index) => ({
        id: randomUUID(),
        caseType: 'CSoC',
        stateId: 'SUBMITTED',
        isTerminal: false,
        submittedAt: '2026-12-15T10:30:00.000Z',
        nation: 'ENGLAND',
        orgId: String(100001 + index),
        assignedToId: null,
        producerType: 'DIRECT_PRODUCER',
        displayData: {
          organisationName: {
            value: `Producer ${String(index + 1).padStart(3, '0')} Ltd`,
            type: 'string'
          }
        }
      }))
    )

    // Act
    const response = await app.get('/cases')

    // Assert
    expect(response.payload).toContain('Unassigned (244)')
    expect(response.payload).toContain('Producer 001 Ltd')
    expect(response.payload).toContain('Producer 100 Ltd')
    expect(response.payload).toContain('Producer 101 Ltd')
    expect(response.payload).toContain('Producer 244 Ltd')
  })

  it('says there are no unassigned cases when there are none', async () => {
    // Arrange
    givenCases([])

    // Act
    const response = await app.get('/cases')

    // Assert
    expect(response.payload).toContain('Unassigned (0)')
    expect(response.payload).toContain('There are no unassigned cases.')
  })

  it('shows no cases on the other direct producer tabs', async () => {
    // Arrange
    givenCases([])

    // Act
    const response = await app.get('/cases?type=direct-producers&tab=completed')

    // Assert
    expect(response.payload).toContain('Assigned to me (0)')
    expect(response.payload).toContain('Assigned to team (0)')
    expect(response.payload).toContain('aria-current="page">Completed (0)')
    expect(response.payload).toContain('There are no completed cases.')
  })

  it('shows no cases for compliance schemes', async () => {
    // Arrange
    givenCases([
      {
        id: randomUUID(),
        caseType: 'CSoC',
        stateId: 'SUBMITTED',
        isTerminal: false,
        submittedAt: '2026-12-15T10:30:00.000Z',
        nation: 'ENGLAND',
        orgId: '100010',
        assignedToId: null,
        producerType: 'DIRECT_PRODUCER',
        displayData: {
          organisationName: {
            value: 'Unassigned Producer Ltd',
            type: 'string'
          }
        }
      }
    ])

    // Act
    const response = await app.get('/cases?type=compliance-schemes')

    // Assert
    expect(response.payload).toContain('aria-current="page">Unassigned (0)')
    expect(response.payload).toContain('Assigned to me (0)')
    expect(response.payload).toContain('Assigned to team (0)')
    expect(response.payload).toContain('Completed (0)')
    expect(response.payload).toContain('There are no unassigned cases.')
  })
})
