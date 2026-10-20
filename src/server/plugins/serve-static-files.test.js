import { readFileSync } from 'node:fs'
import path from 'node:path'
import { config } from '#config/config.js'
import { createServer } from '#server/server.js'
import { statusCodes } from '#server/common/constants/status-codes.js'

describe('#serveStaticFiles', () => {
  let server

  describe('When secure context is disabled', () => {
    beforeAll(async () => {
      server = await createServer()
      await server.initialize()
    })

    afterAll(async () => {
      await server.stop({ timeout: 0 })
    })

    test('Should serve favicon as expected', async () => {
      const { statusCode } = await server.inject({
        method: 'GET',
        url: '/favicon.ico'
      })

      expect(statusCode).toBe(statusCodes.noContent)
    })

    test.each(['favicon.ico', 'favicon.svg', 'apple-touch-icon.png'])(
      'Should serve the Defra %s instead of the GOV.UK default',
      async (icon) => {
        const { statusCode, rawPayload } = await server.inject({
          method: 'GET',
          url: `/public/assets/images/${icon}`
        })

        expect(statusCode).toBe(statusCodes.ok)
        expect(rawPayload).toEqual(
          readFileSync(
            path.resolve(
              config.get('root'),
              'src/client/static/assets/images',
              icon
            )
          )
        )
      }
    )
  })
})
