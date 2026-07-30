import { describe, expect, test } from 'vitest'
import {
  deriveRegistrationType,
  mapCompaniesHouseNumberFromWasteOrganisation,
  mapRegistrationTypeToOrganisationType,
  mapWasteOrganisationToDetailFields
} from './registration-type.js'
import { findSubmittedAuditUser } from '../detail/audit.js'
import { mockSubmittedAuditEntry } from '../certificates-of-compliance.mock.js'

describe('organisation and audit detail mapping', () => {
  test('deriveRegistrationType maps LARGE_PRODUCER to DirectProducer for obligation year', () => {
    expect(
      deriveRegistrationType(
        [
          {
            type: 'LARGE_PRODUCER',
            status: 'REGISTERED',
            registrationYear: 2026
          }
        ],
        2026
      )
    ).toBe('DirectProducer')
  })

  test('deriveRegistrationType maps COMPLIANCE_SCHEME to ComplianceScheme', () => {
    expect(
      deriveRegistrationType(
        [
          {
            type: 'COMPLIANCE_SCHEME',
            status: 'REGISTERED',
            registrationYear: 2026
          }
        ],
        2026
      )
    ).toBe('ComplianceScheme')
  })

  test('deriveRegistrationType returns null for empty registrations', () => {
    expect(deriveRegistrationType([], 2026)).toBeNull()
    expect(deriveRegistrationType(undefined, 2026)).toBeNull()
  })

  test('deriveRegistrationType falls back to latest year when no registrations match the obligation year', () => {
    // registrations are for 2024, obligation year is 2026 → forYear pool is
    // empty, selectFromPool([]) returns null, then falls through to latest year
    expect(
      deriveRegistrationType(
        [
          {
            type: 'LARGE_PRODUCER',
            status: 'REGISTERED',
            registrationYear: 2024
          }
        ],
        2026
      )
    ).toBe('DirectProducer')
  })

  test('deriveRegistrationType selects most recently updated when candidates lack an updated field', () => {
    // One candidate has no updated field — its bestTime falls back to 0
    expect(
      deriveRegistrationType(
        [
          {
            type: 'SMALL_PRODUCER',
            status: 'REGISTERED',
            registrationYear: 2026
          },
          {
            type: 'LARGE_PRODUCER',
            status: 'REGISTERED',
            registrationYear: 2026,
            updated: '2026-01-01T00:00:00Z'
          }
        ],
        2026
      )
    ).toBe('DirectProducer')
  })

  describe('mapRegistrationTypeToOrganisationType', () => {
    test.each([
      ['DirectProducer', 'Direct producer'],
      ['ComplianceScheme', 'Compliance scheme']
    ])('maps %s to its display name', (registrationType, expected) => {
      expect(mapRegistrationTypeToOrganisationType(registrationType)).toBe(
        expected
      )
    })

    test.each([[null], [undefined], ['']])(
      'returns No data for %s',
      (registrationType) => {
        expect(mapRegistrationTypeToOrganisationType(registrationType)).toBe(
          'No data'
        )
      }
    )

    // An unmapped type falls back to the raw value rather than hiding it — a
    // regulator seeing "Exporter" is better served than one seeing "No data".
    test('falls back to the raw value for an unmapped registration type', () => {
      expect(mapRegistrationTypeToOrganisationType('Exporter')).toBe('Exporter')
    })

    // Without an own-property check this resolves to Object's constructor.
    test('falls back to the raw value for an inherited property name', () => {
      expect(mapRegistrationTypeToOrganisationType('constructor')).toBe(
        'constructor'
      )
    })
  })

  test('mapWasteOrganisationToDetailFields returns No data organisationType when no registration type can be determined', () => {
    expect(
      mapWasteOrganisationToDetailFields({
        name: 'Unknown Org',
        companiesHouseNumber: '12345678',
        registrations: []
      })
    ).toMatchObject({
      registrationType: null,
      organisationType: 'No data'
    })
  })

  test('mapWasteOrganisationToDetailFields returns null fields when organisation is null', () => {
    expect(mapWasteOrganisationToDetailFields(null)).toEqual({
      companyName: null,
      registrationType: null,
      organisationType: 'No data',
      companiesHouseNumber: 'No data'
    })
  })

  test('findSubmittedAuditUser returns user from Submitted audit entry', () => {
    expect(findSubmittedAuditUser([mockSubmittedAuditEntry])).toEqual(
      mockSubmittedAuditEntry.user
    )
  })

  test('findSubmittedAuditUser returns null when no Submitted entry exists', () => {
    expect(findSubmittedAuditUser([])).toBeNull()
    expect(
      findSubmittedAuditUser([{ action: 'Accepted', user: { name: 'Other' } }])
    ).toBeNull()
  })

  test('mapCompaniesHouseNumberFromWasteOrganisation maps companies house number', () => {
    expect(
      mapCompaniesHouseNumberFromWasteOrganisation({
        companiesHouseNumber: '17121895'
      })
    ).toBe('17121895')
    expect(mapCompaniesHouseNumberFromWasteOrganisation(null)).toBe('No data')
    expect(
      mapCompaniesHouseNumberFromWasteOrganisation({
        companiesHouseNumber: null
      })
    ).toBe('No data')
  })

  test('mapWasteOrganisationToDetailFields maps companies house and derived type', () => {
    expect(
      mapWasteOrganisationToDetailFields(
        {
          name: 'POP QUEST LTD',
          companiesHouseNumber: '17121895',
          registrations: [
            {
              type: 'LARGE_PRODUCER',
              status: 'REGISTERED',
              registrationYear: 2026
            }
          ]
        },
        { obligationYear: 2026 }
      )
    ).toEqual({
      companyName: 'POP QUEST LTD',
      registrationType: 'DirectProducer',
      organisationType: 'Direct producer',
      companiesHouseNumber: '17121895'
    })
  })

  test('mapWasteOrganisationToDetailFields uses the scheme operator name, not the scheme trading name, for compliance schemes', () => {
    expect(
      mapWasteOrganisationToDetailFields(
        {
          name: 'Scheme Operator Co',
          tradingName: 'Trading Scheme Co',
          companiesHouseNumber: 'CS_GENERATED_0923795',
          registrations: [
            {
              type: 'COMPLIANCE_SCHEME',
              status: 'REGISTERED',
              registrationYear: 2026
            }
          ]
        },
        { obligationYear: 2026 }
      )
    ).toEqual({
      companyName: 'Scheme Operator Co',
      registrationType: 'ComplianceScheme',
      organisationType: 'Compliance scheme',
      companiesHouseNumber: 'CS_GENERATED_0923795'
    })
  })
})
