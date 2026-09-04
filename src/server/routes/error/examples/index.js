import Boom from '@hapi/boom'

import { statusCodes } from '#server/common/constants/status-codes.js'
import { errorPageFor } from '#server/common/helpers/errors.js'

const exampleMessage = 'Error page example'

const exampleStatusCodes = [
  statusCodes.forbidden,
  statusCodes.notFound,
  statusCodes.internalServerError,
  statusCodes.serviceUnavailable
]

/**
 * Preview routes for the error pages, registered when MOCK_DATA/useMockApi is true.
 * Gives design and QA a URL per page and drives the browser tests.
 *
 * Each example raises a real Boom error, so the page is produced by the same
 * onPreResponse handler that serves it in production, not by a shortcut.
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
              // Titles come from the error page mapping, so this list cannot
              // drift from what the pages actually say.
              examples: exampleStatusCodes.map((statusCode) => ({
                statusCode,
                description: errorPageFor(statusCode).pageTitle
              }))
            })
          }
        },
        {
          method: 'GET',
          path: '/error-examples/{statusCode}',
          handler(request) {
            const statusCode = Number(request.params.statusCode)

            if (!exampleStatusCodes.includes(statusCode)) {
              throw Boom.notFound(exampleMessage)
            }

            throw Boom.boomify(new Error(exampleMessage), { statusCode })
          }
        }
      ])
    }
  }
}
