import { ecsFormat } from '@elastic/ecs-pino-format'
import { getTraceId } from '@defra/hapi-tracing'

import { config } from '#config/config.js'

const logConfig = config.get('log')
const serviceName = config.get('serviceName')
const serviceVersion = config.get('serviceVersion')

// hapi-pino puts `req.query` on every line logged for a request, and the B2C
// sign-in callback carries the authorisation code and state in its query
// string. These are always removed, whatever LOG_REDACT is set to.
export const sensitiveQueryPaths = [
  'req.query.code',
  'req.query.state',
  'req.query.id_token',
  'req.query.access_token'
]

const formatters = {
  ecs: {
    ...ecsFormat({
      serviceVersion,
      serviceName
    })
  },
  'pino-pretty': { transport: { target: 'pino-pretty' } }
}

export const loggerOptions = {
  enabled: logConfig.enabled,
  ignorePaths: ['/health', '/health/all'],
  redact: {
    paths: [...logConfig.redact, ...sensitiveQueryPaths],
    remove: true
  },
  level: logConfig.level,
  ...formatters[logConfig.format],
  nesting: true,
  mixin() {
    const mixinValues = {}
    const traceId = getTraceId()
    if (traceId) {
      mixinValues.trace = { id: traceId }
    }
    return mixinValues
  }
}
