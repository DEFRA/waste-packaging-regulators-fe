// Re-export barrel kept for tests until follow-up PR migrates test imports.
// Production controllers import directly from list/, detail/, and actions/ modules.

export {
  mockSummary,
  mockDetailData,
  mockObligationData,
  mockPendingItems,
  mockAcceptedItems,
  mockNotSubmittedItems,
  mockComplianceSchemePendingItems,
  mockComplianceSchemeAcceptedItems,
  mockComplianceSchemeDetailData,
  mockDirectProducerAcceptedDetailData,
  mockDirectProducerCancelledDetailData,
  mockComplianceSchemeAcceptedDetailData,
  mockComplianceSchemeCancelledDetailData
} from './certificates-of-compliance.mock.js'

export {
  displayOrNoData,
  complianceDocumentNoun,
  buildComplianceTypeLabel,
  buildRegulation43Statement
} from './common/display.js'

export { deriveRegistrationType } from './common/registration-type.js'
export {
  mapCompaniesHouseNumberFromWasteOrganisation,
  mapWasteOrganisationToDetailFields
} from './common/registration-type.js'

export { getCertificatesOfComplianceViewModel } from './list/list.service.js'

export { getCertificateOfComplianceDetailViewModel } from './detail/detail.service.js'
export { findSubmittedAuditUser } from './detail/audit.js'

export {
  mapDeclarationStatusToReviewStatus,
  canApproveComplianceDeclaration,
  canCancelComplianceDeclaration
} from './actions/status.js'

export {
  buildCertificateDetailActionUrls,
  buildCertificateDetailActions,
  buildCertificateSuccessBanner
} from './actions/detail-actions.js'

export {
  getDeclarationSessionKey,
  certificateActionSessionKeys,
  setMockDeclarationStatusOverride,
  readAndClearCertificateActionBannerFlags
} from './actions/session.service.js'

export {
  mapSessionUserToApiUser,
  approveComplianceDeclaration
} from './actions/approve.service.js'

export { cancelComplianceDeclaration } from './actions/cancel.service.js'

export { getComplianceDeclarationReviewStatus } from './actions/review-status.service.js'
