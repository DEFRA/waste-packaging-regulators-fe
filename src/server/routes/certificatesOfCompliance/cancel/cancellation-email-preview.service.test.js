import { describe, expect, test, vi, afterEach } from 'vitest'

vi.mock('#services/govuk-notify.service.js', async (importOriginal) => {
  const { createCancellationEmailNotifyModuleMock } =
    await import('#test-helpers/cancellation-email-notify.mock.js')
  return createCancellationEmailNotifyModuleMock(importOriginal)
})

import { previewCancellationTemplate } from '#services/govuk-notify.service.js'
import {
  mockComplianceSchemePendingItems,
  mockPendingItems
} from '../certificates-of-compliance.mock.js'
import * as complianceMock from '../certificates-of-compliance.mock.js'
import { cancellationEmailTemplateIds } from './cancellation-email-templates.js'
import * as cancellationEmailTemplates from './cancellation-email-templates.js'
import {
  buildCancellationEmailPersonalisation,
  buildCancellationEmailPreview,
  dedupeRecipientsByEmail
} from './cancellation-email-preview.service.js'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('cancellation-email-preview.service helpers', () => {
  test('dedupes recipients by email case-insensitively and sorts by email', () => {
    const recipients = dedupeRecipientsByEmail([
      { firstName: 'Second', lastName: 'Person', email: 'zeta@example.test' },
      { firstName: 'First', lastName: 'Person', email: 'Alpha@example.test' },
      {
        firstName: 'Duplicate',
        lastName: 'Person',
        email: 'alpha@example.test'
      },
      { firstName: 'Missing', lastName: 'Email', email: '   ' }
    ])

    expect(recipients).toEqual([
      { firstName: 'First', lastName: 'Person', email: 'Alpha@example.test' },
      { firstName: 'Second', lastName: 'Person', email: 'zeta@example.test' }
    ])
  })

  test('builds personalisation from declaration data and first recipient', () => {
    const personalisation = buildCancellationEmailPersonalisation(
      {
        obligationYear: 2026,
        organisation: {
          regulator: 'EA',
          regulatorEmail: 'ea@environment-agency.gov.uk'
        }
      },
      {
        certOrStatement: 'certificate',
        certOrStatement_cy: 'tystysgrif',
        regulator_cy: 'Asiantaeth yr Amgylchedd'
      },
      {
        firstName: 'Catherine',
        lastName: 'Morris',
        email: 'catherine.morris@howco.test'
      }
    )

    expect(personalisation).toEqual({
      year: 2027,
      regulator: 'EA',
      regulatorEmail: 'ea@environment-agency.gov.uk',
      certOrStatement: 'certificate',
      certOrStatement_cy: 'tystysgrif',
      regulator_cy: 'Asiantaeth yr Amgylchedd',
      firstName: 'Catherine',
      lastName: 'Morris'
    })
  })
  test('builds personalisation for a compliance scheme statement', () => {
    const personalisation = buildCancellationEmailPersonalisation(
      {
        obligationYear: 2026,
        organisation: {
          regulator: 'EA',
          regulatorEmail: 'ea@environment-agency.gov.uk'
        }
      },
      {
        certOrStatement: 'statement',
        certOrStatement_cy: 'datganiad',
        regulator_cy: 'Asiantaeth yr Amgylchedd'
      },
      {
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane.doe@ecopack.co.uk'
      }
    )

    expect(personalisation.certOrStatement).toBe('statement')
    expect(personalisation.firstName).toBe('Jane')
    expect(personalisation.lastName).toBe('Doe')
  })
})

describe('buildCancellationEmailPreview', () => {
  test.each([
    {
      organisationType: 'direct producer',
      item: mockPendingItems[0],
      toAddresses: ['catherine.morris@howco.test', 'james.wright@howco.test'],
      firstName: 'Catherine',
      lastName: 'Morris',
      certOrStatement: 'certificate'
    },
    {
      organisationType: 'compliance scheme',
      item: mockComplianceSchemePendingItems[0],
      toAddresses: ['jane.doe@ecopack.co.uk'],
      firstName: 'Jane',
      lastName: 'Doe',
      certOrStatement: 'statement'
    }
  ])(
    'wires recipients, template id and personalisation for a $organisationType',
    async ({ item, toAddresses, firstName, lastName, certOrStatement }) => {
      const preview = await buildCancellationEmailPreview({
        organisationId: item.organisationId,
        id: item.id,
        reasonKey: 'producer-request',
        traceId: 'trace-preview'
      })

      expect(preview.error).toBeUndefined()
      expect(preview.toAddresses).toEqual(toAddresses)
      expect(preview.subject).toBeTruthy()
      expect(preview.body).toContain(firstName)
      expect(preview.body).toContain(lastName)
      expect(preview.body).toContain('ea@environment-agency.gov.uk')
      expect(preview.body).toContain('<h2>Preview section</h2>')

      expect(previewCancellationTemplate).toHaveBeenCalledWith(
        cancellationEmailTemplateIds.producerRequested.en,
        expect.objectContaining({
          year: 2027,
          firstName,
          lastName,
          regulatorEmail: 'ea@environment-agency.gov.uk',
          certOrStatement
        })
      )
    }
  )

  test('returns declaration-not-found when the declaration is missing', async () => {
    vi.spyOn(complianceMock, 'getMockDetailDataById').mockReturnValue(null)

    const preview = await buildCancellationEmailPreview({
      organisationId: mockPendingItems[0].organisationId,
      id: mockPendingItems[0].id,
      reasonKey: 'producer-request',
      traceId: 'trace-preview'
    })

    expect(preview).toEqual({ error: 'declaration-not-found' })
  })

  test('returns invalid-reason when the reason key is not recognised', async () => {
    const preview = await buildCancellationEmailPreview({
      organisationId: mockPendingItems[0].organisationId,
      id: mockPendingItems[0].id,
      reasonKey: 'not-a-valid-reason',
      traceId: 'trace-preview'
    })

    expect(preview).toEqual({ error: 'invalid-reason' })
  })

  test('returns no-recipients when the organisation has no enrolled emails', async () => {
    vi.spyOn(complianceMock, 'getMockPersonEmails').mockReturnValue([])

    const preview = await buildCancellationEmailPreview({
      organisationId: mockPendingItems[0].organisationId,
      id: mockPendingItems[0].id,
      reasonKey: 'producer-request',
      traceId: 'trace-preview'
    })

    expect(preview).toEqual({ error: 'no-recipients' })
  })

  test('returns unknown-template when no Notify template matches the reason', async () => {
    vi.spyOn(
      cancellationEmailTemplates,
      'resolveCancellationTemplateId'
    ).mockReturnValue(null)

    const preview = await buildCancellationEmailPreview({
      organisationId: mockPendingItems[0].organisationId,
      id: mockPendingItems[0].id,
      reasonKey: 'producer-request',
      traceId: 'trace-preview'
    })

    expect(preview).toEqual({ error: 'unknown-template' })
  })

  test('returns notify-not-configured when GOV.UK Notify is unavailable', async () => {
    previewCancellationTemplate.mockRejectedValueOnce(
      Object.assign(new Error('GOV.UK Notify API key is not configured'), {
        code: 'notify-not-configured'
      })
    )

    const preview = await buildCancellationEmailPreview({
      organisationId: mockPendingItems[0].organisationId,
      id: mockPendingItems[0].id,
      reasonKey: 'producer-request',
      traceId: 'trace-preview'
    })

    expect(preview).toEqual({ error: 'notify-not-configured' })
  })

  test('rethrows unexpected Notify preview errors', async () => {
    previewCancellationTemplate.mockRejectedValueOnce(
      new Error('Notify failed')
    )

    await expect(
      buildCancellationEmailPreview({
        organisationId: mockPendingItems[0].organisationId,
        id: mockPendingItems[0].id,
        reasonKey: 'producer-request',
        traceId: 'trace-preview'
      })
    ).rejects.toThrow('Notify failed')
  })
})
