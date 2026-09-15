import inert from '@hapi/inert'

import { health } from '../routes/health/index.js'
import { auth } from '../routes/auth/index.js'
import { serveStaticFiles } from './serve-static-files.js'
import { config } from '#config/config.js'
import { certificatesOfComplianceList } from '../routes/certificatesOfCompliance/list/index.js'
import { certificatesOfComplianceDownload } from '../routes/certificatesOfCompliance/download/index.js'
import { certificatesOfComplianceDetail } from '../routes/certificatesOfCompliance/detail/index.js'
import { certificatesOfComplianceAccept } from '../routes/certificatesOfCompliance/accept/index.js'
import { certificatesOfComplianceCancel } from '../routes/certificatesOfCompliance/cancel/index.js'
import { errorExamples } from '../routes/error/examples/index.js'

export const router = {
  plugin: {
    name: 'router',
    async register(server) {
      await server.register([inert])

      // Health-check route. Used by platform to check if service is running, do not remove!
      await server.register([health])

      // Auth routes: /signin-oidc, /logout, /signed-out
      await server.register([auth])

      const cocPlugins = [
        certificatesOfComplianceList,
        certificatesOfComplianceDownload,
        certificatesOfComplianceDetail,
        certificatesOfComplianceAccept,
        certificatesOfComplianceCancel
      ]

      // Routes at / — matched when running behind the YARP proxy, which strips
      // the /certificates-of-compliance prefix before forwarding the request.
      await server.register(cocPlugins)

      // Same routes at /certificates-of-compliance — matched when the app is
      // accessed directly without a proxy (e.g. journey-test docker compose).
      // Hapi requires a unique plugin name per registration, so a suffix is
      // added to each name to avoid the "already registered" error.
      await server.register(
        cocPlugins.map(({ plugin }) => ({
          plugin: { ...plugin, name: `${plugin.name}:direct` }
        })),
        { routes: { prefix: '/certificates-of-compliance' } }
      )

      // Error page previews for design and QA — only enabled when mock data is active
      if (config.get('useMockApi')) {
        await server.register([errorExamples])
      }

      // Static assets
      if (!config.get('isProduction') && !config.get('isTest')) {
        await (async () => {
          const createViteServer = (await import('vite')).createServer
          const vite = await createViteServer({
            server: { middlewareMode: true },
            appType: 'custom'
          })

          await server.register({
            plugin: (await import('@defra/hapi-connect')).default,
            options: {
              path: '/public',
              middleware: [vite.middlewares]
            }
          })
        })()
      } else {
        server.register(serveStaticFiles)
      }
    }
  }
}
