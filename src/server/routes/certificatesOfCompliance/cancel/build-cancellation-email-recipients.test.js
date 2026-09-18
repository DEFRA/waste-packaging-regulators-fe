import { describe, expect, test, vi, beforeEach } from 'vitest'

vi.mock('#services/account-api.service.js', () => ({
  createAccountApiService: vi.fn()
}))

import { createAccountApiService } from '#services/account-api.service.js'
import { buildCancellationEmailRecipients } from './build-cancellation-email-recipients.js'

const wasteOrganisationId = '497f6eca-6276-4993-bfeb-53cbbbba6f08'
const accountOrganisationId = '7f706042-0000-0000-0000-000000000001'
const companiesHouseNumber = 'CS_GENERATED_4393089'

const submittedAudit = {
  action: 'Submitted',
  user: {
    id: 'e72be574-8b5b-4836-af47-dd7e0c0d1d87',
    email: 'submitter@email.com',
    name: 'Submitter Name'
  }
}

const directProducerDeclaration = {
  organisation: { registrationType: 'DirectProducer' },
  audit: [submittedAudit]
}

const complianceSchemeDeclaration = {
  organisation: { registrationType: 'ComplianceScheme' },
  audit: [submittedAudit]
}

const directProducerWasteOrganisation = {
  id: wasteOrganisationId,
  companiesHouseNumber: '12345678'
}

const complianceSchemeWasteOrganisation = {
  id: wasteOrganisationId,
  companiesHouseNumber
}

const organisationWithBothRecipients = {
  persons: [
    {
      firstName: 'Approved',
      lastName: 'Person',
      email: 'approved-person@email.com',
      serviceRole: 'Approved Person'
    },
    {
      userId: 'e72be574-8b5b-4836-af47-dd7e0c0d1d87',
      firstName: 'Submitter',
      lastName: 'Name',
      email: 'submitter@email.com',
      serviceRole: 'Delegated Person'
    }
  ]
}

const organisationSubmitterMatchesApprovedPerson = {
  persons: [
    {
      userId: 'e72be574-8b5b-4836-af47-dd7e0c0d1d87',
      firstName: 'Submitter',
      lastName: 'Name',
      email: 'submitter@email.com',
      serviceRole: 'Approved Person'
    }
  ]
}

function mockAccountApi({
  organisationWithPersons = null,
  companiesHouseMatches = []
} = {}) {
  createAccountApiService.mockReturnValue({
    getOrganisationWithPersonsOrNull: vi
      .fn()
      .mockResolvedValue(organisationWithPersons),
    getOrganisationsByCompaniesHouseNumbers: vi
      .fn()
      .mockResolvedValue(companiesHouseMatches)
  })
}

describe('buildCancellationEmailRecipients', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('returns submitter and primary contact when they differ for a direct producer', async () => {
    mockAccountApi({ organisationWithPersons: organisationWithBothRecipients })

    const recipients = await buildCancellationEmailRecipients(
      directProducerDeclaration,
      directProducerWasteOrganisation,
      'trace-recipients'
    )

    expect(recipients).toHaveLength(2)
    expect(recipients.map((recipient) => recipient.email)).toEqual([
      'approved-person@email.com',
      'submitter@email.com'
    ])
    expect(
      createAccountApiService().getOrganisationWithPersonsOrNull
    ).toHaveBeenCalledWith(wasteOrganisationId, 'trace-recipients')
  })

  test('returns one recipient when submitter is the primary contact', async () => {
    mockAccountApi({
      organisationWithPersons: organisationSubmitterMatchesApprovedPerson
    })

    const recipients = await buildCancellationEmailRecipients(
      directProducerDeclaration,
      directProducerWasteOrganisation,
      'trace-recipients'
    )

    expect(recipients).toHaveLength(1)
    expect(recipients[0].email).toBe('submitter@email.com')
  })

  test('returns primary contact only when submitter is not matched on the account organisation', async () => {
    mockAccountApi({
      organisationWithPersons: {
        persons: [
          {
            firstName: 'Approved',
            lastName: 'Person',
            email: 'approved-person@email.com',
            serviceRole: 'Approved Person'
          }
        ]
      }
    })

    const recipients = await buildCancellationEmailRecipients(
      directProducerDeclaration,
      directProducerWasteOrganisation,
      'trace-recipients'
    )

    expect(recipients).toHaveLength(1)
    expect(recipients[0].email).toBe('approved-person@email.com')
  })

  test('excludes submitter when they are not on the account organisation', async () => {
    mockAccountApi({ organisationWithPersons: null })

    const recipients = await buildCancellationEmailRecipients(
      directProducerDeclaration,
      directProducerWasteOrganisation,
      'trace-recipients'
    )

    expect(recipients).toEqual([])
  })

  test('excludes primary contact when Approved Person has email but no name', async () => {
    mockAccountApi({
      organisationWithPersons: {
        persons: [
          {
            email: 'approved-person@email.com',
            serviceRole: 'Approved Person'
          },
          {
            userId: 'e72be574-8b5b-4836-af47-dd7e0c0d1d87',
            firstName: 'Submitter',
            lastName: 'Name',
            email: 'submitter@email.com',
            serviceRole: 'Delegated Person'
          }
        ]
      }
    })

    const recipients = await buildCancellationEmailRecipients(
      directProducerDeclaration,
      directProducerWasteOrganisation,
      'trace-recipients'
    )

    expect(recipients).toHaveLength(1)
    expect(recipients[0].email).toBe('submitter@email.com')
  })

  test('resolves a compliance scheme account organisation by Companies House number', async () => {
    mockAccountApi({
      companiesHouseMatches: [
        {
          externalId: accountOrganisationId,
          companiesHouseNumber,
          isComplianceScheme: true
        }
      ],
      organisationWithPersons: organisationWithBothRecipients
    })

    const recipients = await buildCancellationEmailRecipients(
      complianceSchemeDeclaration,
      complianceSchemeWasteOrganisation,
      'trace-recipients'
    )

    expect(
      createAccountApiService().getOrganisationsByCompaniesHouseNumbers
    ).toHaveBeenCalledWith([companiesHouseNumber], 'trace-recipients')
    expect(
      createAccountApiService().getOrganisationWithPersonsOrNull
    ).toHaveBeenCalledWith(accountOrganisationId, 'trace-recipients')
    expect(recipients.map((recipient) => recipient.email)).toEqual([
      'approved-person@email.com',
      'submitter@email.com'
    ])
  })

  test('returns no recipients when a compliance scheme has no Companies House number', async () => {
    mockAccountApi()

    const recipients = await buildCancellationEmailRecipients(
      complianceSchemeDeclaration,
      { id: wasteOrganisationId, companiesHouseNumber: null },
      'trace-recipients'
    )

    expect(recipients).toEqual([])
    expect(
      createAccountApiService().getOrganisationsByCompaniesHouseNumbers
    ).not.toHaveBeenCalled()
  })

  test('returns no recipients when Companies House lookup finds no compliance scheme operator', async () => {
    mockAccountApi({ companiesHouseMatches: [] })

    const recipients = await buildCancellationEmailRecipients(
      complianceSchemeDeclaration,
      complianceSchemeWasteOrganisation,
      'trace-recipients'
    )

    expect(recipients).toEqual([])
    expect(
      createAccountApiService().getOrganisationWithPersonsOrNull
    ).not.toHaveBeenCalled()
  })

  test('returns no recipients when Companies House lookup is ambiguous', async () => {
    mockAccountApi({
      companiesHouseMatches: [
        {
          externalId: accountOrganisationId,
          companiesHouseNumber,
          isComplianceScheme: true
        },
        {
          externalId: 'another-account-id',
          companiesHouseNumber,
          isComplianceScheme: true
        }
      ]
    })

    const recipients = await buildCancellationEmailRecipients(
      complianceSchemeDeclaration,
      complianceSchemeWasteOrganisation,
      'trace-recipients'
    )

    expect(recipients).toEqual([])
    expect(
      createAccountApiService().getOrganisationWithPersonsOrNull
    ).not.toHaveBeenCalled()
  })

  test('ignores unrelated operators when Companies House lookup returns extra rows', async () => {
    mockAccountApi({
      companiesHouseMatches: [
        {
          externalId: accountOrganisationId,
          companiesHouseNumber,
          isComplianceScheme: true
        },
        {
          externalId: 'another-account-id',
          companiesHouseNumber: '99999999',
          isComplianceScheme: true
        }
      ],
      organisationWithPersons: organisationWithBothRecipients
    })

    const recipients = await buildCancellationEmailRecipients(
      complianceSchemeDeclaration,
      complianceSchemeWasteOrganisation,
      'trace-recipients'
    )

    expect(
      createAccountApiService().getOrganisationWithPersonsOrNull
    ).toHaveBeenCalledWith(accountOrganisationId, 'trace-recipients')
    expect(recipients.map((recipient) => recipient.email)).toEqual([
      'approved-person@email.com',
      'submitter@email.com'
    ])
  })
})
