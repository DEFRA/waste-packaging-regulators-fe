import Boom from '@hapi/boom'

import { statusCodes } from '#server/common/constants/status-codes.js'

// Each example raises a real Boom error so the page is produced by the same
// onPreResponse handler that serves it in production, not by a shortcut.
const examples = [
  {
    statusCode: statusCodes.forbidden,
    description: 'Access denied',
    raise: () => Boom.forbidden('Error page example')
  },
  {
    statusCode: statusCodes.notFound,
    description: 'Page not found',
    raise: () => Boom.notFound('Error page example')
  },
  {
    statusCode: statusCodes.internalServerError,
    description: 'Sorry, there is a problem with the service',
    raise: () => Boom.internal('Error page example')
  },
  {
    statusCode: statusCodes.serviceUnavailable,
    description: 'Sorry, the service is unavailable',
    raise: () => Boom.serverUnavailable('Error page example')
  }
]

const examplesByStatusCode = new Map(
  examples.map((example) => [String(example.statusCode), example])
)

/**
 * Preview routes for the error pages, registered outside production only.
 * Gives design and QA a URL per page and drives the browser tests.
 */
export const errorExamples = {
  plugin: {
    name: 'error-examples',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/error-examples',
          handler(_request, h) {
            return h.view('error/examples/index', {
              pageTitle: 'Error page examples',
              examples: examples.map(({ statusCode, description }) => ({
                statusCode,
                description
              }))
            })
          }
        },
        {
          method: 'GET',
          path: '/error-examples/{statusCode}',
          handler(request) {
            const example = examplesByStatusCode.get(request.params.statusCode)

            if (!example) {
              throw Boom.notFound('Unknown error page example')
            }

            throw example.raise()
          }
        }
      ])
    }
  }
}
