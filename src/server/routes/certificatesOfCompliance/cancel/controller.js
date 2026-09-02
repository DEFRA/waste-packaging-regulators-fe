import { handleApiError } from '#server/common/helpers/handle-api-error.js'
import { getLocale } from '#server/common/helpers/i18n/get-locale.js'
import { localeUrl } from '#server/common/helpers/i18n/locale-url.js'
import { config } from '#config/config.js'
import { cancelComplianceDeclaration } from '../actions/cancel.service.js'
import { getComplianceDeclarationReviewStatus } from '../actions/review-status.service.js'
import {
  certificateActionSessionKeys,
  getDeclarationSessionKey
} from '../actions/session.service.js'
import { canCancelComplianceDeclaration } from '../actions/status.js'
import { getCertificateOfComplianceDetailViewModel } from '../detail/detail.service.js'
import { redirectToSignIn } from '../detail/actions-controller.js'
import { cocPageI18n, translateCoc } from '../common/locale-strings.js'
import {
  buildCancelReasonItems,
  getCancelReasonLabel,
  isValidCancelReason
} from './reasons.js'
import { buildCancellationEmailPreview } from './cancellation-email-preview.service.js'

function detailPath(organisationId, id, locale) {
  return localeUrl(
    `/${organisationId}/certificates-of-compliance/${id}`,
    locale
  )
}

function reasonPath(organisationId, id, reason, locale) {
  const base = `${detailPath(organisationId, id, locale)}/cancel/reason`
  return reason ? `${base}?reason=${encodeURIComponent(reason)}` : base
}

function checkPath(organisationId, id, reason, locale) {
  const base = `${detailPath(organisationId, id, locale)}/cancel/check`
  return reason ? `${base}?reason=${encodeURIComponent(reason)}` : base
}

function emailPreviewPath(organisationId, id, reason, locale) {
  const base = `${detailPath(organisationId, id, locale)}/cancel/email-preview`
  return reason ? `${base}?reason=${encodeURIComponent(reason)}` : base
}

function previewErrorMessages(locale) {
  const i18n = cocPageI18n(locale, 'cancel')
  return {
    'no-recipients': i18n.t('emailPreviewUnavailable.errors.noRecipients'),
    'unknown-template': i18n.t(
      'emailPreviewUnavailable.errors.unknownTemplate'
    ),
    'declaration-not-found': i18n.t(
      'emailPreviewUnavailable.errors.declarationNotFound'
    ),
    'invalid-reason': i18n.t('emailPreviewUnavailable.errors.invalidReason'),
    'notify-not-configured': i18n.t(
      'emailPreviewUnavailable.errors.notifyNotConfigured'
    )
  }
}

function buildErrors(docTypeLower, locale) {
  const i18n = cocPageI18n(locale, 'cancel')
  const text = i18n.t('reason.error', { docTypeLower })
  return {
    summary: [{ text, href: '#cancel-reason' }],
    cancelReason: { text }
  }
}

async function renderReasonForm(
  request,
  h,
  { selected = null, showError = false, locale } = {}
) {
  const resolvedLocale = locale ?? getLocale(request)
  const { organisationId, id } = request.params
  const { companyName, registrationType } =
    await getCertificateOfComplianceDetailViewModel(organisationId, id, {
      traceId: request.getTraceId(),
      locale: resolvedLocale
    })

  const i18n = cocPageI18n(resolvedLocale, 'cancel')
  const docTypeLower =
    registrationType === 'ComplianceScheme'
      ? translateCoc(resolvedLocale, 'common.documentNoun.statement')
      : translateCoc(resolvedLocale, 'common.documentNoun.certificate')
  const errors = showError ? buildErrors(docTypeLower, resolvedLocale) : null
  const titleVerb = errors
    ? i18n.t('reason.titleVerb.error')
    : i18n.t('reason.titleVerb.cancel')

  return h.view('certificatesOfCompliance/cancel/reason', {
    pageTitle: `${titleVerb} ${docTypeLower} — ${companyName}`,
    backlink: detailPath(organisationId, id, resolvedLocale),
    organisationId,
    id,
    companyName,
    docTypeLower,
    reasonItems: buildCancelReasonItems(
      registrationType,
      selected,
      resolvedLocale
    ),
    errors,
    locale: resolvedLocale,
    i18n
  })
}

async function renderCancellationEmailPreview(
  request,
  h,
  { organisationId, id, reason, locale }
) {
  const preview = await buildCancellationEmailPreview({
    organisationId,
    id,
    reasonKey: reason,
    traceId: request.getTraceId(),
    locale
  })

  const i18n = cocPageI18n(locale, 'cancel')
  const errors = previewErrorMessages(locale)

  if (preview.error) {
    return h.view('certificatesOfCompliance/cancel/email-preview-unavailable', {
      pageTitle: i18n.t('emailPreviewUnavailable.pageTitle'),
      message:
        errors[preview.error] ?? i18n.t('emailPreviewUnavailable.fallback'),
      locale,
      i18n
    })
  }

  return h.view('certificatesOfCompliance/cancel/email-preview', {
    pageTitle: preview.subject,
    subject: preview.subject,
    body: preview.body,
    toAddresses: preview.toAddresses,
    assetPath: config.get('assetPath'),
    locale,
    i18n
  })
}

export const certificatesOfComplianceCancelReasonGetController = {
  async handler(request, h) {
    if (!request.yar.get('user')) {
      return redirectToSignIn(request, h)
    }

    const locale = getLocale(request)
    const { organisationId, id } = request.params
    const reviewStatus = await getComplianceDeclarationReviewStatus(
      organisationId,
      id,
      request.getTraceId()
    )

    if (!canCancelComplianceDeclaration(reviewStatus)) {
      return h.redirect(detailPath(organisationId, id, locale))
    }

    const { reason } = request.query
    const selected = isValidCancelReason(reason) ? reason : null

    return renderReasonForm(request, h, { selected, locale })
  }
}

export const certificatesOfComplianceCancelReasonPostController = {
  async handler(request, h) {
    if (!request.yar.get('user')) {
      return redirectToSignIn(request, h)
    }

    const locale = getLocale(request)
    const { organisationId, id } = request.params
    const reason = request.payload?.['cancel-reason']

    if (!isValidCancelReason(reason)) {
      return renderReasonForm(request, h, {
        selected: reason ?? null,
        showError: true,
        locale
      })
    }

    return h.redirect(checkPath(organisationId, id, reason, locale))
  }
}

export const certificatesOfComplianceCancelCheckGetController = {
  async handler(request, h) {
    if (!request.yar.get('user')) {
      return redirectToSignIn(request, h)
    }

    const locale = getLocale(request)
    const { organisationId, id } = request.params
    const reviewStatus = await getComplianceDeclarationReviewStatus(
      organisationId,
      id,
      request.getTraceId()
    )

    if (!canCancelComplianceDeclaration(reviewStatus)) {
      return h.redirect(detailPath(organisationId, id, locale))
    }

    const { reason } = request.query

    if (!isValidCancelReason(reason)) {
      return h.redirect(reasonPath(organisationId, id, null, locale))
    }

    const { companyName, registrationType } =
      await getCertificateOfComplianceDetailViewModel(organisationId, id, {
        traceId: request.getTraceId(),
        locale
      })

    const i18n = cocPageI18n(locale, 'cancel')
    const docTypeLower =
      registrationType === 'ComplianceScheme'
        ? translateCoc(locale, 'common.documentNoun.statement')
        : translateCoc(locale, 'common.documentNoun.certificate')

    return h.view('certificatesOfCompliance/cancel/check', {
      pageTitle: i18n.t('check.pageTitle', { companyName }),
      backlink: reasonPath(organisationId, id, reason, locale),
      organisationId,
      id,
      companyName,
      docTypeLower,
      reason,
      reasonLabel: getCancelReasonLabel(registrationType, reason, locale),
      reasonPath: reasonPath(organisationId, id, reason, locale),
      emailPreviewUrl: emailPreviewPath(organisationId, id, reason, locale),
      locale,
      i18n
    })
  }
}

export const certificatesOfComplianceCancelEmailPreviewGetController = {
  async handler(request, h) {
    if (!request.yar.get('user')) {
      return redirectToSignIn(request, h)
    }

    const locale = getLocale(request)
    const { organisationId, id } = request.params
    const reviewStatus = await getComplianceDeclarationReviewStatus(
      organisationId,
      id,
      request.getTraceId()
    )

    if (!canCancelComplianceDeclaration(reviewStatus)) {
      return h.redirect(detailPath(organisationId, id, locale))
    }

    const { reason } = request.query
    if (!isValidCancelReason(reason)) {
      return h.redirect(reasonPath(organisationId, id, null, locale))
    }

    try {
      return await renderCancellationEmailPreview(request, h, {
        organisationId,
        id,
        reason,
        locale
      })
    } catch (error) {
      return handleApiError(request, error)
    }
  }
}

export const certificatesOfComplianceCancelPostController = {
  async handler(request, h) {
    if (!request.yar.get('user')) {
      return redirectToSignIn(request, h)
    }

    const locale = getLocale(request)
    const { organisationId, id } = request.params
    const declarationKey = getDeclarationSessionKey(organisationId, id)
    const reviewStatus = await getComplianceDeclarationReviewStatus(
      organisationId,
      id,
      request.getTraceId()
    )

    if (reviewStatus === 'Cancelled') {
      request.yar.set(
        certificateActionSessionKeys.justCancelled,
        declarationKey
      )
      return h.redirect(detailPath(organisationId, id, locale))
    }

    const reason = request.payload?.['cancel-reason']
    if (!isValidCancelReason(reason)) {
      return h.redirect(reasonPath(organisationId, id, null, locale))
    }

    const { registrationType, environmentalRegulator } =
      await getCertificateOfComplianceDetailViewModel(organisationId, id, {
        traceId: request.getTraceId(),
        locale
      })
    const reasonLabel = getCancelReasonLabel(registrationType, reason, locale)

    try {
      await cancelComplianceDeclaration(
        organisationId,
        id,
        request.yar.get('user'),
        reasonLabel,
        request.getTraceId(),
        { registrationType, environmentalRegulator }
      )
    } catch (error) {
      handleApiError(request, error)
    }

    request.yar.set(certificateActionSessionKeys.justCancelled, declarationKey)

    return h.redirect(detailPath(organisationId, id, locale))
  }
}
