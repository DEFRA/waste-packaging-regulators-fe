import { describe, it, expect, vi, afterEach } from 'vitest'
import inert from '@hapi/inert'

import { config } from '#config/config.js'
import { health } from '../routes/health/index.js'
import { auth } from '../routes/auth/index.js'
import { home } from '../routes/home/index.js'
import { about } from '../routes/about/index.js'
import { certificatesOfComplianceList } from '../routes/certificatesOfCompliance/list/index.js'
import { certificatesOfComplianceDetail } from '../routes/certificatesOfCompliance/detail/index.js'
import { certificatesOfComplianceAccept } from '../routes/certificatesOfCompliance/accept/index.js'
import { serveStaticFiles } from './serve-static-files.js'
import { router } from './router.js'

const mockViteCreateServer = vi.fn()
const mockHapiConnect = { name: 'mock-hapi-connect' }

vi.mock('vite', () => ({ createServer: mockViteCreateServer }))
vi.mock('@defra/hapi-connect', () => ({ default: mockHapiConnect }))

function makeServer() {
  return { register: vi.fn() }
}

/**
 * Spy on config.get, overriding only isProduction and isTest.
 * All other keys fall through to the real config so module
 * initialisation (e.g. logger-options) is unaffected.
 */
function spyConfig({ isProduction = false, isTest = false } = {}) {
  const real = config.get.bind(config)
  return vi.spyOn(config, 'get').mockImplementation((key) => {
    if (key === 'isProduction') return isProduction
    if (key === 'isTest') return isTest
    return real(key)
  })
}

describe('router plugin', () => {
  let configSpy

  afterEach(() => {
    configSpy?.mockRestore()
    vi.clearAllMocks()
  })

  it('has the correct plugin name', () => {
    expect(router.plugin.name).toBe('router')
  })

  it('registers inert', async () => {
    configSpy = spyConfig({ isTest: true })
    const server = makeServer()
    await router.plugin.register(server)
    expect(server.register).toHaveBeenCalledWith([inert])
  })

  it('registers the health plugin', async () => {
    configSpy = spyConfig({ isTest: true })
    const server = makeServer()
    await router.plugin.register(server)
    expect(server.register).toHaveBeenCalledWith([health])
  })

  it('registers the auth plugin', async () => {
    configSpy = spyConfig({ isTest: true })
    const server = makeServer()
    await router.plugin.register(server)
    expect(server.register).toHaveBeenCalledWith([auth])
  })

  it('registers all application route plugins', async () => {
    configSpy = spyConfig({ isTest: true })
    const server = makeServer()
    await router.plugin.register(server)
    expect(server.register).toHaveBeenCalledWith([
      home,
      about,
      certificatesOfComplianceList,
      certificatesOfComplianceDetail,
      certificatesOfComplianceAccept
    ])
  })

  describe('static asset serving', () => {
    it('registers serveStaticFiles in the test environment', async () => {
      configSpy = spyConfig({ isTest: true })
      const server = makeServer()
      await router.plugin.register(server)
      expect(server.register).toHaveBeenCalledWith(serveStaticFiles)
    })

    it('registers serveStaticFiles in production', async () => {
      configSpy = spyConfig({ isProduction: true })
      const server = makeServer()
      await router.plugin.register(server)
      expect(server.register).toHaveBeenCalledWith(serveStaticFiles)
    })

    it('does not register serveStaticFiles in development', async () => {
      configSpy = spyConfig()
      mockViteCreateServer.mockResolvedValue({
        middlewares: 'vite-middlewares'
      })
      const server = makeServer()
      await router.plugin.register(server)
      expect(server.register).not.toHaveBeenCalledWith(serveStaticFiles)
    })

    it('registers @defra/hapi-connect at /public in development', async () => {
      configSpy = spyConfig()
      mockViteCreateServer.mockResolvedValue({
        middlewares: 'vite-middlewares'
      })
      const server = makeServer()
      await router.plugin.register(server)

      const connectCall = server.register.mock.calls.find(
        ([arg]) => arg?.options?.path === '/public'
      )
      expect(connectCall).toBeDefined()
      expect(connectCall[0].plugin).toBe(mockHapiConnect)
    })

    it('passes vite middlewares to @defra/hapi-connect in development', async () => {
      configSpy = spyConfig()
      mockViteCreateServer.mockResolvedValue({
        middlewares: 'vite-middlewares'
      })
      const server = makeServer()
      await router.plugin.register(server)

      const connectCall = server.register.mock.calls.find(
        ([arg]) => arg?.options?.path === '/public'
      )
      expect(connectCall[0].options.middleware).toEqual(['vite-middlewares'])
    })

    it('does not start a vite server in the test environment', async () => {
      configSpy = spyConfig({ isTest: true })
      const server = makeServer()
      await router.plugin.register(server)
      expect(mockViteCreateServer).not.toHaveBeenCalled()
    })
  })
})
