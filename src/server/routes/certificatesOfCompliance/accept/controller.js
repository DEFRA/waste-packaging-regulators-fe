import { config } from '#config/config.js'
import { handleApiError } from '#server/common/helpers/handle-api-error.js'
import {
  getCertificateOfComplianceDetailViewModel,
  getComplianceDeclarationReviewStatus,
  canApproveComplianceDeclaration,
  approveComplianceDeclaration,
  certificateActionSessionKeys,
  getDeclarationSessionKey,
  setMockDeclarationStatusOverride
} from '../certificates-of-compliance.service.js'
import { redirectToSignIn } from '../detail/actions-controller.js'

const ERROR_TEXT = 'Select yes or no'
const TRACING_HEADER = 'tracing.header'

function buildErrors() {
  return {
    summary: [{ text: ERROR_TEXT, href: '#confirm-accept' }],
    confirmAccept: { text: ERROR_TEXT }
  }
}

function detailPath(organisationId, id) {
  return `/${organisationId}/certificates-of-compliance/${id}`
}

function getTraceIdFromRequest(request) {
  return request.headers[config.get(TRACING_HEADER)]
}

async function renderForm(request, h, { errors = null } = {}) {
  const { organisationId, id } = request.params
  const traceId = getTraceIdFromRequest(request)
  const { companyName, registrationType } =
    await getCertificateOfComplianceDetailViewModel(organisationId, id, {
      traceId,
      session: request.yar
    })

  const docTypeLower =
    registrationType === 'ComplianceScheme' ? 'statement' : 'certificate'
  const titleVerb = errors ? 'Error: Accept' : 'Accept'

  return h.view('certificatesOfCompliance/accept/index', {
    pageTitle: `${titleVerb} ${docTypeLower} — ${companyName}`,
    backlink: detailPath(organisationId, id),
    organisationId,
    id,
    companyName,
    registrationType,
    errors
  })
}

// Approves the declaration and returns to the detail page with the accepted
// banner. Idempotent: an already-approved declaration re-shows the banner, and
// one that can no longer be approved bounces back without it.
async function approveDeclaration(request, h) {
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
    return h.redirect(detailPath(organisationId, id))
  }

  if (!canApproveComplianceDeclaration(reviewStatus)) {
    return h.redirect(detailPath(organisationId, id))
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

  return h.redirect(detailPath(organisationId, id))
}

export const certificatesOfComplianceAcceptGetController = {
  async handler(request, h) {
    if (!request.yar.get('user')) {
      return redirectToSignIn(request, h)
    }

    const { organisationId, id } = request.params
    const traceId = getTraceIdFromRequest(request)
    const reviewStatus = await getComplianceDeclarationReviewStatus(
      organisationId,
      id,
      traceId,
      request.yar
    )

    // Don't show the confirmation form if the declaration can no longer be approved
    // (e.g. already approved, cancelled). Bounce back to the detail page.
    if (!canApproveComplianceDeclaration(reviewStatus)) {
      return h.redirect(detailPath(organisationId, id))
    }

    return renderForm(request, h)
  }
}

export const certificatesOfComplianceAcceptPostController = {
  async handler(request, h) {
    if (!request.yar.get('user')) {
      return redirectToSignIn(request, h)
    }

    const choice = request.payload?.['confirm-accept']
    const { organisationId, id } = request.params

    switch (choice) {
      case 'no':
        return h.redirect(detailPath(organisationId, id))
      case 'yes':
        return approveDeclaration(request, h)
      default:
        return renderForm(request, h, { errors: buildErrors() })
    }
  }
}
