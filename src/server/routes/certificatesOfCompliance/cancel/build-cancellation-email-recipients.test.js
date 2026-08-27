import { describe, expect, test, vi, beforeEach } from 'vitest'

vi.mock('#services/account-api.service.js', () => ({
  createAccountApiService: vi.fn()
}))

import { createAccountApiService } from '#services/account-api.service.js'
import { buildCancellationEmailRecipients } from './build-cancellation-email-recipients.js'

const organisationId = '497f6eca-6276-4993-bfeb-53cbbbba6f08'

const submittedAudit = {
  action: 'Submitted',
  user: {
    id: 'e72be574-8b5b-4836-af47-dd7e0c0d1d87',
    email: 'submitter@email.com',
    name: 'Submitter Name'
  }
}

const declaration = {
  audit: [submittedAudit]
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
      firstName: 'Primary',
      lastName: 'Contact',
      email: 'primary.contact@email.com',
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

describe('buildCancellationEmailRecipients', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    createAccountApiService.mockReturnValue({
      getOrganisationWithPersonsOrNull: vi.fn()
    })
  })

  test('returns submitter and primary contact when they differ', async () => {
    createAccountApiService.mockReturnValue({
      getOrganisationWithPersonsOrNull: vi
        .fn()
        .mockResolvedValue(organisationWithBothRecipients)
    })

    const recipients = await buildCancellationEmailRecipients(
      declaration,
      organisationId,
      'trace-recipients'
    )

    expect(recipients).toHaveLength(2)
    expect(recipients.map((recipient) => recipient.email)).toEqual([
      'approved-person@email.com',
      'submitter@email.com'
    ])
  })

  test('returns one recipient when submitter is the primary contact', async () => {
    createAccountApiService.mockReturnValue({
      getOrganisationWithPersonsOrNull: vi
        .fn()
        .mockResolvedValue(organisationSubmitterMatchesApprovedPerson)
    })

    const recipients = await buildCancellationEmailRecipients(
      declaration,
      organisationId,
      'trace-recipients'
    )

    expect(recipients).toHaveLength(1)
    expect(recipients[0].email).toBe('submitter@email.com')
  })

  test('returns submitter only when primary contact is missing', async () => {
    createAccountApiService.mockReturnValue({
      getOrganisationWithPersonsOrNull: vi
        .fn()
        .mockResolvedValue({ persons: [] })
    })

    const recipients = await buildCancellationEmailRecipients(
      declaration,
      organisationId,
      'trace-recipients'
    )

    expect(recipients).toHaveLength(1)
    expect(recipients[0]).toEqual({
      firstName: 'Submitter',
      lastName: 'Name',
      email: 'submitter@email.com'
    })
  })

  test('splits the audit display name when submitter is not on the organisation', async () => {
    createAccountApiService.mockReturnValue({
      getOrganisationWithPersonsOrNull: vi.fn().mockResolvedValue(null)
    })

    const recipients = await buildCancellationEmailRecipients(
      declaration,
      organisationId,
      'trace-recipients'
    )

    expect(recipients).toHaveLength(1)
    expect(recipients[0]).toEqual({
      firstName: 'Submitter',
      lastName: 'Name',
      email: 'submitter@email.com'
    })
  })

  test('excludes primary contact when Approved Person has email but no name', async () => {
    createAccountApiService.mockReturnValue({
      getOrganisationWithPersonsOrNull: vi.fn().mockResolvedValue({
        persons: [
          {
            email: 'approved-person@email.com',
            serviceRole: 'Approved Person'
          }
        ]
      })
    })

    const recipients = await buildCancellationEmailRecipients(
      declaration,
      organisationId,
      'trace-recipients'
    )

    expect(recipients).toHaveLength(1)
    expect(recipients[0].email).toBe('submitter@email.com')
  })
})
