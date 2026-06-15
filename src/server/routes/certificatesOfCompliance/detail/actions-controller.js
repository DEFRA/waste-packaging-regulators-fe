import {
  certificateActionSessionKeys,
  getDeclarationSessionKey
} from '../certificates-of-compliance.service.js'

export function redirectToSignIn(request, h) {
  request.yar.set('returnTo', request.url.pathname + request.url.search)
  return h.redirect('/signin-oidc')
}

export const certificatesOfComplianceApproveController = {
  async handler(request, h) {
    if (!request.yar.get('user')) {
      return redirectToSignIn(request, h)
    }

    const { organisationId, id } = request.params

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
