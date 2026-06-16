import { config } from '#/config/config.js'
import { getCertificateOfComplianceDetailViewModel } from '../certificates-of-compliance.service.js'

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

function acceptPath(organisationId, id) {
  return `${detailPath(organisationId, id)}/accept`
}

async function renderForm(request, h, { errors = null } = {}) {
  const { organisationId, id } = request.params
  const traceId = request.headers[config.get('tracing.header')]
  const { companyName, isComplianceScheme } =
    await getCertificateOfComplianceDetailViewModel(organisationId, id, traceId)

  const docType = isComplianceScheme ? 'statement' : 'certificate'
  const title = `Accept ${docType} — ${companyName}`

  return h.view('certificatesOfCompliance/accept/index', {
    pageTitle: errors ? `Error: ${title}` : title,
    backlink: detailPath(organisationId, id),
    organisationId,
    id,
    companyName,
    isComplianceScheme,
    errors
  })
}

export const certificatesOfComplianceAcceptGetController = {
  async handler(request, h) {
    if (!request.yar.get('user')) {
      request.yar.set('returnTo', request.url.pathname + request.url.search)
      return h.redirect('/signin-oidc')
    }
    return renderForm(request, h)
  }
}

export const certificatesOfComplianceAcceptPostController = {
  async handler(request, h) {
    if (!request.yar.get('user')) {
      request.yar.set(
        'returnTo',
        acceptPath(request.params.organisationId, request.params.id)
      )
      return h.redirect('/signin-oidc')
    }

    const choice = request.payload?.['confirm-accept']
    const { organisationId, id } = request.params

    if (choice !== 'yes' && choice !== 'no') {
      return renderForm(request, h, { errors: buildErrors() })
    }

    if (choice === 'yes') {
      request.yar.flash('acceptSuccess', true)
    }

    return h.redirect(detailPath(organisationId, id))
  }
}
