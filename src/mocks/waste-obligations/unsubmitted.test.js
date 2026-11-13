import { describe, expect, test } from 'vitest'

import { COMPLIANCE_SCHEME, DIRECT_PRODUCER } from '#mocks/identities.js'
import { mockObligationsAllMet } from './obligation-data.js'
import { listOrganisationName } from './declaration.js'
import {
  unsubmittedOrganisationName,
  toUnsubmittedOrganisation
} from './unsubmitted.js'

describe('unsubmittedOrganisationName', () => {
  test('returns organisation name for direct producers', () => {
    expect(
      unsubmittedOrganisationName({
        registrationType: DIRECT_PRODUCER,
        organisationName: 'Producer Ltd'
      })
    ).toBe('Producer Ltd')
  })

  test('returns compliance scheme name for compliance schemes', () => {
    expect(
      unsubmittedOrganisationName({
        registrationType: COMPLIANCE_SCHEME,
        schemeOperatorName: 'Operator Co',
        complianceSchemeName: 'Scheme Ltd'
      })
    ).toBe('Scheme Ltd')
  })

  test('falls back to organisationName when compliance scheme name is blank', () => {
    expect(
      unsubmittedOrganisationName({
        registrationType: COMPLIANCE_SCHEME,
        schemeOperatorName: null,
        organisationName: 'Scheme Ltd'
      })
    ).toBe('Scheme Ltd')
  })

  test('returns null when compliance scheme name fields are blank', () => {
    expect(
      unsubmittedOrganisationName({
        registrationType: COMPLIANCE_SCHEME,
        complianceSchemeName: null,
        organisationName: null,
        schemeOperatorName: 'Operator Co'
      })
    ).toBeNull()
  })

  test('matches listOrganisationName for compliance schemes', () => {
    const record = {
      registrationType: COMPLIANCE_SCHEME,
      complianceSchemeName: '   ',
      organisationName: 'Scheme Ltd',
      schemeOperatorName: 'Operator Co'
    }
    expect(unsubmittedOrganisationName(record)).toBe(
      listOrganisationName(record)
    )
    expect(listOrganisationName(record)).toBe('Scheme Ltd')
  })
})

describe('toUnsubmittedOrganisation', () => {
  test('materialises scheme name and reference number on the row', () => {
    expect(
      toUnsubmittedOrganisation({
        organisationId: 'org-cs',
        registrationType: COMPLIANCE_SCHEME,
        complianceSchemeName: 'Scheme Co',
        schemeOperatorName: 'Operator Co',
        organisationReferenceNumber: '110987',
        obligations: []
      })
    ).toEqual(
      expect.objectContaining({
        organisationId: 'org-cs',
        name: 'Scheme Co',
        referenceNumber: '110987',
        recyclingObligationsMet: null,
        obligationCoveragePercentage: null
      })
    )
  })

  test('derives obligation metrics when obligations are present', () => {
    expect(
      toUnsubmittedOrganisation({
        organisationId: 'org-dp',
        registrationType: DIRECT_PRODUCER,
        organisationName: 'Producer Ltd',
        organisationReferenceNumber: '100001',
        obligations: mockObligationsAllMet
      })
    ).toEqual(
      expect.objectContaining({
        name: 'Producer Ltd',
        recyclingObligationsMet: true,
        obligationCoveragePercentage: 100
      })
    )
  })
})
