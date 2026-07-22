import { describe, expect, test } from 'vitest'
import {
  deriveRegistrationType,
  mapCompaniesHouseNumberFromWasteOrganisation,
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

  test('mapWasteOrganisationToDetailFields uses tradingName for compliance schemes', () => {
    expect(
      mapWasteOrganisationToDetailFields(
        {
          name: 'Legal Name',
          tradingName: 'Trading Scheme Co',
          companiesHouseNumber: '87654321',
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
      companyName: 'Trading Scheme Co',
      registrationType: 'ComplianceScheme',
      organisationType: 'Compliance scheme',
      companiesHouseNumber: '87654321'
    })
  })
})
