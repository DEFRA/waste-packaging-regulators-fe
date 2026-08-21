import { describe, expect, test, vi, beforeEach } from 'vitest'

vi.mock('notifications-node-client', () => ({
  NotifyClient: vi.fn()
}))

vi.mock('#config/config.js', () => ({
  config: {
    get: vi.fn()
  }
}))

import { NotifyClient } from 'notifications-node-client'
import { config } from '#config/config.js'
import {
  formatEmailBodyAsHtml,
  previewCancellationTemplate
} from './govuk-notify.service.js'

describe('govuk-notify.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('formatEmailBodyAsHtml wraps plain text paragraphs and line breaks', () => {
    expect(
      formatEmailBodyAsHtml(
        'Dear Catherine Morris\r\n\r\nYour certificate has been cancelled.\r\nContact us for help.\r\n\r\nNeed help?\r\nEmail packagingproducers@environment-agency.gov.uk'
      )
    ).toBe(
      '<p>Dear Catherine Morris</p><p>Your certificate has been cancelled.<br>Contact us for help.</p><p>Need help?<br>Email <a href="mailto:packagingproducers@environment-agency.gov.uk">packagingproducers@environment-agency.gov.uk</a></p>'
    )
  })

  test('formatEmailBodyAsHtml converts Notify markdown headings on their own lines', () => {
    expect(
      formatEmailBodyAsHtml(
        'Dear James Harris\r\n\r\nIntro paragraph.\r\n\r\n# Preview section\r\n\r\nFollow-up paragraph.\r\n\r\n# Another section\r\n\r\nContact packagingproducers@environment-agency.gov.uk.'
      )
    ).toBe(
      '<p>Dear James Harris</p><p>Intro paragraph.</p><h2>Preview section</h2><p>Follow-up paragraph.</p><h2>Another section</h2><p>Contact <a href="mailto:packagingproducers@environment-agency.gov.uk">packagingproducers@environment-agency.gov.uk</a>.</p>'
    )
  })

  test('formatEmailBodyAsHtml converts markdown headings without a space after #', () => {
    expect(formatEmailBodyAsHtml('#Need help?\r\n\r\nContact us.')).toBe(
      '<h2>Need help?</h2><p>Contact us.</p>'
    )
  })

  test('formatEmailBodyAsHtml converts markdown headings inside Notify HTML paragraphs', () => {
    expect(
      formatEmailBodyAsHtml(
        '<p>Dear Jane Doe</p><p># Preview section</p><p>Follow-up paragraph.</p><p># Another section</p><p>Contact packagingproducers@environment-agency.gov.uk.</p>'
      )
    ).toBe(
      '<p>Dear Jane Doe</p><h2>Preview section</h2><p>Follow-up paragraph.</p><h2>Another section</h2><p>Contact packagingproducers@environment-agency.gov.uk.</p>'
    )
  })

  test('formatEmailBodyAsHtml converts inline markdown links and bold text', () => {
    expect(
      formatEmailBodyAsHtml(
        'Please read the **guidance** at [GOV.UK](https://www.gov.uk/example).'
      )
    ).toBe(
      '<p>Please read the <strong>guidance</strong> at <a href="https://www.gov.uk/example">GOV.UK</a>.</p>'
    )
  })

  test('formatEmailBodyAsHtml normalises h1 tags from Notify to h2', () => {
    expect(formatEmailBodyAsHtml('<h1>Preview section</h1>')).toBe(
      '<h2>Preview section</h2>'
    )
  })

  test('throws when the GOV.UK Notify API key is unset', async () => {
    config.get.mockImplementation((key) =>
      key === 'govukNotify.apiKey' ? '' : undefined
    )

    await expect(
      previewCancellationTemplate('template-id', {
        firstName: 'Catherine',
        lastName: 'Morris'
      })
    ).rejects.toMatchObject({ code: 'notify-not-configured' })

    expect(NotifyClient).not.toHaveBeenCalled()
  })

  test('converts plain text Notify preview bodies to HTML', async () => {
    config.get.mockImplementation((key) =>
      key === 'govukNotify.apiKey' ? 'test-api-key' : ''
    )
    const previewTemplateById = vi.fn().mockResolvedValue({
      data: {
        subject: 'Preview subject',
        body: 'Dear Jane Doe\r\n\r\n# Preview section\r\n\r\nFollow-up paragraph.'
      }
    })
    NotifyClient.mockImplementation(function MockNotifyClient() {
      this.previewTemplateById = previewTemplateById
    })

    const preview = await previewCancellationTemplate('template-id', {
      firstName: 'Jane',
      lastName: 'Doe'
    })

    expect(preview.body).toBe(
      '<p>Dear Jane Doe</p><h2>Preview section</h2><p>Follow-up paragraph.</p>'
    )
  })

  test('calls GOV.UK Notify when an API key is configured', async () => {
    config.get.mockImplementation((key) =>
      key === 'govukNotify.apiKey' ? 'test-api-key' : ''
    )
    const previewTemplateById = vi.fn().mockResolvedValue({
      data: {
        subject: 'Preview subject',
        body: '<p>Preview body</p>'
      }
    })
    NotifyClient.mockImplementation(function MockNotifyClient() {
      this.previewTemplateById = previewTemplateById
    })

    const personalisation = { firstName: 'Jane', lastName: 'Doe' }
    const preview = await previewCancellationTemplate(
      'template-id',
      personalisation
    )

    expect(previewTemplateById).toHaveBeenCalledWith(
      'template-id',
      personalisation
    )
    expect(preview).toEqual({
      subject: 'Preview subject',
      body: '<p>Preview body</p>'
    })
  })
})
