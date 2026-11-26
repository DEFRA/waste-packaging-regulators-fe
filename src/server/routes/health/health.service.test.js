import { describe, it, expect, vi, beforeEach } from 'vitest'

const configValues = vi.hoisted(() => ({}))

vi.mock('#config/config.js', () => ({
  config: {
    get: vi.fn((key) => configValues[key])
  }
}))

vi.mock('#services/apiBaseClient/oauth-token.js', () => ({
  getServiceOAuthAccessToken: vi.fn()
}))

vi.mock('#services/waste-obligations-api.service.js', () => ({
  createWasteObligationsApiService: vi.fn()
}))

vi.mock('#services/waste-organisations-api.service.js', () => ({
  createWasteOrganisationsApiService: vi.fn()
}))

vi.mock('#services/govuk-notify.service.js', () => ({
  previewCancellationTemplate: vi.fn()
}))

vi.mock('#services/case-management-api.service.js', () => ({
  createCaseManagementApiService: vi.fn()
}))

import { runHealthChecks } from './health.service.js'
import { getServiceOAuthAccessToken } from '#services/apiBaseClient/oauth-token.js'
import { createWasteObligationsApiService } from '#services/waste-obligations-api.service.js'
import { createWasteOrganisationsApiService } from '#services/waste-organisations-api.service.js'
import { previewCancellationTemplate } from '#services/govuk-notify.service.js'
import { createCaseManagementApiService } from '#services/case-management-api.service.js'
import { cancellationEmailTemplateIds } from '#server/routes/certificatesOfCompliance/cancel/cancellation-email-templates.js'

describe('runHealthChecks', () => {
  let obligationsService
  let organisationsService
  let caseManagementService

  beforeEach(() => {
    Object.assign(configValues, {
      'accountApi.clientId': 'test-client-id',
      'accountApi.clientSecret': 'test-client-secret',
      'accountApi.scope': 'api://test/.default',
      'accountApi.tokenEndpoint': 'https://login.test/token',
      'caseManagement.enabled': true
    })
    obligationsService = {
      listComplianceDeclarations: vi.fn().mockResolvedValue({})
    }
    organisationsService = {
      listComplianceOrganisations: vi.fn().mockResolvedValue({})
    }
    caseManagementService = {
      listCases: vi.fn().mockResolvedValue({ items: [], totalCount: 0 })
    }
    createWasteObligationsApiService.mockReturnValue(obligationsService)
    createWasteOrganisationsApiService.mockReturnValue(organisationsService)
    createCaseManagementApiService.mockReturnValue(caseManagementService)
    getServiceOAuthAccessToken.mockResolvedValue('test-token')
    previewCancellationTemplate.mockResolvedValue({
      subject: 'Preview subject',
      body: '<p>Preview body</p>'
    })
  })

  it('returns success when all checks pass', async () => {
    const result = await runHealthChecks()

    expect(result.message).toBe('success')
    expect(result.checks['waste-obligations']).toEqual({ ok: true })
    expect(result.checks['waste-organisations']).toEqual({ ok: true })
    expect(result.checks['account-token']).toEqual({ ok: true })
    expect(result.checks['govuk-notify']).toEqual({ ok: true })
    expect(result.checks['case-management']).toEqual({ ok: true })
  })

  it('calls case management with pageSize 1 and a 5s timeout', async () => {
    await runHealthChecks()

    expect(createCaseManagementApiService).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionUser: expect.objectContaining({
          nationId: 1,
          email: 'health-check@regulator.example'
        }),
        requestTimeoutMs: 5000
      })
    )
    expect(caseManagementService.listCases).toHaveBeenCalledWith({
      caseType: 'CSoC',
      pageSize: 1
    })
  })

  it('skips the case management check when case management is disabled', async () => {
    // Arrange
    configValues['caseManagement.enabled'] = false

    // Act
    const result = await runHealthChecks()

    // Assert
    expect(result.message).toBe('success')
    expect(Object.keys(result.checks)).toEqual([
      'waste-obligations',
      'waste-organisations',
      'account-token',
      'govuk-notify'
    ])
    expect(createCaseManagementApiService).not.toHaveBeenCalled()
  })

  it('calls waste obligations with pageSize 1 and a 5s timeout', async () => {
    await runHealthChecks()

    expect(createWasteObligationsApiService).toHaveBeenCalledWith({
      requestTimeoutMs: 5000
    })
    expect(obligationsService.listComplianceDeclarations).toHaveBeenCalledWith({
      pageSize: 1
    })
  })

  it('calls waste organisations with default params and a 5s timeout', async () => {
    await runHealthChecks()

    expect(createWasteOrganisationsApiService).toHaveBeenCalledWith({
      requestTimeoutMs: 5000
    })
    expect(
      organisationsService.listComplianceOrganisations
    ).toHaveBeenCalledWith({})
  })

  it('calls getServiceOAuthAccessToken with account API config', async () => {
    await runHealthChecks()

    expect(getServiceOAuthAccessToken).toHaveBeenCalledWith({
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      scope: 'api://test/.default',
      tokenEndpoint: 'https://login.test/token'
    })
  })

  it('calls previewCancellationTemplate with expected templateId and personalisation', async () => {
    await runHealthChecks()

    expect(previewCancellationTemplate).toHaveBeenCalledWith(
      cancellationEmailTemplateIds.producerRequested.en,
      expect.objectContaining({
        firstName: 'Health',
        lastName: 'Check',
        certOrStatementBullet: expect.any(String)
      })
    )
  })

  it('returns degraded and records the error when waste obligations fails', async () => {
    obligationsService.listComplianceDeclarations.mockRejectedValue(
      new Error('Connection refused')
    )

    const result = await runHealthChecks()

    expect(result.message).toBe('degraded')
    expect(result.checks['waste-obligations']).toEqual({
      ok: false,
      error: 'Connection refused'
    })
    expect(result.checks['waste-organisations']).toEqual({ ok: true })
    expect(result.checks['account-token']).toEqual({ ok: true })
    expect(result.checks['govuk-notify']).toEqual({ ok: true })
  })

  it('returns degraded and records the error when waste organisations fails', async () => {
    organisationsService.listComplianceOrganisations.mockRejectedValue(
      new Error('timeout')
    )

    const result = await runHealthChecks()

    expect(result.message).toBe('degraded')
    expect(result.checks['waste-organisations']).toEqual({
      ok: false,
      error: 'timeout'
    })
    expect(result.checks['waste-obligations']).toEqual({ ok: true })
    expect(result.checks['account-token']).toEqual({ ok: true })
    expect(result.checks['govuk-notify']).toEqual({ ok: true })
  })

  it('returns degraded and records the error when the account token check fails', async () => {
    getServiceOAuthAccessToken.mockRejectedValue(
      new Error('OAuth token request failed (401 Unauthorized)')
    )

    const result = await runHealthChecks()

    expect(result.message).toBe('degraded')
    expect(result.checks['account-token']).toEqual({
      ok: false,
      error: 'OAuth token request failed (401 Unauthorized)'
    })
    expect(result.checks['waste-obligations']).toEqual({ ok: true })
    expect(result.checks['waste-organisations']).toEqual({ ok: true })
    expect(result.checks['govuk-notify']).toEqual({ ok: true })
  })

  it('returns degraded and records the error when govuk notify fails', async () => {
    previewCancellationTemplate.mockRejectedValue(
      new Error('GOV.UK Notify API key is not configured')
    )

    const result = await runHealthChecks()

    expect(result.message).toBe('degraded')
    expect(result.checks['govuk-notify']).toEqual({
      ok: false,
      error: 'GOV.UK Notify API key is not configured'
    })
    expect(result.checks['waste-obligations']).toEqual({ ok: true })
    expect(result.checks['waste-organisations']).toEqual({ ok: true })
    expect(result.checks['account-token']).toEqual({ ok: true })
  })

  it('returns degraded when all checks fail', async () => {
    obligationsService.listComplianceDeclarations.mockRejectedValue(
      new Error('timeout')
    )
    organisationsService.listComplianceOrganisations.mockRejectedValue(
      new Error('timeout')
    )
    getServiceOAuthAccessToken.mockRejectedValue(new Error('auth error'))
    previewCancellationTemplate.mockRejectedValue(new Error('notify error'))
    caseManagementService.listCases.mockRejectedValue(
      new Error('case management error')
    )

    const result = await runHealthChecks()

    expect(result.message).toBe('degraded')
    expect(Object.values(result.checks).every((c) => !c.ok)).toBe(true)
  })

  it('runs all checks in parallel (all five are called even when one fails)', async () => {
    obligationsService.listComplianceDeclarations.mockRejectedValue(
      new Error('down')
    )

    await runHealthChecks()

    expect(organisationsService.listComplianceOrganisations).toHaveBeenCalled()
    expect(getServiceOAuthAccessToken).toHaveBeenCalled()
    expect(previewCancellationTemplate).toHaveBeenCalled()
    expect(caseManagementService.listCases).toHaveBeenCalled()
  })
})
