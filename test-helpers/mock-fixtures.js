// Test-facing projections of the canonical mock data. The MSW handlers serve these
// same records, so values a test derives from here (a declaration's obligations, a
// list row's coverage, the summary counts) match what the running app renders.

import { complianceRecords } from '#mocks/waste-obligations/fixtures.js'
import { accountOrganisations } from '#mocks/account-api/fixtures.js'
import {
  toDeclaration,
  listOrganisationName,
  isSubmittedRecord
} from '#mocks/backends.js'
import { mapDeclarationToItem } from '#server/routes/certificatesOfCompliance/list/list.service.js'
import { calculateObligationCoveragePercentage } from '#server/routes/certificatesOfCompliance/common/display.js'
import { deriveRecyclingObligationsMet } from '#server/routes/certificatesOfCompliance/detail/detail-mapping.js'

export {
  MOCK_DECL_HOWCO_ID,
  MOCK_DECL_HOWCO_PREV_ACCEPTED_ID,
  MOCK_DECL_HOWCO_PREV_CANCELLED_ID,
  MOCK_DECL_CS_PREV_ACCEPTED_ID,
  MOCK_DECL_CS_PREV_CANCELLED_ID
} from '#mocks/identities.js'

export { complianceRecords }

const byKey = (key) => complianceRecords.find((record) => record.key === key)

// Raw API declaration shapes (as GET .../compliance-declarations/{id} returns).
export const declarationByKey = (key) => toDeclaration(byKey(key))

export const mockDetailData = declarationByKey('howco-pending')
export const mockComplianceSchemeDetailData =
  declarationByKey('ecopack-pending')
export const mockDirectProducerAcceptedDetailData =
  declarationByKey('acme-accepted')
export const mockComplianceSchemeAcceptedDetailData = declarationByKey(
  'nationwide-accepted'
)
export const mockDirectProducerPendingNotMetDetailData =
  declarationByKey('greenfield-pending')
export const mockComplianceSchemePendingCompliantDetailData = declarationByKey(
  'greencircle-pending'
)
export const mockComplianceSchemeAcceptedNotMetDetailData =
  declarationByKey('riverside-accepted')
export const mockDirectProducerCancelledDetailData =
  declarationByKey('dp-cancelled')
export const mockCancelledDetailData = mockDirectProducerCancelledDetailData
export const mockComplianceSchemeCancelledDetailData =
  declarationByKey('cs-cancelled')
export const mockQueriedDetailData = declarationByKey('dp-queried')
export const mockComplianceSchemeQueriedDetailData =
  declarationByKey('cs-queried')
export const mockNoObligationsDetailData = declarationByKey('no-obligations')
export const mockEmptyObligationsDetailData =
  declarationByKey('empty-obligations')

export const mockSubmittedAuditEntry = byKey('howco-pending').audit[0]
export const mockComplianceSchemeSubmittedAuditEntry =
  byKey('ecopack-pending').audit[0]

// Default obligation feed (matches what the obligations endpoint serves for an
// organisation with no obligation fixture of its own).
export const mockObligationData = {
  obligations: byKey('redwood-not-submitted').obligations
}

// ---- List rows (as the on-screen table / CSV consume) ----
const submittedListRow = (record) => mapDeclarationToItem(toDeclaration(record))

const notSubmittedListRow = (record) => ({
  id: null,
  organisationId: record.organisationId,
  organisationReferenceNumber: record.organisationReferenceNumber,
  organisationName: listOrganisationName(record),
  recyclingObligationsMet: deriveRecyclingObligationsMet(record.obligations),
  regulation43Met: null,
  obligationCoveragePercentage: calculateObligationCoveragePercentage(
    record.obligations ?? []
  ),
  dateSubmitted: null
})

const rowsFor = (registrationType, submissionStatus) =>
  complianceRecords
    .filter(
      (record) =>
        record.registrationType === registrationType &&
        record.submissionStatus === submissionStatus
    )
    .map((record) =>
      isSubmittedRecord(record)
        ? submittedListRow(record)
        : notSubmittedListRow(record)
    )

export const mockPendingItems = rowsFor('DirectProducer', 'pending')
export const mockAcceptedItems = rowsFor('DirectProducer', 'accepted')
export const mockNotSubmittedItems = rowsFor('DirectProducer', 'not-submitted')
export const mockComplianceSchemePendingItems = rowsFor(
  'ComplianceScheme',
  'pending'
)
export const mockComplianceSchemeAcceptedItems = rowsFor(
  'ComplianceScheme',
  'accepted'
)
export const mockComplianceSchemeNotSubmittedItems = rowsFor(
  'ComplianceScheme',
  'not-submitted'
)

export const mockListByOrganisationType = {
  'direct-producers': {
    pending: mockPendingItems,
    accepted: mockAcceptedItems,
    'not-submitted': mockNotSubmittedItems
  },
  'compliance-schemes': {
    pending: mockComplianceSchemePendingItems,
    accepted: mockComplianceSchemeAcceptedItems,
    'not-submitted': mockComplianceSchemeNotSubmittedItems
  }
}

// ---- Summary counts (computed exactly as getComplianceSummary derives them:
// pending/accepted declaration counts, and not-submitted = listed organisations
// minus submitted, which equals the not-submitted record count). ----
function summaryFor(registrationType) {
  const count = (submissionStatus) =>
    complianceRecords.filter(
      (r) =>
        r.registrationType === registrationType &&
        r.submissionStatus === submissionStatus
    ).length
  return {
    complianceYear: '2026',
    totalPending: count('pending'),
    totalAccepted: count('accepted'),
    totalNotSubmitted: count('not-submitted')
  }
}

export const mockSummaryByOrganisationType = {
  'direct-producers': summaryFor('DirectProducer'),
  'compliance-schemes': summaryFor('ComplianceScheme')
}

export const mockSummary = mockSummaryByOrganisationType['direct-producers']

export { accountOrganisations }
