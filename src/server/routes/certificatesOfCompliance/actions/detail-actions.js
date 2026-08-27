import { appendLangQuery } from '#server/common/helpers/i18n/locale-url.js'
import {
  translateActionLabels,
  translateSuccessBanner
} from '../common/locale-strings.js'

export function buildCertificateDetailPath(organisationId, id, locale = 'en') {
  return appendLangQuery(
    `/${organisationId}/certificates-of-compliance/${id}`,
    locale
  )
}

export function buildCertificateDetailActionUrls(
  organisationId,
  id,
  locale = 'en'
) {
  const base = buildCertificateDetailPath(organisationId, id, locale)
  return {
    accept: `${base}/accept`,
    query: `${base}/query`,
    cancel: `${base}/cancel/reason`
  }
}

export function buildCertificateDetailActions(
  reviewStatus,
  organisationId,
  id,
  registrationType,
  locale = 'en'
) {
  const urls = buildCertificateDetailActionUrls(organisationId, id, locale)
  const labels = translateActionLabels(registrationType, locale)
  const showAccept = reviewStatus === 'Pending' || reviewStatus === 'Queried'
  const showCancel = showAccept || reviewStatus === 'Approved'

  return {
    showAccept,
    showCancel,
    labels,
    urls: {
      accept: urls.accept,
      cancel: urls.cancel
    }
  }
}

export function buildCertificateSuccessBanner(
  { showApprovalBanner, showQueryBanner, showCancelBanner },
  registrationType,
  locale = 'en'
) {
  if (showApprovalBanner) {
    return {
      ...translateSuccessBanner(registrationType, 'accepted', locale),
      type: 'accepted'
    }
  }
  if (showCancelBanner) {
    return {
      ...translateSuccessBanner(registrationType, 'cancelled', locale),
      type: 'cancelled'
    }
  }
  if (showQueryBanner) {
    return null
  }
  return null
}
