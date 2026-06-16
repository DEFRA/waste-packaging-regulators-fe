import Boom from '@hapi/boom'
import { config } from '#/config/config.js'
import { ApiError } from '#/services/apiBaseClient/api-error.js'
import {
  approveComplianceDeclaration,
  canApproveComplianceDeclaration,
  canCancelComplianceDeclaration,
  certificateActionSessionKeys,
  getComplianceDeclarationReviewStatus,
  getDeclarationSessionKey,
  setMockDeclarationStatusOverride
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

function redirectToDetail(organisationId, id, h) {
  return h.redirect(`/${organisationId}/certificates-of-compliance/${id}`)
}

export async function runApproveAction(request, h) {
  const { organisationId, id } = request.params
  const traceId = request.headers[config.get('tracing.header')]
  const declarationKey = getDeclarationSessionKey(organisationId, id)
  const reviewStatus = await getComplianceDeclarationReviewStatus(
    organisationId,
    id,
    traceId,
    request.yar
  )

  if (reviewStatus === 'Approved') {
    request.yar.set(certificateActionSessionKeys.justApproved, declarationKey)
    return redirectToDetail(organisationId, id, h)
  }

  if (!canApproveComplianceDeclaration(reviewStatus)) {
    return redirectToDetail(organisationId, id, h)
  }

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

  setMockDeclarationStatusOverride(request.yar, declarationKey, 'Approved')
  request.yar.set(certificateActionSessionKeys.justApproved, declarationKey)

  return redirectToDetail(organisationId, id, h)
}

export const certificatesOfComplianceApproveController = {
  async handler(request, h) {
    if (!request.yar.get('user')) {
      return redirectToSignIn(request, h)
    }
    return runApproveAction(request, h)
  }
}

export const certificatesOfComplianceCancelController = {
  async handler(request, h) {
    if (!request.yar.get('user')) {
      return redirectToSignIn(request, h)
    }

    const { organisationId, id } = request.params
    const traceId = request.headers[config.get('tracing.header')]
    const declarationKey = getDeclarationSessionKey(organisationId, id)
    const reviewStatus = await getComplianceDeclarationReviewStatus(
      organisationId,
      id,
      traceId,
      request.yar
    )

    if (reviewStatus === 'Cancelled') {
      request.yar.set(
        certificateActionSessionKeys.justCancelled,
        declarationKey
      )
      return redirectToDetail(organisationId, id, h)
    }

    if (!canCancelComplianceDeclaration(reviewStatus)) {
      return redirectToDetail(organisationId, id, h)
    }

    setMockDeclarationStatusOverride(request.yar, declarationKey, 'Cancelled')
    request.yar.set(certificateActionSessionKeys.justCancelled, declarationKey)

    return redirectToDetail(organisationId, id, h)
  }
}
