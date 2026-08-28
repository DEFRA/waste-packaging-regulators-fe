import { config } from '#config/config.js'
import { handleApiError } from '#server/common/helpers/handle-api-error.js'
import { getLocale } from '#server/common/helpers/i18n/get-locale.js'
import { localeUrl } from '#server/common/helpers/i18n/locale-url.js'
import { approveComplianceDeclaration } from '../actions/approve.service.js'
import { getComplianceDeclarationReviewStatus } from '../actions/review-status.service.js'
import {
  certificateActionSessionKeys,
  getDeclarationSessionKey
} from '../actions/session.service.js'
import { canApproveComplianceDeclaration } from '../actions/status.js'
import { getCertificateOfComplianceDetailViewModel } from '../detail/detail.service.js'
import { redirectToSignIn } from '../detail/actions-controller.js'
import { cocPageI18n, translateCoc } from '../common/locale-strings.js'

const TRACING_HEADER = 'tracing.header'

function buildErrors(locale) {
  const i18n = cocPageI18n(locale, 'accept')
  const text = i18n.t('error')
  return {
    summary: [{ text, href: '#confirm-accept' }],
    confirmAccept: { text }
  }
}

function detailPath(organisationId, id, locale) {
  return localeUrl(
    `/${organisationId}/certificates-of-compliance/${id}`,
    locale
  )
}

function getTraceIdFromRequest(request) {
  return request.headers[config.get(TRACING_HEADER)]
}

async function renderForm(request, h, { errors = null, locale } = {}) {
  const resolvedLocale = locale ?? getLocale(request)
  const { organisationId, id } = request.params
  const traceId = getTraceIdFromRequest(request)
  const { companyName, registrationType } =
    await getCertificateOfComplianceDetailViewModel(organisationId, id, {
      traceId,
      locale: resolvedLocale
    })

  const i18n = cocPageI18n(resolvedLocale, 'accept')
  const docTypeLower =
    registrationType === 'ComplianceScheme'
      ? translateCoc(resolvedLocale, 'common.documentNoun.statement')
      : translateCoc(resolvedLocale, 'common.documentNoun.certificate')
  const titleVerb = errors
    ? i18n.t('titleVerb.error')
    : i18n.t('titleVerb.accept')

  return h.view('certificatesOfCompliance/accept/index', {
    pageTitle: `${titleVerb} ${docTypeLower} — ${companyName}`,
    backlink: detailPath(organisationId, id, resolvedLocale),
    organisationId,
    id,
    companyName,
    registrationType,
    docTypeLower,
    errors,
    locale: resolvedLocale,
    i18n
  })
}

async function approveDeclaration(request, h, locale) {
  const { organisationId, id } = request.params
  const traceId = request.headers[config.get('tracing.header')]
  const declarationKey = getDeclarationSessionKey(organisationId, id)
  const reviewStatus = await getComplianceDeclarationReviewStatus(
    organisationId,
    id,
    traceId
  )

  if (reviewStatus === 'Approved') {
    request.yar.set(certificateActionSessionKeys.justApproved, declarationKey)
    return h.redirect(detailPath(organisationId, id, locale))
  }

  if (!canApproveComplianceDeclaration(reviewStatus)) {
    return h.redirect(detailPath(organisationId, id, locale))
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

  request.yar.set(certificateActionSessionKeys.justApproved, declarationKey)

  return h.redirect(detailPath(organisationId, id, locale))
}

export const certificatesOfComplianceAcceptGetController = {
  async handler(request, h) {
    if (!request.yar.get('user')) {
      return redirectToSignIn(request, h)
    }

    const locale = getLocale(request)
    const { organisationId, id } = request.params
    const traceId = getTraceIdFromRequest(request)
    const reviewStatus = await getComplianceDeclarationReviewStatus(
      organisationId,
      id,
      traceId
    )

    if (!canApproveComplianceDeclaration(reviewStatus)) {
      return h.redirect(detailPath(organisationId, id, locale))
    }

    return renderForm(request, h, { locale })
  }
}

export const certificatesOfComplianceAcceptPostController = {
  async handler(request, h) {
    if (!request.yar.get('user')) {
      return redirectToSignIn(request, h)
    }

    const locale = getLocale(request)
    const choice = request.payload?.['confirm-accept']
    const { organisationId, id } = request.params

    switch (choice) {
      case 'no':
        return h.redirect(detailPath(organisationId, id, locale))
      case 'yes':
        return approveDeclaration(request, h, locale)
      default:
        return renderForm(request, h, { errors: buildErrors(locale), locale })
    }
  }
}
