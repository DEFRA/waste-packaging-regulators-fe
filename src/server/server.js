import fs from 'node:fs'
import path from 'node:path'
import hapi from '@hapi/hapi'
import Scooter from '@hapi/scooter'
import bell from '@hapi/bell'

import { router } from './router.js'
import { config } from '../config/config.js'
import { pulse } from './common/helpers/pulse.js'
import { catchAll } from './common/helpers/errors.js'
import { nunjucksConfig } from '../config/nunjucks/nunjucks.js'
import { setupProxy } from './common/helpers/proxy/setup-proxy.js'
import { requestTracing } from './common/helpers/request-tracing.js'
import { requestLogger } from './common/helpers/logging/request-logger.js'
import { sessionCache } from './common/helpers/session-cache/session-cache.js'
import { getCacheEngine } from './common/helpers/session-cache/cache-engine.js'
import { secureContext } from '@defra/hapi-secure-context'
import { contentSecurityPolicy } from './common/helpers/content-security-policy.js'
import { metrics } from '@defra/cdp-metrics'

/**
 * Bell `location` must be the app origin (see `@hapi/bell`: redirect_uri = location + request.path).
 * `AZURE_AD_B2C_REDIRECT_URI` may be a full URL or a path.
 *
 * If the env URL uses `http://` but this process serves HTTPS (dev certs), use `https` for the
 * origin so B2C receives a redirect_uri that matches typical registrations.
 */
function bellRedirectOrigin(redirectUri, tls) {
  if (!redirectUri) return undefined
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

  const server = hapi.server({
    host: config.get('host'),
    port: config.get('port'),
    tls,
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
  await server.register([
    bell,
    requestLogger,
    requestTracing,
    metrics,
    secureContext,
    pulse,
    sessionCache,
    nunjucksConfig,
    Scooter,
    contentSecurityPolicy
  ])

  const azureAdB2cConfig = config.get('auth.azureAdB2c')

  if (config.get('isTest')) {
    server.auth.scheme('mock', () => ({
      authenticate: (_request, h) =>
        h.authenticated({
          credentials: {
            token: 'mock-access-token',
            profile: {
              oid: 'a586e22f-0df0-4a24-8048-ae7d0aabbbbc'
            }
          }
        })
    }))
    server.auth.strategy('azure-ad-b2c', 'mock')
  } else {
    server.auth.strategy('azure-ad-b2c', 'bell', {
      provider: {
        name: 'azure-ad-b2c',
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
          if (!idToken) return
          const payload = idToken.split('.')[1]
          _credentials.profile = JSON.parse(
            Buffer.from(payload, 'base64url').toString('utf8')
          )
        }
      },
      password: azureAdB2cConfig.cookiePassword,
      clientId: azureAdB2cConfig.clientId,
      clientSecret: azureAdB2cConfig.clientSecret,
      isSecure: azureAdB2cConfig.isSecure,
      location: bellRedirectOrigin(azureAdB2cConfig.redirectUri, tls),
      config: {
        tenant: azureAdB2cConfig.tenantId || azureAdB2cConfig.domain,
        discovery:
          azureAdB2cConfig.instance && azureAdB2cConfig.domain
            ? `${azureAdB2cConfig.instance}/${azureAdB2cConfig.domain}/${azureAdB2cConfig.userFlow}/v2.0/.well-known/openid-configuration`
            : `https://${azureAdB2cConfig.tenantName}.b2clogin.com/${azureAdB2cConfig.tenantName}.onmicrosoft.com/${azureAdB2cConfig.userFlow}/v2.0/.well-known/openid-configuration`
      }
    })
  }

  await server.register([
    router // Register all the controllers/routes defined in src/server/router.js
  ])

  server.ext('onPreResponse', catchAll)

  return server
}
