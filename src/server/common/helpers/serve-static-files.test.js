import path from 'node:path'
import hapi from '@hapi/hapi'
import inert from '@hapi/inert'
import { vi } from 'vitest'
import { statusCodes } from '../constants/status-codes.js'
import { config } from '../../../config/config.js'
import { serveStaticFiles } from './serve-static-files.js'

describe('#serveStaticFiles', () => {
  let server

  describe('When secure context is disabled', () => {
    beforeEach(async () => {
      vi.stubEnv('ENABLE_SECURE_CONTEXT', 'false')

      server = hapi.server({
        host: 'localhost',
        port: 0,
        routes: {
          files: {
            relativeTo: path.resolve(config.get('root'), '.public')
          }
        }
      })

      await server.register([inert, serveStaticFiles])
      await server.initialize()
    }, 30000)

    afterEach(async () => {
      await server?.stop?.({ timeout: 0 })
      server = undefined
    })

    afterAll(() => {
      vi.unstubAllEnvs()
    })

    test('Should serve favicon as expected', async () => {
      const { statusCode } = await server.inject({
        method: 'GET',
        url: '/favicon.ico'
      })

      expect(statusCode).toBe(statusCodes.noContent)
    })

    test('Should serve assets as expected', async () => {
      // Note npm run build is ran in the postinstall hook in package.json to make sure there is always a file
      // available for this test. Remove as you see fit
      const { statusCode } = await server.inject({
        method: 'GET',
        url: '/public/assets/images/govuk-crest.svg'
      })

      expect(statusCode).toBe(statusCodes.ok)
    })
  })
})
