import { vi } from 'vitest'

/**
 * Stub GOV.UK Notify preview response for unit/controller tests.
 * Uses only personalisation placeholders — not real template copy — so tests
 * stay stable when Notify template wording changes.
 */
export function buildStubNotifyPreviewResponse(
  personalisation,
  formatEmailBodyAsHtml
) {
  const { firstName, lastName, regulatorEmail, year, certOrStatement } =
    personalisation

  return {
    subject: `Preview subject for ${certOrStatement ?? 'certificate'} ${year ?? ''}`,
    body: formatEmailBodyAsHtml(
      [
        `Dear ${firstName} ${lastName}`,
        '',
        '# Preview section',
        '',
        `Regulator contact: ${regulatorEmail}.`
      ].join('\r\n')
    )
  }
}

export async function createCancellationEmailNotifyModuleMock(importOriginal) {
  const actual = await importOriginal()

  return {
    ...actual,
    previewCancellationTemplate: vi.fn(async (_templateId, personalisation) =>
      buildStubNotifyPreviewResponse(
        personalisation,
        actual.formatEmailBodyAsHtml
      )
    )
  }
}
