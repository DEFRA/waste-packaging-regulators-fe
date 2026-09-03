import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('#config/config.js', () => ({
  config: {
    get: vi.fn((key) => {
      const values = {
        'accountApi.clientId': 'test-client-id',
        'accountApi.clientSecret': 'test-client-secret',
        'accountApi.scope': 'api://test/.default',
        'accountApi.tokenEndpoint': 'https://login.test/token'
      }
      return values[key]
    })
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

import { runHealthChecks } from './health.service.js'
import { getServiceOAuthAccessToken } from '#services/apiBaseClient/oauth-token.js'
import { createWasteObligationsApiService } from '#services/waste-obligations-api.service.js'
import { createWasteOrganisationsApiService } from '#services/waste-organisations-api.service.js'

describe('runHealthChecks', () => {
  let obligationsService
  let organisationsService

  beforeEach(() => {
    obligationsService = {
      listComplianceDeclarations: vi.fn().mockResolvedValue({})
    }
    organisationsService = {
      listComplianceOrganisations: vi.fn().mockResolvedValue({})
    }
    createWasteObligationsApiService.mockReturnValue(obligationsService)
    createWasteOrganisationsApiService.mockReturnValue(organisationsService)
    getServiceOAuthAccessToken.mockResolvedValue('test-token')
  })

  it('returns success when all checks pass', async () => {
    const result = await runHealthChecks()

    expect(result.message).toBe('success')
    expect(result.checks['waste-obligations']).toEqual({ ok: true })
    expect(result.checks['waste-organisations']).toEqual({ ok: true })
    expect(result.checks['account-token']).toEqual({ ok: true })
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

  it('calls waste organisations with the expected filters', async () => {
    await runHealthChecks()

    expect(
      organisationsService.listComplianceOrganisations
    ).toHaveBeenCalledWith({
      registrationYears: ['2020'],
      registrationType: 'DirectProducer'
    })
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
  })

  it('returns degraded when all checks fail', async () => {
    obligationsService.listComplianceDeclarations.mockRejectedValue(
      new Error('timeout')
    )
    organisationsService.listComplianceOrganisations.mockRejectedValue(
      new Error('timeout')
    )
    getServiceOAuthAccessToken.mockRejectedValue(new Error('auth error'))

    const result = await runHealthChecks()

    expect(result.message).toBe('degraded')
    expect(Object.values(result.checks).every((c) => !c.ok)).toBe(true)
  })

  it('runs all checks in parallel (all three are called even when one fails)', async () => {
    obligationsService.listComplianceDeclarations.mockRejectedValue(
      new Error('down')
    )

    await runHealthChecks()

    expect(organisationsService.listComplianceOrganisations).toHaveBeenCalled()
    expect(getServiceOAuthAccessToken).toHaveBeenCalled()
  })
})
