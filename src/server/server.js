import fs from 'node:fs'
import path from 'path'
import hapi from '@hapi/hapi'
import Scooter from '@hapi/scooter'
import bell from '@hapi/bell'

import { router } from './plugins/router.js'
import { config } from '#config/config.js'
import { pulse } from './plugins/pulse.js'
import { catchAll } from './common/helpers/errors.js'
import { nunjucksConfig } from '#config/nunjucks/nunjucks.js'
import { setupProxy } from './common/helpers/proxy/setup-proxy.js'
import { requestTracing } from './plugins/request-tracing.js'
import { requestLogger } from './plugins/request-logger.js'
import { boomErrorLogger } from './plugins/boom-error-logger.js'
import { sessionCache } from './plugins/session-cache.js'
import { getCacheEngine } from './common/helpers/session-cache/cache-engine.js'
import { secureContext } from '@defra/hapi-secure-context'
import { contentSecurityPolicy } from './plugins/content-security-policy.js'
import { metrics } from '@defra/cdp-metrics'

/**
 * Bell `location` must be the app origin (see `@hapi/bell`: redirect_uri = location + request.path).
 * `AZURE_AD_B2C_REDIRECT_URI` may be a full URL or a path.
 */
function bellRedirectOrigin(redirectUri, tls) {
  if (!redirectUri) {
    return undefined
  }
  if (/^https?:\/\//i.test(redirectUri)) {
    const u = new URL(redirectUri)
    if (tls && u.protocol === 'http:') {
      u.protocol = 'https:'
    }
    return u.origin
  }
  const scheme = tls ? 'https' : 'http'
  const host = config.get('host')
  const hostForUrl = host === '0.0.0.0' ? 'localhost' : host
  const base = `${scheme}://${hostForUrl}:${config.get('port')}`
  return new URL(redirectUri, base).origin
}

const authStrategyName = 'azure-ad-b2c'

function createHapiServer(tls) {
  return hapi.server({
    tls,
    host: config.get('host'),
    port: config.get('port'),
    routes: {
      validate: {
        options: {
          abortEarly: false
        }
      },
      files: {
        relativeTo: path.resolve(config.get('root'), '.public')
      },
      security: {
        hsts: {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: false
        },
        xss: 'enabled',
        noSniff: true,
        xframe: true
      }
    },
    router: {
      stripTrailingSlash: true
    },
    cache: [
      {
        name: config.get('session.cache.name'),
        engine: getCacheEngine(config.get('session.cache.engine'))
      }
    ],
    state: {
      strictHeader: false
    }
  })
}

export async function createServer() {
  setupProxy()
  const isDevelopment = config.get('isDevelopment')
  const certsDir = path.resolve(config.get('root'), 'certs')
  const tls =
    isDevelopment && fs.existsSync(path.join(certsDir, 'localhost-key.pem'))
      ? {
          key: fs.readFileSync(path.join(certsDir, 'localhost-key.pem')),
          cert: fs.readFileSync(path.join(certsDir, 'localhost-cert.pem'))
        }
      : undefined

  const server = createHapiServer(tls)
  await server.register([
    bell,
    requestLogger,
    requestTracing,
    boomErrorLogger,
    metrics,
    secureContext,
    pulse,
    sessionCache,
    nunjucksConfig,
    Scooter,
    contentSecurityPolicy
  ])

  const azureAdB2cConfig = config.get('auth.azureAdB2c')

  if (config.get('useMockAuth')) {
    server.auth.scheme('mock', () => ({
      authenticate: (_request, h) =>
        h.authenticated({
          credentials: {
            profile: { oid: 'mock-user-oid', email: 'mock-user@test.local' }
          }
        })
    }))
    server.auth.strategy(authStrategyName, 'mock')
  } else {
    server.auth.strategy(authStrategyName, 'bell', {
      provider: {
        name: authStrategyName,
        protocol: 'oauth2',
        useParamsAuth: true,
        auth:
          azureAdB2cConfig.instance && azureAdB2cConfig.domain
            ? `${azureAdB2cConfig.instance}/${azureAdB2cConfig.domain}/${azureAdB2cConfig.userFlow}/oauth2/v2.0/authorize`
            : `https://${azureAdB2cConfig.tenantName}.b2clogin.com/${azureAdB2cConfig.tenantName}.onmicrosoft.com/${azureAdB2cConfig.userFlow}/oauth2/v2.0/authorize`,
        token:
          azureAdB2cConfig.instance && azureAdB2cConfig.domain
            ? `${azureAdB2cConfig.instance}/${azureAdB2cConfig.domain}/${azureAdB2cConfig.userFlow}/oauth2/v2.0/token`
            : `https://${azureAdB2cConfig.tenantName}.b2clogin.com/${azureAdB2cConfig.tenantName}.onmicrosoft.com/${azureAdB2cConfig.userFlow}/oauth2/v2.0/token`,
        scope: ['openid', 'profile', 'offline_access'],
        profile(_credentials, params) {
          const idToken = params.id_token
          if (!idToken) {
            return
          }
          const payload = idToken.split('.')[1]
          const claims = JSON.parse(
            Buffer.from(payload, 'base64url').toString('utf8')
          )
          _credentials.profile = claims
        }
      },
      password: azureAdB2cConfig.cookiePassword,
      clientId: azureAdB2cConfig.clientId,
      clientSecret: azureAdB2cConfig.clientSecret,
      isSecure: azureAdB2cConfig.isSecure,
      location: bellRedirectOrigin(azureAdB2cConfig.redirectUri, tls),
      config: {
        tenant: azureAdB2cConfig.domain,
        discovery:
          azureAdB2cConfig.instance && azureAdB2cConfig.domain
            ? `${azureAdB2cConfig.instance}/${azureAdB2cConfig.domain}/${azureAdB2cConfig.userFlow}/v2.0/.well-known/openid-configuration`
            : `https://${azureAdB2cConfig.tenantName}.b2clogin.com/${azureAdB2cConfig.tenantName}.onmicrosoft.com/${azureAdB2cConfig.userFlow}/v2.0/.well-known/openid-configuration`
      }
    })
  }

  await server.register([
    router // Register all the controllers/routes defined in src/server/plugins/router.js
  ])

  server.ext('onPreResponse', catchAll)

  return server
}
