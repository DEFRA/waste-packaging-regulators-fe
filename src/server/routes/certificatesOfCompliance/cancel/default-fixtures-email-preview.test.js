import { vi } from 'vitest'

vi.mock('#services/govuk-notify.service.js', async (importOriginal) => {
  const { createCancellationEmailNotifyModuleMock } =
    await import('#test-helpers/cancellation-email-notify.mock.js')
  return createCancellationEmailNotifyModuleMock(importOriginal)
})

import { statusCodes } from '#server/common/constants/status-codes.js'
import { orgs } from '#mocks/identities.js'
import { setupRegulatorsApp } from '#test-helpers/msw/harness.js'
import { loadEmailPreviewPage } from './cancel.page-object.js'

describe('default mock accepted cancellation email preview', () => {
  const app = setupRegulatorsApp()

  it('resolves recipients for a default accepted direct producer', async () => {
    const cookie = await app.signIn()
    const url = `/certificates-of-compliance/${orgs.acme.id}/certificate/decl-309145/cancel/email-preview?reason=producer-request`
    const response = await app.get(url, cookie)
    const page = loadEmailPreviewPage(response.payload)

    expect(response.statusCode).toBe(statusCodes.ok)
    expect(page.toLine).toBe('catherine.morris@acme.test, user@example.com')
    expect(page.bodyHtml).toContain('Catherine')
    expect(page.bodyHtml).toContain('Morris')
  })

  it('resolves recipients for a default accepted compliance scheme', async () => {
    const cookie = await app.signIn()
    const url = `/certificates-of-compliance/${orgs.nationwide.id}/statement/decl-cs-101/cancel/email-preview?reason=producer-request`
    const response = await app.get(url, cookie)
    const page = loadEmailPreviewPage(response.payload)

    expect(response.statusCode).toBe(statusCodes.ok)
    expect(page.toLine).toBe('jane.doe@ecopack.co.uk, jane.doe@nationwide.test')
    expect(page.bodyHtml).toContain('Jane')
    expect(page.bodyHtml).toContain('Doe')
  })
})
