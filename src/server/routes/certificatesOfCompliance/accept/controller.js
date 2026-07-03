import { config } from '#config/config.js'
import {
  getCertificateOfComplianceDetailViewModel,
  getComplianceDeclarationReviewStatus,
  canApproveComplianceDeclaration
} from '../certificates-of-compliance.service.js'
import {
  redirectToSignIn,
  runApproveAction
} from '../detail/actions-controller.js'

const ERROR_TEXT = 'Select yes or no'

function buildErrors() {
  return {
    summary: [{ text: ERROR_TEXT, href: '#confirm-accept' }],
    confirmAccept: { text: ERROR_TEXT }
  }
}

function detailPath(organisationId, id) {
  return `/${organisationId}/certificates-of-compliance/${id}`
}

async function renderForm(request, h, { errors = null } = {}) {
  const { organisationId, id } = request.params
  const traceId = request.headers[config.get('tracing.header')]
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

export const certificatesOfComplianceAcceptGetController = {
  async handler(request, h) {
    if (!request.yar.get('user')) {
      return redirectToSignIn(request, h)
    }

    const { organisationId, id } = request.params
    const traceId = request.headers[config.get('tracing.header')]
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

    if (choice !== 'yes' && choice !== 'no') {
      return renderForm(request, h, { errors: buildErrors() })
    }

    if (choice === 'no') {
      return h.redirect(detailPath(organisationId, id))
    }

    return runApproveAction(request, h)
  }
}
