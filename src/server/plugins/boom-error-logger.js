import { statusCodes } from '../common/constants/status-codes.js'

const SERVER_ERROR_THRESHOLD = 500

export function serializeError(err) {
  if (!(err instanceof Error)) {
    return undefined
  }

  const out = {
    type: err.constructor?.name ?? err.name,
    message: err.message,
    stack_trace: err.stack
  }

  if (err.code !== undefined) out.code = err.code
  if (err.errno !== undefined) out.errno = err.errno
  if (err.status !== undefined && err.status !== null) out.status = err.status
  if (err.serviceName) out.service_name = err.serviceName
  if (err.method) out.method = err.method
  if (err.url) out.url = err.url
  if (Array.isArray(err.errors) && err.errors.length > 0) {
    out.errors = err.errors.map(serializeError).filter(Boolean)
  }
  if (err.cause !== undefined) out.cause = serializeError(err.cause)

  return out
}

export const boomErrorLogger = {
  plugin: {
    name: 'boom-error-logger',
    version: '1.0.0',
    register: (server) => {
      server.ext('onPreResponse', (request, h) => {
        const response = request.response

        if (!('isBoom' in response) || !response.isBoom) {
          return h.continue
        }

        const statusCode = response.output.statusCode

        if (statusCode === statusCodes.unauthorized) {
          return h.continue
        }

        const level = statusCode >= SERVER_ERROR_THRESHOLD ? 'error' : 'warn'

        request.logger[level](
          {
            error: serializeError(response),
            event: { category: 'http', kind: 'event', outcome: 'failure' },
            http: {
              request: { id: request.info.id },
              response: { status_code: statusCode }
            }
          },
          response.message
        )

        return h.continue
      })
    }
  }
}
