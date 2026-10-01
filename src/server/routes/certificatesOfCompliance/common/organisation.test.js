import { describe, expect, test } from 'vitest'

import {
  wasteOrganisationsRegistrationStatus,
  wasteOrganisationsRegistrationType
} from './constants.js'
import { formatOrganisationName } from './organisation.js'

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
})
