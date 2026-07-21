import { reviewStatusByDeclarationStatus } from '../common/constants.js'

export function mapDeclarationStatusToReviewStatus(status) {
  return reviewStatusByDeclarationStatus[status] ?? 'Pending'
}

export function canApproveComplianceDeclaration(reviewStatus) {
  return reviewStatus === 'Pending' || reviewStatus === 'Queried'
}

export function canCancelComplianceDeclaration(reviewStatus) {
  return (
    reviewStatus === 'Pending' ||
    reviewStatus === 'Queried' ||
    reviewStatus === 'Approved'
  )
}
