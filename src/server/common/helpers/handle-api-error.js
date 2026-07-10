import Boom from '@hapi/boom'
import { ApiError } from '#services/apiBaseClient/api-error.js'

export function handleApiError(request, error) {
  if (error instanceof ApiError) {
    request.logger.error(error)
    throw Boom.boomify(error, { statusCode: error.status })
  }

  throw error
}
