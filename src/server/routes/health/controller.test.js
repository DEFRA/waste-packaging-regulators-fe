import { describe, it, test, expect, vi, beforeAll, afterAll } from 'vitest'
import { createServer } from '#server/server.js'
import { statusCodes } from '#server/common/constants/status-codes.js'

vi.mock('./health.service.js', () => ({
  runHealthChecks: vi.fn()
}))

import { healthController } from './controller.js'
import { runHealthChecks } from './health.service.js'
import { config } from '#config/config.js'

describe('#healthController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('returns success without running checks when useMockApi is true', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/health'
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toEqual({ message: 'success' })
    expect(runHealthChecks).not.toHaveBeenCalled()
  })
})

describe('healthController handler (non-mock mode)', () => {
  const h = { response: vi.fn() }

  beforeEach(() => {
    vi.spyOn(config, 'get').mockImplementation((key) => {
      if (key === 'useMockApi') return false
    })
    h.response.mockReturnValue({ code: vi.fn().mockReturnThis() })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.mocked(runHealthChecks).mockReset()
  })

  it('calls runHealthChecks and returns its result with 200', async () => {
    const checks = {
      'waste-obligations': { ok: true },
      'waste-organisations': { ok: true },
      'account-token': { ok: true }
    }
    vi.mocked(runHealthChecks).mockResolvedValue({
      message: 'success',
      checks
    })

    await healthController.handler({}, h)

    expect(runHealthChecks).toHaveBeenCalledOnce()
    expect(h.response).toHaveBeenCalledWith({ message: 'success', checks })
  })

  it('returns 200 even when checks report degraded', async () => {
    const checks = {
      'waste-obligations': { ok: false, error: 'Connection refused' },
      'waste-organisations': { ok: true },
      'account-token': { ok: true }
    }
    vi.mocked(runHealthChecks).mockResolvedValue({
      message: 'degraded',
      checks
    })

    const responseObj = { code: vi.fn().mockReturnThis() }
    h.response.mockReturnValue(responseObj)

    await healthController.handler({}, h)

    expect(h.response).toHaveBeenCalledWith({ message: 'degraded', checks })
    expect(responseObj.code).toHaveBeenCalledWith(statusCodes.ok)
  })
})
