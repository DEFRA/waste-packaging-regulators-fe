import Boom from '@hapi/boom'
import { ApiError } from '#services/apiBaseClient/api-error.js'
import { statusCodes } from '#server/common/constants/status-codes.js'

// A status from a backend describes the call we made to it, not the request the
// user made to us. AMCR-485: a shuttered waste-obligations API 404'd every call
// and CSOC told regulators to check the web address they had typed. So an
// upstream failure is classified into the two outcomes a user can act on - the
// service is unavailable, or it is broken - leaving the not found and access
// denied pages free to mean what they say about the user's own request.
const unavailableUpstreamStatuses = new Set([
  statusCodes.notFound, // route gone: shuttered, undeployed or misrouted
  statusCodes.tooManyRequests,
  statusCodes.badGateway,
  statusCodes.serviceUnavailable,
  statusCodes.gatewayTimeout
])

/**
 * Total by design: every status maps to service unavailable or problem with the
 * service, so one we have never seen cannot leak a page about the user.
 */
export function userFacingStatus(upstreamStatus) {
  // No status at all means the call never landed - DNS, refused, timed out.
  const unavailable =
    upstreamStatus == null || unavailableUpstreamStatuses.has(upstreamStatus)

  return unavailable
    ? statusCodes.serviceUnavailable
    : statusCodes.internalServerError
}

export function handleApiError(request, error) {
  if (error instanceof ApiError) {
    request.logger.error(error)
    throw Boom.boomify(error, { statusCode: userFacingStatus(error.status) })
  }

  throw error
}
