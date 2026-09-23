import { localeUrl } from '#server/common/helpers/i18n/locale-url.js'
import {
  translateActionLabels,
  translateSuccessBanner
} from '../common/locale-strings.js'

export function documentTypeFromRegistrationType(registrationType) {
  return registrationType === 'ComplianceScheme' ? 'statement' : 'certificate'
}

function getBasePath(organisationId, id, documentType, routePrefix = '') {
  return `${routePrefix}/${organisationId}/${documentType}/${id}`
}

export function buildCertificateDetailPath(
  organisationId,
  id,
  documentType,
  locale = 'en',
  routePrefix = ''
) {
  return localeUrl(
    getBasePath(organisationId, id, documentType, routePrefix),
    locale
  )
}

export function buildCertificateDetailActionUrls(
  organisationId,
  id,
  documentType,
  { type, tab, locale = 'en', routePrefix = '' } = {}
) {
  const basePath = getBasePath(organisationId, id, documentType, routePrefix)

  const qs = new URLSearchParams()
  if (type) {
    qs.set('type', type)
  }
  if (tab) {
    qs.set('tab', tab)
  }
  const q = qs.toString() ? `?${qs.toString()}` : ''

  return {
    accept: localeUrl(`${basePath}/accept${q}`, locale),
    query: localeUrl(`${basePath}/query${q}`, locale),
    cancel: localeUrl(`${basePath}/cancel/reason${q}`, locale)
  }
}

export function buildCertificateDetailActions(
  reviewStatus,
  organisationId,
  id,
  registrationType,
  { type, tab, locale = 'en', routePrefix = '' } = {}
) {
  const documentType = documentTypeFromRegistrationType(registrationType)
  const urls = buildCertificateDetailActionUrls(
    organisationId,
    id,
    documentType,
    { type, tab, locale, routePrefix }
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
