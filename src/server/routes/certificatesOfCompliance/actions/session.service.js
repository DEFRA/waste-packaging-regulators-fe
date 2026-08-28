export function getDeclarationSessionKey(organisationId, id) {
  return `${organisationId}/${id}`
}

export const certificateActionSessionKeys = {
  justApproved: 'coc-just-approved',
  justQueried: 'coc-just-queried',
  justCancelled: 'coc-just-cancelled'
}

export function readAndClearCertificateActionBannerFlags(
  session,
  declarationKey
) {
  const showApprovalBanner =
    session.get(certificateActionSessionKeys.justApproved) === declarationKey
  const showQueryBanner =
    session.get(certificateActionSessionKeys.justQueried) === declarationKey
  const showCancelBanner =
    session.get(certificateActionSessionKeys.justCancelled) === declarationKey

  if (showApprovalBanner) {
    session.clear(certificateActionSessionKeys.justApproved)
  }
  if (showQueryBanner) {
    session.clear(certificateActionSessionKeys.justQueried)
  }
  if (showCancelBanner) {
    session.clear(certificateActionSessionKeys.justCancelled)
  }

  return { showApprovalBanner, showQueryBanner, showCancelBanner }
}
