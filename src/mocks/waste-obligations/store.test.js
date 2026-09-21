import { MOCK_STATUS_SUBMITTED } from '#mocks/identities.js'
import { defaultObligations } from './obligation-data.js'
import { createObligationsStore } from './store.js'

function makeRecord(overrides = {}) {
  return {
    declarationId: 'dec-1',
    organisationId: 'org-1',
    organisationName: 'Test Org',
    organisationReferenceNumber: '100001',
    registrationType: 'DirectProducer',
    declarationStatus: MOCK_STATUS_SUBMITTED,
    submissionStatus: 'pending',
    created: '2027-01-31T00:00:00Z',
    updated: '2027-01-31T00:00:00Z',
    obligations: defaultObligations,
    ...overrides
  }
}

describe('createObligationsStore queryDeclarations country filter', () => {
  test('filters declarations when country param is provided', () => {
    const store = createObligationsStore([
      makeRecord({ declarationId: 'dec-eng', businessCountry: 'GB-ENG' }),
      makeRecord({
        declarationId: 'dec-wls',
        organisationId: 'org-2',
        businessCountry: 'GB-WLS'
      })
    ])

    const result = store.queryDeclarations(
      new URLSearchParams({ status: 'Submitted', country: 'GB-WLS' })
    )

    expect(result.total).toBe(1)
    expect(result.complianceDeclarations[0].id).toBe('dec-wls')
  })

  test('defaults missing businessCountry to GB-ENG when filtering', () => {
    const store = createObligationsStore([
      makeRecord({ declarationId: 'dec-default' })
    ])

    const result = store.queryDeclarations(
      new URLSearchParams({ status: 'Submitted', country: 'GB-ENG' })
    )

    expect(result.total).toBe(1)
    expect(result.complianceDeclarations[0].id).toBe('dec-default')
  })
})

describe('createObligationsStore queryUnsubmitted country filter', () => {
  test('filters unsubmitted organisations when country param is provided', () => {
    const store = createObligationsStore([
      makeRecord({
        declarationId: null,
        submissionStatus: 'not-submitted',
        declarationStatus: undefined
      })
    ])

    const matching = store.queryUnsubmitted(
      new URLSearchParams({ country: 'GB-ENG' })
    )
    const nonMatching = store.queryUnsubmitted(
      new URLSearchParams({ country: 'GB-WLS' })
    )

    expect(matching.total).toBe(1)
    expect(nonMatching.total).toBe(0)
  })
})
