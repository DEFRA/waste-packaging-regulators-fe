import { handleApiError } from '#server/common/helpers/handle-api-error.js'
import {
  getCertificateOfComplianceDetailViewModel,
  getComplianceDeclarationReviewStatus,
  canCancelComplianceDeclaration,
  cancelComplianceDeclaration,
  certificateActionSessionKeys,
  getDeclarationSessionKey,
  setMockDeclarationStatusOverride
} from '../certificates-of-compliance.service.js'
import { redirectToSignIn } from '../detail/actions-controller.js'
import {
  buildCancelReasonItems,
  getCancelReasonLabel,
  isValidCancelReason
} from './reasons.js'

function detailPath(organisationId, id) {
  return `/${organisationId}/certificates-of-compliance/${id}`
}

function reasonPath(organisationId, id, reason) {
  const base = `${detailPath(organisationId, id)}/cancel/reason`
  return reason ? `${base}?reason=${encodeURIComponent(reason)}` : base
}

function checkPath(organisationId, id, reason) {
  const base = `${detailPath(organisationId, id)}/cancel/check`
  return reason ? `${base}?reason=${encodeURIComponent(reason)}` : base
}

function buildErrors(docTypeLower) {
  const text = `Select why you are cancelling this ${docTypeLower}`
  return {
    summary: [{ text, href: '#cancel-reason' }],
    cancelReason: { text }
  }
}

async function renderReasonForm(
  request,
  h,
  { selected = null, showError = false } = {}
) {
  const { organisationId, id } = request.params
  const { companyName, registrationType } =
    await getCertificateOfComplianceDetailViewModel(organisationId, id, {
      traceId: request.getTraceId(),
      session: request.yar
    })

  const docTypeLower =
    registrationType === 'ComplianceScheme' ? 'statement' : 'certificate'
  const errors = showError ? buildErrors(docTypeLower) : null
  const titleVerb = errors ? 'Error: Cancel' : 'Cancel'

  return h.view('certificatesOfCompliance/cancel/reason', {
    pageTitle: `${titleVerb} ${docTypeLower} — ${companyName}`,
    backlink: detailPath(organisationId, id),
    organisationId,
    id,
    companyName,
    docTypeLower,
    reasonItems: buildCancelReasonItems(registrationType, selected),
    errors
  })
}

export const certificatesOfComplianceCancelReasonGetController = {
  async handler(request, h) {
    if (!request.yar.get('user')) {
      return redirectToSignIn(request, h)
    }

    const { organisationId, id } = request.params
    const reviewStatus = await getComplianceDeclarationReviewStatus(
      organisationId,
      id,
      request.getTraceId(),
      request.yar
    )

    // Don't offer a reason once the declaration can no longer be cancelled
    // (e.g. already cancelled). Bounce back to the detail page.
    if (!canCancelComplianceDeclaration(reviewStatus)) {
      return h.redirect(detailPath(organisationId, id))
    }

    // Pre-select the reason carried back from the confirmation page's Change
    // link (?reason=...); ignore anything unrecognised.
    const { reason } = request.query
    const selected = isValidCancelReason(reason) ? reason : null

    return renderReasonForm(request, h, { selected })
  }
}

export const certificatesOfComplianceCancelReasonPostController = {
  async handler(request, h) {
    if (!request.yar.get('user')) {
      return redirectToSignIn(request, h)
    }

    const { organisationId, id } = request.params
    const reason = request.payload?.['cancel-reason']

    if (!isValidCancelReason(reason)) {
      return renderReasonForm(request, h, {
        selected: reason ?? null,
        showError: true
      })
    }

    return h.redirect(checkPath(organisationId, id, reason))
  }
}

export const certificatesOfComplianceCancelCheckGetController = {
  async handler(request, h) {
    if (!request.yar.get('user')) {
      return redirectToSignIn(request, h)
    }

    const { organisationId, id } = request.params
    const reviewStatus = await getComplianceDeclarationReviewStatus(
      organisationId,
      id,
      request.getTraceId(),
      request.yar
    )

    if (!canCancelComplianceDeclaration(reviewStatus)) {
      return h.redirect(detailPath(organisationId, id))
    }

    const { reason } = request.query

    // Reached without a valid reason (e.g. a direct link): send the user back
    // to choose one.
    if (!isValidCancelReason(reason)) {
      return h.redirect(reasonPath(organisationId, id))
    }

    const { companyName, registrationType } =
      await getCertificateOfComplianceDetailViewModel(organisationId, id, {
        traceId: request.getTraceId(),
        session: request.yar
      })

    const docTypeLower =
      registrationType === 'ComplianceScheme' ? 'statement' : 'certificate'

    return h.view('certificatesOfCompliance/cancel/check', {
      pageTitle: `Confirm and send cancellation email — ${companyName}`,
      backlink: reasonPath(organisationId, id, reason),
      organisationId,
      id,
      companyName,
      docTypeLower,
      reason,
      reasonLabel: getCancelReasonLabel(registrationType, reason),
      reasonPath: reasonPath(organisationId, id, reason)
    })
  }
}

// Records the cancellation and returns to the detail page with the cancelled
// banner. Idempotent: an already-cancelled declaration re-shows the banner, and
// one that can no longer be cancelled bounces back without it.
export const certificatesOfComplianceCancelPostController = {
  async handler(request, h) {
    if (!request.yar.get('user')) {
      return redirectToSignIn(request, h)
    }

    const { organisationId, id } = request.params
    const declarationKey = getDeclarationSessionKey(organisationId, id)
    const reviewStatus = await getComplianceDeclarationReviewStatus(
      organisationId,
      id,
      request.getTraceId(),
      request.yar
    )

    if (reviewStatus === 'Cancelled') {
      request.yar.set(
        certificateActionSessionKeys.justCancelled,
        declarationKey
      )
      return h.redirect(detailPath(organisationId, id))
    }

    const reason = request.payload?.['cancel-reason']
    if (!isValidCancelReason(reason)) {
      return h.redirect(reasonPath(organisationId, id))
    }

    const { registrationType } =
      await getCertificateOfComplianceDetailViewModel(organisationId, id, {
        traceId: request.getTraceId(),
        session: request.yar
      })
    const reasonLabel = getCancelReasonLabel(registrationType, reason)

    try {
      await cancelComplianceDeclaration(
        organisationId,
        id,
        request.yar.get('user'),
        reasonLabel,
        request.getTraceId()
      )
    } catch (error) {
      handleApiError(request, error)
    }

    setMockDeclarationStatusOverride(request.yar, declarationKey, 'Cancelled', {
      reason: reasonLabel
    })
    request.yar.set(certificateActionSessionKeys.justCancelled, declarationKey)

    return h.redirect(detailPath(organisationId, id))
  }
}
