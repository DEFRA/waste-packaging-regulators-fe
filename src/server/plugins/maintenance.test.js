import { config } from '#config/config.js'

import { createServer } from '../server.js'
import { statusCodes } from '../common/constants/status-codes.js'

describe('#maintenance', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  afterEach(() => {
    config.set('maintenance.enabled', false)
    config.set('maintenance.availableFrom', '')
  })

  describe('When maintenance mode is off', () => {
    test('Should serve the application as normal', async () => {
      const { statusCode } = await server.inject({ method: 'GET', url: '/' })

      expect(statusCode).toBe(statusCodes.ok)
    })
  })

  describe('When maintenance mode is on', () => {
    beforeEach(() => {
      config.set('maintenance.enabled', true)
    })

    test('Should shutter application paths with the service unavailable page', async () => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/'
      })

      expect(statusCode).toBe(statusCodes.serviceUnavailable)
      expect(result).toEqual(
        expect.stringContaining('Sorry, the service is unavailable')
      )
      expect(result).toEqual(
        expect.stringContaining('mailto:eprcustomerservice@defra.gov.uk')
      )
    })

    test('Should keep the health check available', async () => {
      const { statusCode } = await server.inject({
        method: 'GET',
        url: '/health'
      })

      expect(statusCode).toBe(statusCodes.ok)
    })

    test('Should not shutter static assets', async () => {
      const { statusCode } = await server.inject({
        method: 'GET',
        url: '/public/stylesheets/application.css'
      })

      expect(statusCode).not.toBe(statusCodes.serviceUnavailable)
    })

    test('Should tell the user when the service is back for planned maintenance', async () => {
      config.set('maintenance.availableFrom', '9am on 1 August 2026')

      const { result } = await server.inject({ method: 'GET', url: '/' })

      expect(result).toEqual(
        expect.stringContaining(
          'You will be able to use the service from 9am on 1 August 2026.'
        )
      )
    })

    test('Should fall back to "Try again later" when no return time is known', async () => {
      const { result } = await server.inject({ method: 'GET', url: '/' })

      expect(result).toEqual(expect.stringContaining('Try again later.'))
      expect(result).not.toEqual(
        expect.stringContaining('You will be able to use the service from')
      )
    })
  })
})
