import { localeUrl } from '#server/common/helpers/i18n/locale-url.js'
import {
  translateActionLabels,
  translateSuccessBanner
} from '../common/locale-strings.js'

export function documentTypeFromRegistrationType(registrationType) {
  return registrationType === 'ComplianceScheme' ? 'statement' : 'certificate'
}

export function buildCertificateDetailPath(
  organisationId,
  id,
  documentType,
  locale = 'en',
  routePrefix = ''
) {
  return localeUrl(
    `${routePrefix}/${organisationId}/${documentType}/${id}`,
    locale
  )
}

export function buildCertificateDetailActionUrls(
  organisationId,
  id,
  documentType,
  locale = 'en',
  routePrefix = ''
) {
  const base = buildCertificateDetailPath(
    organisationId,
    id,
    documentType,
    locale,
    routePrefix
  )
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
  locale = 'en',
  routePrefix = ''
) {
  const documentType = documentTypeFromRegistrationType(registrationType)
  const urls = buildCertificateDetailActionUrls(
    organisationId,
    id,
    documentType,
    locale,
    routePrefix
  )
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
