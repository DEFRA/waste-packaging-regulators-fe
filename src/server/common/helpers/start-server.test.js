import { vi } from 'vitest'

import hapi from '@hapi/hapi'
import { statusCodes } from '../constants/status-codes.js'

describe('#startServer', () => {
  let createServerSpy
  let hapiServerSpy
  let startServerImport
  let createServerImport
  let originalCreateServer

  beforeAll(async () => {
    vi.stubEnv('PORT', '3097')

    createServerImport = await import('../../server.js')
    originalCreateServer = createServerImport.createServer
    startServerImport = await import('./start-server.js')

    createServerSpy = vi.spyOn(createServerImport, 'createServer')
    hapiServerSpy = vi.spyOn(hapi, 'server')
  })

  afterAll(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  async function startServerWithLoggerSpy({ hostAfterStart } = {}) {
    let infoSpy

    createServerSpy.mockImplementationOnce(async () => {
      const createdServer = await originalCreateServer()
      infoSpy = vi.spyOn(createdServer.logger, 'info')

      if (hostAfterStart) {
        const originalStart = createdServer.start.bind(createdServer)
        createdServer.start = async (...args) => {
          await originalStart(...args)
          createdServer.info.host = hostAfterStart
        }
      }

      return createdServer
    })

    const server = await startServerImport.startServer()

    return { server, infoSpy }
  }

  function expectStartupUrlsLogged(infoSpy, origin) {
    expect(infoSpy).toHaveBeenCalledWith(`Access your frontend on ${origin}`)
    expect(infoSpy).toHaveBeenCalledWith(
      `Direct producers: ${origin}/certificates-of-compliance?type=direct-producers&tab=pending`
    )
    expect(infoSpy).toHaveBeenCalledWith(
      `Compliance schemes: ${origin}/certificates-of-compliance?type=compliance-schemes&tab=pending`
    )
  }

  describe('When server starts', () => {
    let server

    afterEach(async () => {
      if (server) {
        await server.stop({ timeout: 0 })
        server = undefined
      }
    })

    test('Should start up server as expected', async () => {
      server = await startServerImport.startServer()

      expect(createServerSpy).toHaveBeenCalled()
      expect(hapiServerSpy).toHaveBeenCalled()

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/health'
      })

      expect(result).toEqual({ message: 'success' })
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('logs localhost URLs when bound to 0.0.0.0', async () => {
      const { server: startedServer, infoSpy } =
        await startServerWithLoggerSpy()
      server = startedServer

      const origin = `${server.info.protocol}://localhost:${server.info.port}`

      expectStartupUrlsLogged(infoSpy, origin)
    })

    test('logs configured host URL when not bound to 0.0.0.0', async () => {
      const { server: startedServer, infoSpy } = await startServerWithLoggerSpy(
        { hostAfterStart: '127.0.0.1' }
      )
      server = startedServer

      const origin = `${server.info.protocol}://127.0.0.1:${server.info.port}`

      expectStartupUrlsLogged(infoSpy, origin)
    })
  })

  describe('When server start fails', () => {
    test('Should log failed startup message', async () => {
      createServerSpy.mockRejectedValueOnce(new Error('Server failed to start'))

      await expect(startServerImport.startServer()).rejects.toThrow(
        'Server failed to start'
      )
    })
  })
})
