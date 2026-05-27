import { vi } from 'vitest'

import { createServer } from '../server.js'
import { statusCodes } from '../common/constants/status-codes.js'

describe('#healthController', () => {
  describe('with default config', () => {
    let server

    beforeAll(async () => {
      server = await createServer()
      await server.initialize()
    })

    afterAll(async () => {
      await server.stop({ timeout: 0 })
    })

    test('Should provide expected response with feature flag off', async () => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/health'
      })

      expect(result).toEqual({
        message: 'success',
        features: { certificateOfCompliance: false }
      })
      expect(statusCode).toBe(statusCodes.ok)
    })
  })

  describe('with FEATURE_CERTIFICATE_OF_COMPLIANCE=true', () => {
    let server

    beforeAll(async () => {
      vi.stubEnv('FEATURE_CERTIFICATE_OF_COMPLIANCE', 'true')
      vi.resetModules()
      const { createServer: createFreshServer } = await import('../server.js')
      server = await createFreshServer()
      await server.initialize()
    })

    afterAll(async () => {
      await server.stop({ timeout: 0 })
      vi.unstubAllEnvs()
    })

    test('Should report feature flag on', async () => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/health'
      })

      expect(result).toEqual({
        message: 'success',
        features: { certificateOfCompliance: true }
      })
      expect(statusCode).toBe(statusCodes.ok)
    })
  })
})
