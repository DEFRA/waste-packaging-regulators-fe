import { config } from '#config/config.js'
import {
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

function redirectToDetail(organisationId, id, h) {
  return h.redirect(`/${organisationId}/certificates-of-compliance/${id}`)
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
