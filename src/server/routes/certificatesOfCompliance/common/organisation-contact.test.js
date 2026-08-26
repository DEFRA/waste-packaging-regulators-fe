import { describe, expect, test } from 'vitest'
import {
  mapOrganisationContact,
  mapPrimaryContactPerson
} from './organisation-contact.js'

const approvedPerson = {
  firstName: 'Nadia',
  lastName: 'Clarke',
  email: 'nadia.clarke@example.test',
  telephoneNumber: '020 7946 0103',
  serviceRole: 'Approved Person'
}

const delegatedPerson = {
  firstName: 'Aled',
  lastName: 'Bevan',
  email: 'aled.bevan@example.test',
  telephoneNumber: '020 7946 0203',
  serviceRole: 'Delegated Person'
}

const basicUser = {
  firstName: 'Sam',
  lastName: 'Reed',
  email: 'sam.reed@example.test',
  telephoneNumber: '020 7946 1111',
  serviceRole: 'Basic User'
}

const noContact = { email: null, telephoneNumber: null }

describe('mapPrimaryContactPerson', () => {
  test('maps the Approved Person name and email for cancellation recipients', () => {
    expect(
      mapPrimaryContactPerson({ persons: [basicUser, approvedPerson] })
    ).toEqual({
      firstName: 'Nadia',
      lastName: 'Clarke',
      email: 'nadia.clarke@example.test'
    })
  })

  test('returns null when no Approved Person is enrolled', () => {
    expect(
      mapPrimaryContactPerson({ persons: [basicUser, delegatedPerson] })
    ).toBeNull()
  })

  test('returns null when the Approved Person is missing a name', () => {
    expect(
      mapPrimaryContactPerson({
        persons: [
          {
            email: 'approved@example.test',
            serviceRole: 'Approved Person'
          }
        ]
      })
    ).toBeNull()
  })
})

describe('mapOrganisationContact', () => {
  test('maps the Approved Person email and telephone number', () => {
    expect(
      mapOrganisationContact({ persons: [basicUser, approvedPerson] })
    ).toEqual({
      email: 'nadia.clarke@example.test',
      telephoneNumber: '020 7946 0103'
    })
  })

  test('prefers the Approved Person over the Delegated Person regardless of order', () => {
    expect(
      mapOrganisationContact({ persons: [delegatedPerson, approvedPerson] })
    ).toEqual({
      email: 'nadia.clarke@example.test',
      telephoneNumber: '020 7946 0103'
    })
  })

  test('falls back to the Delegated Person when there is no Approved Person', () => {
    expect(
      mapOrganisationContact({ persons: [basicUser, delegatedPerson] })
    ).toEqual({
      email: 'aled.bevan@example.test',
      telephoneNumber: '020 7946 0203'
    })
  })

  test('returns nulls when nobody holds a nominated contact role', () => {
    expect(mapOrganisationContact({ persons: [basicUser] })).toEqual(noContact)
  })

  test('returns nulls for a contact missing email and telephone', () => {
    expect(
      mapOrganisationContact({ persons: [{ serviceRole: 'Approved Person' }] })
    ).toEqual(noContact)
  })

  test.each([
    [null],
    [undefined],
    [{}],
    [{ persons: null }],
    [{ persons: [] }]
  ])('returns nulls for %s', (organisationWithPersons) => {
    expect(mapOrganisationContact(organisationWithPersons)).toEqual(noContact)
  })
})
