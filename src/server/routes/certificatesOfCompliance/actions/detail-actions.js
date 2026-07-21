import {
  certificateActionLabelsByRegistrationType,
  certificateSuccessBannerCopyByRegistrationType
} from '../common/constants.js'

export function buildCertificateDetailActionUrls(organisationId, id) {
  const base = `/${organisationId}/certificates-of-compliance/${id}`
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
  registrationType
) {
  const urls = buildCertificateDetailActionUrls(organisationId, id)
  const labels =
    certificateActionLabelsByRegistrationType[registrationType] ??
    certificateActionLabelsByRegistrationType.DirectProducer
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
  registrationType
) {
  const copyByType =
    certificateSuccessBannerCopyByRegistrationType[registrationType] ??
    certificateSuccessBannerCopyByRegistrationType.DirectProducer

  if (showApprovalBanner) {
    return { ...copyByType.accepted, type: 'accepted' }
  }
  if (showCancelBanner) {
    return { ...copyByType.cancelled, type: 'cancelled' }
  }
  if (showQueryBanner) {
    return null
  }
  return null
}

export { certificateActionLabelsByRegistrationType }
