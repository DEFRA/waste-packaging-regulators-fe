import { statusCodes } from '../common/constants/status-codes.js'

const SERVER_ERROR_THRESHOLD = 500

function assignIfDefined(target, key, value) {
  if (value !== undefined) {
    target[key] = value
  }
}

function assignIfPresent(target, key, value) {
  if (value) {
    target[key] = value
  }
}

function assignUpstreamContext(out, err) {
  assignIfDefined(out, 'code', err.code)
  assignIfDefined(out, 'errno', err.errno)
  if (err.status !== undefined && err.status !== null) {
    out.status = err.status
  }
  assignIfPresent(out, 'service_name', err.serviceName)
  assignIfPresent(out, 'method', err.method)
  assignIfPresent(out, 'url', err.url)
}

function assignNestedErrors(out, err) {
  if (Array.isArray(err.errors) && err.errors.length > 0) {
    out.errors = err.errors.map(serializeError).filter(Boolean)
  }
  assignIfDefined(out, 'cause', serializeError(err.cause))
}

function assignOptionalErrorFields(out, err) {
  assignUpstreamContext(out, err)
  assignNestedErrors(out, err)
}

export function serializeError(err) {
  if (!(err instanceof Error)) {
    return undefined
  }

  const out = {
    type: err.constructor?.name ?? err.name,
    message: err.message,
    stack_trace: err.stack
  }

  assignOptionalErrorFields(out, err)

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
