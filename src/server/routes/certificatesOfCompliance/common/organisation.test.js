import { describe, expect, test } from 'vitest'

import {
  UNKNOWN_ORGANISATION,
  wasteOrganisationsRegistrationStatus,
  wasteOrganisationsRegistrationType
} from './constants.js'
import { formatOrganisationName, mapOrganisationName } from './organisation.js'

describe('formatOrganisationName', () => {
  test('returns organisation name for large producer', () => {
    expect(
      formatOrganisationName(
        {
          name: 'Direct Producer Ltd',
          registrations: [
            {
              type: wasteOrganisationsRegistrationType.LARGE_PRODUCER,
              status: wasteOrganisationsRegistrationStatus.REGISTERED,
              registrationYear: 2026,
              updated: '2026-05-18T11:20:00Z'
            }
          ]
        },
        2026
      )
    ).toBe('Direct Producer Ltd')
  })

  test('returns trading name for compliance scheme', () => {
    expect(
      formatOrganisationName(
        {
          name: 'Scheme Parent Ltd',
          tradingName: 'Scheme Trading Name',
          registrations: [
            {
              type: wasteOrganisationsRegistrationType.COMPLIANCE_SCHEME,
              status: wasteOrganisationsRegistrationStatus.REGISTERED,
              registrationYear: 2026,
              updated: '2026-05-18T11:20:00Z'
            }
          ]
        },
        2026
      )
    ).toBe('Scheme Trading Name')
  })

  test('falls back to organisation name when compliance scheme trading name is null', () => {
    expect(
      formatOrganisationName(
        {
          name: 'Scheme Parent Ltd',
          tradingName: null,
          registrations: [
            {
              type: wasteOrganisationsRegistrationType.COMPLIANCE_SCHEME,
              status: wasteOrganisationsRegistrationStatus.REGISTERED,
              registrationYear: 2026,
              updated: '2026-05-18T11:20:00Z'
            }
          ]
        },
        2026
      )
    ).toBe('Scheme Parent Ltd')
  })

  test('returns organisation name for other registration types', () => {
    expect(
      formatOrganisationName(
        {
          name: 'Small Producer Ltd',
          registrations: [
            {
              type: wasteOrganisationsRegistrationType.SMALL_PRODUCER,
              status: wasteOrganisationsRegistrationStatus.REGISTERED,
              registrationYear: 2026,
              updated: '2026-05-18T11:20:00Z'
            }
          ]
        },
        2026
      )
    ).toBe('Small Producer Ltd')
  })

  test('selects the most recently updated registration for the year', () => {
    expect(
      formatOrganisationName(
        {
          name: 'Older Name Ltd',
          tradingName: 'Latest Trading Name',
          registrations: [
            {
              type: wasteOrganisationsRegistrationType.COMPLIANCE_SCHEME,
              status: wasteOrganisationsRegistrationStatus.REGISTERED,
              registrationYear: 2026,
              updated: '2026-01-01T00:00:00Z'
            },
            {
              type: wasteOrganisationsRegistrationType.COMPLIANCE_SCHEME,
              status: wasteOrganisationsRegistrationStatus.REGISTERED,
              registrationYear: 2026,
              updated: '2026-06-01T00:00:00Z'
            }
          ]
        },
        2026
      )
    ).toBe('Latest Trading Name')
  })

  test('uses the year registration when none are marked registered', () => {
    expect(
      formatOrganisationName(
        {
          name: 'Pending Producer Ltd',
          registrations: [
            {
              type: wasteOrganisationsRegistrationType.LARGE_PRODUCER,
              status: 'PENDING',
              registrationYear: 2026,
              updated: '2026-05-18T11:20:00Z'
            }
          ]
        },
        2026
      )
    ).toBe('Pending Producer Ltd')
  })

  test('returns empty string when no registration exists for the year', () => {
    expect(
      formatOrganisationName(
        {
          name: 'Example Org',
          registrations: []
        },
        2026
      )
    ).toBe('')
  })

  test('returns empty string when organisation is null', () => {
    expect(formatOrganisationName(null, 2026)).toBe('')
  })

  test('returns empty string when organisation is not an object', () => {
    expect(formatOrganisationName('Example Org', 2026)).toBe('')
  })
})

describe('mapOrganisationName', () => {
  test('returns scheme operator name for compliance schemes', () => {
    expect(
      mapOrganisationName({
        registrationType: 'ComplianceScheme',
        schemeOperatorName: 'Operator Co',
        name: 'Scheme Ltd'
      })
    ).toBe('Operator Co')
  })

  test('falls back to organisation name for compliance schemes', () => {
    expect(
      mapOrganisationName({
        registrationType: 'ComplianceScheme',
        schemeOperatorName: null,
        name: 'Scheme Ltd'
      })
    ).toBe('Scheme Ltd')
  })

  test('returns unknown organisation when compliance scheme name fields are blank', () => {
    expect(
      mapOrganisationName({
        registrationType: 'ComplianceScheme',
        schemeOperatorName: null,
        name: null
      })
    ).toBe(UNKNOWN_ORGANISATION)
  })

  test('returns organisation name for direct producers', () => {
    expect(
      mapOrganisationName({
        registrationType: 'DirectProducer',
        name: 'Producer Ltd'
      })
    ).toBe('Producer Ltd')
  })

  test('returns unknown organisation when direct producer name is missing', () => {
    expect(
      mapOrganisationName({
        registrationType: 'DirectProducer',
        name: null
      })
    ).toBe(UNKNOWN_ORGANISATION)
  })
})
