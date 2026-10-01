import { describe, expect, test } from 'vitest'

import { COMPLIANCE_SCHEME, DIRECT_PRODUCER } from '#mocks/identities.js'
import { mockObligationsAllMet } from './obligation-data.js'
import { UNKNOWN_ORGANISATION } from '#server/routes/certificatesOfCompliance/common/constants.js'
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

  test('returns scheme operator name for compliance schemes', () => {
    expect(
      unsubmittedOrganisationName({
        registrationType: COMPLIANCE_SCHEME,
        schemeOperatorName: 'Operator Co',
        complianceSchemeName: 'Scheme Ltd'
      })
    ).toBe('Operator Co')
  })

  test('returns unknown organisation when compliance scheme operator name is blank', () => {
    expect(
      unsubmittedOrganisationName({
        registrationType: COMPLIANCE_SCHEME,
        schemeOperatorName: null,
        complianceSchemeName: 'Scheme Ltd'
      })
    ).toBe(UNKNOWN_ORGANISATION)
  })
})

describe('toUnsubmittedOrganisation', () => {
  test('materialises trading name and reference number on the row', () => {
    expect(
      toUnsubmittedOrganisation({
        organisationId: 'org-cs',
        registrationType: COMPLIANCE_SCHEME,
        schemeOperatorName: 'Operator Co',
        organisationReferenceNumber: '110987',
        obligations: []
      })
    ).toEqual(
      expect.objectContaining({
        organisationId: 'org-cs',
        name: 'Operator Co',
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
