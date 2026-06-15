import Boom from '@hapi/boom'
import { config } from '#/config/config.js'
import { ApiError } from '#/services/apiBaseClient/api-error.js'
import {
  approveComplianceDeclaration,
  certificateActionSessionKeys,
  getDeclarationSessionKey
} from '../certificates-of-compliance.service.js'

export function redirectToSignIn(request, h) {
  request.yar.set('returnTo', request.url.pathname + request.url.search)
  return h.redirect('/signin-oidc')
}

function handleApiError(request, error) {
  if (error instanceof ApiError) {
    request.log.error(error)
    throw Boom.boomify(error, { statusCode: error.status })
  }

  throw error
}

export const certificatesOfComplianceApproveController = {
  async handler(request, h) {
    if (!request.yar.get('user')) {
      return redirectToSignIn(request, h)
    }

    const { organisationId, id } = request.params
    const traceId = request.headers[config.get('tracing.header')]

    try {
      await approveComplianceDeclaration(
        organisationId,
        id,
        request.yar.get('user'),
        traceId
      )
    } catch (error) {
      handleApiError(request, error)
    }

    request.yar.set(
      certificateActionSessionKeys.justApproved,
      getDeclarationSessionKey(organisationId, id)
    )

    return h.redirect(`/${organisationId}/certificates-of-compliance/${id}`)
  }
}

export const certificatesOfComplianceCancelController = {
  async handler(request, h) {
    if (!request.yar.get('user')) {
      return redirectToSignIn(request, h)
    }

    const { organisationId, id } = request.params

    request.yar.set(
      certificateActionSessionKeys.justCancelled,
      getDeclarationSessionKey(organisationId, id)
    )

    return h.redirect(`/${organisationId}/certificates-of-compliance/${id}`)
  }
}
