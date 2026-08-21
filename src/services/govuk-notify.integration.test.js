import { describe, expect, test } from 'vitest'

import { cancellationEmailTemplateIds } from '#server/routes/certificatesOfCompliance/cancel/cancellation-email-templates.js'
import { previewCancellationTemplate } from '#services/govuk-notify.service.js'

const notifyApiKey = process.env.GOVUKNOTIFY_API_KEY?.trim()
const samplePersonalisation = {
  year: 2027,
  regulator: 'Environment Agency',
  regulatorEmail: 'packagingproducers@environment-agency.gov.uk',
  certOrStatement: 'certificate',
  certOrStatement_cy: 'tystysgrif',
  regulator_cy: 'Asiantaeth yr Amgylchedd',
  firstName: 'Preview',
  lastName: 'Recipient'
}

describe.skipIf(!notifyApiKey)(
  'govuk-notify cancellation template preview (integration)',
  () => {
    test.each([
      [
        'producer requested (English)',
        cancellationEmailTemplateIds.producerRequested.en
      ],
      [
        'not signed by correct person (English)',
        cancellationEmailTemplateIds.notSignedByCorrectPerson.en
      ]
    ])('renders live Notify preview for %s', async (_label, templateId) => {
      const preview = await previewCancellationTemplate(
        templateId,
        samplePersonalisation
      )

      expect(preview.subject.trim()).not.toBe('')
      expect(preview.body.trim()).not.toBe('')
      expect(preview.body).toContain('Preview')
      expect(preview.body).toContain('Recipient')
      expect(preview.body).toContain('31 January 2027')
    })
  }
)
