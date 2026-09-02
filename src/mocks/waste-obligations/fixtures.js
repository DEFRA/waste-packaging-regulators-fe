// waste-obligations mock data: the canonical compliance records, one per
// organisation-declaration. These records are the single source of truth for the
// compliance state; the other backends' data is keyed to the same organisations,
// and their per-material tonnages come from ./obligation-data.js.

import {
  orgs,
  DIRECT_PRODUCER,
  COMPLIANCE_SCHEME,
  MOCK_STATUS_SUBMITTED,
  MOCK_STATUS_ACCEPTED,
  MOCK_STATUS_CANCELLED,
  MOCK_STATUS_QUERIED,
  MOCK_CS_SUBMITTED_TIMESTAMP,
  MOCK_CURRENT_YEAR_ACCEPTED_TIMESTAMP,
  MOCK_CURRENT_YEAR_CANCELLED_TIMESTAMP,
  MOCK_CS_CURRENT_YEAR_ACCEPTED_TIMESTAMP,
  MOCK_CS_CURRENT_YEAR_CANCELLED_TIMESTAMP,
  MOCK_ACCEPTED_ONLY_TIMESTAMP,
  MOCK_CANCELLED_ONLY_TIMESTAMP,
  MOCK_DECL_HOWCO_ID,
  MOCK_DECL_HOWCO_PREV_ACCEPTED_ID,
  MOCK_DECL_HOWCO_PREV_CANCELLED_ID,
  MOCK_DECL_CS_PREV_ACCEPTED_ID,
  MOCK_DECL_CS_PREV_CANCELLED_ID
} from '#mocks/identities.js'
import {
  mockObligationsAllMet,
  mockObligationsMixed,
  mockObligationsMostlyMet,
  mockObligationsAllZero,
  defaultObligations
} from './obligation-data.js'

// Audit-entry builders for the records below.
const mockSubmittedAuditEntry = {
  user: {
    id: 'fa6d3a77-be37-4530-bf7f-7d552ef94170',
    email: 'user@example.com',
    name: 'Test User'
  },
  timestamp: '2026-07-02T16:12:48.816+00:00',
  action: MOCK_STATUS_SUBMITTED
}

const mockComplianceSchemeSubmittedAuditEntry = {
  user: {
    id: 'b1c2d3e4-f5a6-7890-abcd-ef1234567890',
    email: 'jane.doe@ecopack.co.uk',
    name: 'Jane Doe'
  },
  timestamp: MOCK_CS_SUBMITTED_TIMESTAMP,
  action: MOCK_STATUS_SUBMITTED
}

const mockRegulator = {
  id: 'mock-regulator-1',
  name: 'James Walker',
  email: 'mock-regulator-1@example.test'
}
const mockRegulator2 = {
  id: 'mock-regulator-2',
  email: 'mock-regulator-2@example.test'
}
const acceptedAudit = (timestamp, user = mockRegulator) => ({
  action: MOCK_STATUS_ACCEPTED,
  timestamp,
  user
})
const cancelledAudit = (timestamp, reason, user = mockRegulator) => ({
  action: MOCK_STATUS_CANCELLED,
  timestamp,
  user,
  reason
})

// The single canonical fixture. One record per organisation-declaration.
// `submissionStatus` is the listing a record surfaces in — 'pending', 'accepted'
// or 'not-submitted' — or null for a detail-only record reachable by id but never
// listed. Not-submitted records carry no declaration id; their recycling status
// and coverage derive from `obligations` at read time, exactly as a live
// not-submitted organisation would.
export const complianceRecords = [
  {
    key: 'howco-pending',
    registrationType: DIRECT_PRODUCER,
    organisationId: orgs.howco.id,
    organisationName: orgs.howco.name,
    organisationReferenceNumber: orgs.howco.reference,
    companiesHouseNumber: '12345678',
    submissionStatus: 'pending',
    declarationId: MOCK_DECL_HOWCO_ID,
    declarationStatus: MOCK_STATUS_SUBMITTED,
    created: '2027-01-31T00:00:00Z',
    updated: '2027-01-31T00:00:00Z',
    dateSubmitted: '2027-01-31',
    obligationCoveragePercentage: 97,
    obligations: mockObligationsAllMet,
    obligationStatus: 'Met',
    isRegulation43Compliant: true,
    submitterName: 'Catherine Morris',
    audit: [mockSubmittedAuditEntry]
  },
  {
    key: 'greenfield-pending',
    registrationType: DIRECT_PRODUCER,
    organisationId: orgs.greenfield.id,
    organisationName: orgs.greenfield.name,
    organisationReferenceNumber: orgs.greenfield.reference,
    companiesHouseNumber: '23456789',
    submissionStatus: 'pending',
    declarationId: 'decl-204872',
    declarationStatus: MOCK_STATUS_SUBMITTED,
    created: '2027-01-28T00:00:00Z',
    updated: '2027-01-28T00:00:00Z',
    dateSubmitted: '2027-01-28',
    obligationCoveragePercentage: 84,
    obligations: mockObligationsMixed,
    obligationStatus: 'NotMet',
    isRegulation43Compliant: false,
    submitterName: 'Priya Rao',
    audit: [mockSubmittedAuditEntry]
  },

  {
    key: 'acme-accepted',
    registrationType: DIRECT_PRODUCER,
    organisationId: orgs.acme.id,
    organisationName: orgs.acme.name,
    organisationReferenceNumber: orgs.acme.reference,
    companiesHouseNumber: '12345678',
    submissionStatus: 'accepted',
    declarationId: 'decl-309145',
    declarationStatus: MOCK_STATUS_ACCEPTED,
    created: '2027-01-15T00:00:00Z',
    updated: '2027-01-15T14:30:00Z',
    dateSubmitted: '2027-01-15',
    obligationCoveragePercentage: 100,
    obligations: mockObligationsAllMet,
    obligationStatus: 'Met',
    isRegulation43Compliant: true,
    submitterName: 'Catherine Morris',
    audit: [mockSubmittedAuditEntry, acceptedAudit('2027-01-15T14:30:00Z')]
  },
  {
    key: 'bluesky-accepted',
    registrationType: DIRECT_PRODUCER,
    organisationId: orgs.bluesky.id,
    organisationName: orgs.bluesky.name,
    organisationReferenceNumber: orgs.bluesky.reference,
    companiesHouseNumber: '12345678',
    submissionStatus: 'accepted',
    declarationId: 'decl-412067',
    declarationStatus: MOCK_STATUS_ACCEPTED,
    created: '2027-01-10T00:00:00Z',
    updated: '2027-01-10T00:00:00Z',
    dateSubmitted: '2027-01-10',
    obligationCoveragePercentage: 89,
    obligations: mockObligationsMixed,
    obligationStatus: 'NotMet',
    isRegulation43Compliant: false,
    submitterName: 'Catherine Morris',
    audit: [mockSubmittedAuditEntry, acceptedAudit('2027-01-15T14:30:00Z')]
  },

  {
    key: 'sterling-not-submitted',
    registrationType: DIRECT_PRODUCER,
    organisationId: orgs.sterling.id,
    organisationName: orgs.sterling.name,
    organisationReferenceNumber: orgs.sterling.reference,
    submissionStatus: 'not-submitted',
    declarationId: null,
    obligations: null
  },
  {
    key: 'pinnacle-not-submitted',
    registrationType: DIRECT_PRODUCER,
    organisationId: orgs.pinnacle.id,
    organisationName: orgs.pinnacle.name,
    organisationReferenceNumber: orgs.pinnacle.reference,
    submissionStatus: 'not-submitted',
    declarationId: null,
    obligations: []
  },
  {
    key: 'redwood-not-submitted',
    registrationType: DIRECT_PRODUCER,
    organisationId: orgs.redwood.id,
    organisationName: orgs.redwood.name,
    organisationReferenceNumber: orgs.redwood.reference,
    submissionStatus: 'not-submitted',
    declarationId: null,
    // No own obligations — uses the default (all NoDataYet) obligations.
    obligations: defaultObligations
  },
  {
    key: 'meridian-not-submitted',
    registrationType: DIRECT_PRODUCER,
    organisationId: orgs.meridian.id,
    organisationName: orgs.meridian.name,
    organisationReferenceNumber: orgs.meridian.reference,
    submissionStatus: 'not-submitted',
    declarationId: null,
    obligations: mockObligationsAllZero
  },
  {
    key: 'coastal-not-submitted',
    registrationType: DIRECT_PRODUCER,
    organisationId: orgs.coastal.id,
    organisationName: orgs.coastal.name,
    organisationReferenceNumber: orgs.coastal.reference,
    submissionStatus: 'not-submitted',
    declarationId: null,
    obligations: mockObligationsAllMet
  },
  {
    key: 'thornbury-not-submitted',
    registrationType: DIRECT_PRODUCER,
    organisationId: orgs.thornbury.id,
    organisationName: orgs.thornbury.name,
    organisationReferenceNumber: orgs.thornbury.reference,
    submissionStatus: 'not-submitted',
    declarationId: null,
    obligations: mockObligationsMostlyMet
  },

  {
    key: 'ecopack-pending',
    registrationType: COMPLIANCE_SCHEME,
    organisationId: orgs.ecopack.id,
    organisationName: null,
    complianceSchemeName: orgs.ecopack.name,
    schemeOperatorName: orgs.ecopack.operatorName,
    organisationReferenceNumber: orgs.ecopack.reference,
    companiesHouseNumber: orgs.ecopack.companiesHouseNumber,
    submissionStatus: 'pending',
    declarationId: 'decl-cs-001',
    declarationStatus: MOCK_STATUS_SUBMITTED,
    created: MOCK_CS_SUBMITTED_TIMESTAMP,
    updated: MOCK_CS_SUBMITTED_TIMESTAMP,
    dateSubmitted: '2027-01-20',
    obligationCoveragePercentage: 100,
    obligations: mockObligationsAllMet,
    obligationStatus: 'Met',
    isRegulation43Compliant: false,
    submitterName: 'Jane Doe',
    audit: [mockComplianceSchemeSubmittedAuditEntry]
  },
  {
    key: 'greencircle-pending',
    registrationType: COMPLIANCE_SCHEME,
    organisationId: orgs.greencircle.id,
    organisationName: null,
    complianceSchemeName: orgs.greencircle.name,
    schemeOperatorName: orgs.greencircle.operatorName,
    organisationReferenceNumber: orgs.greencircle.reference,
    companiesHouseNumber: orgs.greencircle.companiesHouseNumber,
    submissionStatus: 'pending',
    declarationId: 'decl-cs-002',
    declarationStatus: MOCK_STATUS_SUBMITTED,
    created: '2027-01-18T00:00:00Z',
    updated: '2027-01-18T00:00:00Z',
    dateSubmitted: '2027-01-18',
    obligationCoveragePercentage: 100,
    obligations: mockObligationsMixed,
    obligationStatus: 'NotMet',
    isRegulation43Compliant: true,
    submitterName: 'Aled Bevan',
    audit: [mockComplianceSchemeSubmittedAuditEntry]
  },
  {
    key: 'kestrel-pending',
    registrationType: COMPLIANCE_SCHEME,
    organisationId: orgs.kestrel.id,
    organisationName: null,
    complianceSchemeName: orgs.kestrel.name,
    schemeOperatorName: orgs.kestrel.operatorName,
    organisationReferenceNumber: orgs.kestrel.reference,
    companiesHouseNumber: orgs.kestrel.companiesHouseNumber,
    submissionStatus: 'pending',
    declarationId: 'decl-cs-003',
    declarationStatus: MOCK_STATUS_SUBMITTED,
    created: '2027-01-16T10:30:00Z',
    updated: '2027-01-16T10:30:00Z',
    dateSubmitted: '2027-01-16',
    obligationCoveragePercentage: 100,
    obligations: mockObligationsAllMet,
    obligationStatus: 'Met',
    isRegulation43Compliant: true,
    submitterName: 'Jane Doe',
    audit: [mockComplianceSchemeSubmittedAuditEntry]
  },
  {
    key: 'larchwood-pending',
    registrationType: COMPLIANCE_SCHEME,
    organisationId: orgs.larchwood.id,
    organisationName: null,
    complianceSchemeName: orgs.larchwood.name,
    schemeOperatorName: orgs.larchwood.operatorName,
    organisationReferenceNumber: orgs.larchwood.reference,
    companiesHouseNumber: orgs.larchwood.companiesHouseNumber,
    submissionStatus: 'pending',
    declarationId: 'decl-cs-004',
    declarationStatus: MOCK_STATUS_SUBMITTED,
    created: '2027-01-14T14:05:00Z',
    updated: '2027-01-14T14:05:00Z',
    dateSubmitted: '2027-01-14',
    obligationCoveragePercentage: 61,
    obligations: mockObligationsMixed,
    obligationStatus: 'NotMet',
    isRegulation43Compliant: false,
    submitterName: 'Jane Doe',
    audit: [mockComplianceSchemeSubmittedAuditEntry]
  },

  {
    key: 'nationwide-accepted',
    registrationType: COMPLIANCE_SCHEME,
    organisationId: orgs.nationwide.id,
    organisationName: null,
    complianceSchemeName: orgs.nationwide.name,
    schemeOperatorName: orgs.nationwide.operatorName,
    organisationReferenceNumber: orgs.nationwide.reference,
    companiesHouseNumber: orgs.nationwide.companiesHouseNumber,
    submissionStatus: 'accepted',
    declarationId: 'decl-cs-101',
    declarationStatus: MOCK_STATUS_ACCEPTED,
    created: '2027-01-12T00:00:00Z',
    updated: '2027-01-12T12:05:00Z',
    dateSubmitted: '2027-01-12',
    obligationCoveragePercentage: 100,
    obligations: mockObligationsAllMet,
    obligationStatus: 'Met',
    isRegulation43Compliant: true,
    submitterName: 'Jane Doe',
    audit: [
      mockComplianceSchemeSubmittedAuditEntry,
      acceptedAudit('2027-01-12T12:05:00Z')
    ]
  },
  {
    key: 'riverside-accepted',
    registrationType: COMPLIANCE_SCHEME,
    organisationId: orgs.riverside.id,
    organisationName: null,
    complianceSchemeName: orgs.riverside.name,
    schemeOperatorName: orgs.riverside.operatorName,
    organisationReferenceNumber: orgs.riverside.reference,
    companiesHouseNumber: orgs.riverside.companiesHouseNumber,
    submissionStatus: 'accepted',
    declarationId: 'decl-cs-102',
    declarationStatus: MOCK_STATUS_ACCEPTED,
    created: '2027-01-08T00:00:00Z',
    updated: '2027-01-08T00:00:00Z',
    dateSubmitted: '2027-01-08',
    obligationCoveragePercentage: 92,
    obligations: mockObligationsMixed,
    obligationStatus: 'NotMet',
    isRegulation43Compliant: false,
    submitterName: 'Hana Okonkwo',
    audit: [mockComplianceSchemeSubmittedAuditEntry]
  },
  {
    key: 'ashcroft-accepted',
    registrationType: COMPLIANCE_SCHEME,
    organisationId: orgs.ashcroft.id,
    organisationName: null,
    complianceSchemeName: orgs.ashcroft.name,
    schemeOperatorName: orgs.ashcroft.operatorName,
    organisationReferenceNumber: orgs.ashcroft.reference,
    companiesHouseNumber: orgs.ashcroft.companiesHouseNumber,
    submissionStatus: 'accepted',
    declarationId: 'decl-cs-103',
    declarationStatus: MOCK_STATUS_ACCEPTED,
    created: '2027-01-06T10:15:00Z',
    updated: '2027-01-06T10:15:00Z',
    dateSubmitted: '2027-01-06',
    obligationCoveragePercentage: 108,
    obligations: mockObligationsAllMet,
    obligationStatus: 'Met',
    isRegulation43Compliant: true,
    submitterName: 'Jane Doe',
    audit: [
      mockComplianceSchemeSubmittedAuditEntry,
      acceptedAudit('2027-01-06T10:15:00Z')
    ]
  },
  {
    key: 'bramble-accepted',
    registrationType: COMPLIANCE_SCHEME,
    organisationId: orgs.bramble.id,
    organisationName: null,
    complianceSchemeName: orgs.bramble.name,
    schemeOperatorName: orgs.bramble.operatorName,
    organisationReferenceNumber: orgs.bramble.reference,
    companiesHouseNumber: orgs.bramble.companiesHouseNumber,
    submissionStatus: 'accepted',
    declarationId: 'decl-cs-104',
    declarationStatus: MOCK_STATUS_ACCEPTED,
    created: '2027-01-05T09:40:00Z',
    updated: '2027-01-05T09:40:00Z',
    dateSubmitted: '2027-01-05',
    obligationCoveragePercentage: 101,
    obligations: mockObligationsAllMet,
    obligationStatus: 'Met',
    isRegulation43Compliant: false,
    submitterName: 'Jane Doe',
    audit: [
      mockComplianceSchemeSubmittedAuditEntry,
      acceptedAudit('2027-01-05T09:40:00Z')
    ]
  },
  {
    key: 'caldera-accepted',
    registrationType: COMPLIANCE_SCHEME,
    organisationId: orgs.caldera.id,
    organisationName: null,
    complianceSchemeName: orgs.caldera.name,
    schemeOperatorName: orgs.caldera.operatorName,
    organisationReferenceNumber: orgs.caldera.reference,
    companiesHouseNumber: orgs.caldera.companiesHouseNumber,
    submissionStatus: 'accepted',
    declarationId: 'decl-cs-105',
    declarationStatus: MOCK_STATUS_ACCEPTED,
    created: '2027-01-04T15:20:00Z',
    updated: '2027-01-04T15:20:00Z',
    dateSubmitted: '2027-01-04',
    obligationCoveragePercentage: 87,
    obligations: mockObligationsMixed,
    obligationStatus: 'NotMet',
    isRegulation43Compliant: true,
    submitterName: 'Jane Doe',
    audit: [
      mockComplianceSchemeSubmittedAuditEntry,
      acceptedAudit('2027-01-04T15:20:00Z')
    ]
  },
  {
    key: 'dovetail-accepted',
    registrationType: COMPLIANCE_SCHEME,
    organisationId: orgs.dovetail.id,
    organisationName: null,
    complianceSchemeName: orgs.dovetail.name,
    schemeOperatorName: orgs.dovetail.operatorName,
    organisationReferenceNumber: orgs.dovetail.reference,
    companiesHouseNumber: orgs.dovetail.companiesHouseNumber,
    submissionStatus: 'accepted',
    declarationId: 'decl-cs-106',
    declarationStatus: MOCK_STATUS_ACCEPTED,
    created: '2027-01-02T11:00:00Z',
    updated: '2027-01-02T11:00:00Z',
    dateSubmitted: '2027-01-02',
    obligationCoveragePercentage: 115,
    obligations: mockObligationsAllMet,
    obligationStatus: 'Met',
    isRegulation43Compliant: true,
    submitterName: 'Jane Doe',
    audit: [
      mockComplianceSchemeSubmittedAuditEntry,
      acceptedAudit('2027-01-02T11:00:00Z')
    ]
  },

  {
    key: 'futurepack-not-submitted',
    registrationType: COMPLIANCE_SCHEME,
    organisationId: orgs.futurepack.id,
    organisationName: null,
    complianceSchemeName: orgs.futurepack.name,
    schemeOperatorName: orgs.futurepack.operatorName,
    organisationReferenceNumber: orgs.futurepack.reference,
    submissionStatus: 'not-submitted',
    declarationId: null,
    obligations: mockObligationsAllMet
  },
  {
    key: 'metroline-not-submitted',
    registrationType: COMPLIANCE_SCHEME,
    organisationId: orgs.metroline.id,
    organisationName: null,
    complianceSchemeName: orgs.metroline.name,
    schemeOperatorName: orgs.metroline.operatorName,
    organisationReferenceNumber: orgs.metroline.reference,
    submissionStatus: 'not-submitted',
    declarationId: null,
    obligations: mockObligationsMixed
  },
  {
    key: 'southgate-not-submitted',
    registrationType: COMPLIANCE_SCHEME,
    organisationId: orgs.southgate.id,
    organisationName: null,
    complianceSchemeName: orgs.southgate.name,
    schemeOperatorName: orgs.southgate.operatorName,
    organisationReferenceNumber: orgs.southgate.reference,
    submissionStatus: 'not-submitted',
    declarationId: null,
    // Default obligations → recycling "No data".
    obligations: defaultObligations
  },

  {
    key: 'dp-cancelled',
    registrationType: DIRECT_PRODUCER,
    organisationId: orgs.ashfield.id,
    organisationName: orgs.ashfield.name,
    organisationReferenceNumber: '440921',
    companiesHouseNumber: '12345678',
    submissionStatus: null,
    declarationId: 'decl-dp-cancelled',
    declarationStatus: MOCK_STATUS_CANCELLED,
    created: '2027-01-31T00:00:00Z',
    updated: '2026-03-10T09:15:00Z',
    dateSubmitted: '2027-01-31',
    obligations: mockObligationsAllMet,
    obligationStatus: 'Met',
    isRegulation43Compliant: true,
    submitterName: 'Catherine Morris',
    audit: [
      mockSubmittedAuditEntry,
      cancelledAudit('2026-03-10T09:15:00Z', 'Submitted after the deadline.')
    ]
  },
  {
    key: 'cs-cancelled',
    registrationType: COMPLIANCE_SCHEME,
    organisationId: orgs.beacon.id,
    organisationName: null,
    complianceSchemeName: orgs.beacon.name,
    schemeOperatorName: orgs.beacon.operatorName,
    organisationReferenceNumber: '221105',
    companiesHouseNumber: orgs.beacon.companiesHouseNumber,
    submissionStatus: null,
    declarationId: 'decl-cs-cancelled',
    declarationStatus: MOCK_STATUS_CANCELLED,
    created: MOCK_CS_SUBMITTED_TIMESTAMP,
    updated: '2026-03-08T11:30:00Z',
    dateSubmitted: '2027-01-20',
    obligations: mockObligationsAllMet,
    obligationStatus: 'Met',
    isRegulation43Compliant: false,
    submitterName: 'Jane Doe',
    audit: [
      mockComplianceSchemeSubmittedAuditEntry,
      cancelledAudit(
        '2026-03-08T11:30:00Z',
        'Incomplete member data submitted.'
      )
    ]
  },
  {
    key: 'dp-queried',
    registrationType: DIRECT_PRODUCER,
    organisationId: orgs.howco.id,
    organisationName: orgs.howco.name,
    organisationReferenceNumber: orgs.howco.reference,
    companiesHouseNumber: '12345678',
    submissionStatus: null,
    declarationId: 'decl-queried',
    declarationStatus: MOCK_STATUS_QUERIED,
    created: '2027-01-31T00:00:00Z',
    updated: '2027-01-31T00:00:00Z',
    dateSubmitted: '2027-01-31',
    obligations: mockObligationsAllMet,
    obligationStatus: 'Met',
    isRegulation43Compliant: true,
    submitterName: 'Catherine Morris',
    audit: [mockSubmittedAuditEntry],
    queryDetails: {
      queriedMaterials: 'Plastic, Steel',
      reason: 'Tonnage figures do not match submitted evidence.',
      dateQueried: '2026-03-17T00:00:00Z'
    }
  },
  {
    key: 'cs-queried',
    registrationType: COMPLIANCE_SCHEME,
    organisationId: orgs.ecopack.id,
    organisationName: null,
    complianceSchemeName: orgs.ecopack.name,
    schemeOperatorName: orgs.ecopack.operatorName,
    organisationReferenceNumber: orgs.ecopack.reference,
    companiesHouseNumber: orgs.ecopack.companiesHouseNumber,
    submissionStatus: null,
    declarationId: 'decl-cs-queried',
    declarationStatus: MOCK_STATUS_QUERIED,
    created: MOCK_CS_SUBMITTED_TIMESTAMP,
    updated: MOCK_CS_SUBMITTED_TIMESTAMP,
    dateSubmitted: '2027-01-20',
    obligations: mockObligationsAllMet,
    obligationStatus: 'Met',
    isRegulation43Compliant: false,
    submitterName: 'Jane Doe',
    audit: [mockComplianceSchemeSubmittedAuditEntry],
    queryDetails: {
      queriedMaterials: 'Plastic',
      reason: 'Scheme member totals require clarification.',
      dateQueried: '2026-03-15T00:00:00Z'
    }
  },
  {
    key: 'no-obligations',
    registrationType: DIRECT_PRODUCER,
    organisationId: orgs.sterling.id,
    organisationName: orgs.sterling.name,
    organisationReferenceNumber: orgs.sterling.reference,
    companiesHouseNumber: '12345678',
    submissionStatus: null,
    declarationId: 'decl-no-obligations',
    declarationStatus: MOCK_STATUS_SUBMITTED,
    created: '2027-01-31T00:00:00Z',
    updated: '2027-01-31T00:00:00Z',
    dateSubmitted: '2027-01-31',
    obligations: null,
    obligationStatus: null,
    isRegulation43Compliant: true,
    submitterName: 'Catherine Morris',
    audit: [mockSubmittedAuditEntry]
  },
  {
    key: 'empty-obligations',
    registrationType: DIRECT_PRODUCER,
    organisationId: orgs.pinnacle.id,
    organisationName: orgs.pinnacle.name,
    organisationReferenceNumber: orgs.pinnacle.reference,
    companiesHouseNumber: '12345678',
    submissionStatus: null,
    declarationId: 'decl-empty-obligations',
    declarationStatus: MOCK_STATUS_SUBMITTED,
    created: '2027-01-31T00:00:00Z',
    updated: '2027-01-31T00:00:00Z',
    dateSubmitted: '2027-01-31',
    obligations: [],
    obligationStatus: null,
    isRegulation43Compliant: true,
    submitterName: 'Catherine Morris',
    audit: [mockSubmittedAuditEntry]
  },

  {
    key: 'howco-prev-accepted',
    registrationType: DIRECT_PRODUCER,
    organisationId: orgs.howco.id,
    organisationName: orgs.howco.name,
    organisationReferenceNumber: orgs.howco.reference,
    companiesHouseNumber: '12345678',
    submissionStatus: null,
    declarationId: MOCK_DECL_HOWCO_PREV_ACCEPTED_ID,
    declarationStatus: MOCK_STATUS_ACCEPTED,
    created: MOCK_CURRENT_YEAR_ACCEPTED_TIMESTAMP,
    updated: MOCK_CURRENT_YEAR_ACCEPTED_TIMESTAMP,
    dateSubmitted: '2026-02-13',
    obligations: mockObligationsAllMet,
    obligationStatus: 'Met',
    isRegulation43Compliant: true,
    submitterName: 'Test Submitter A',
    audit: [acceptedAudit(MOCK_CURRENT_YEAR_ACCEPTED_TIMESTAMP)]
  },
  {
    key: 'howco-prev-cancelled',
    registrationType: DIRECT_PRODUCER,
    organisationId: orgs.howco.id,
    organisationName: orgs.howco.name,
    organisationReferenceNumber: orgs.howco.reference,
    companiesHouseNumber: '12345678',
    submissionStatus: null,
    declarationId: MOCK_DECL_HOWCO_PREV_CANCELLED_ID,
    declarationStatus: MOCK_STATUS_CANCELLED,
    created: MOCK_CURRENT_YEAR_CANCELLED_TIMESTAMP,
    updated: MOCK_CURRENT_YEAR_CANCELLED_TIMESTAMP,
    dateSubmitted: '2026-05-22',
    obligations: mockObligationsAllMet,
    obligationStatus: 'Met',
    isRegulation43Compliant: true,
    submitterName: 'Test Submitter A',
    audit: [
      cancelledAudit(
        MOCK_CURRENT_YEAR_CANCELLED_TIMESTAMP,
        'Test cancellation reason'
      )
    ]
  },
  {
    key: 'cs-prev-accepted',
    registrationType: COMPLIANCE_SCHEME,
    organisationId: orgs.ecopack.id,
    organisationName: null,
    complianceSchemeName: orgs.ecopack.name,
    schemeOperatorName: orgs.ecopack.operatorName,
    organisationReferenceNumber: orgs.ecopack.reference,
    companiesHouseNumber: orgs.ecopack.companiesHouseNumber,
    submissionStatus: null,
    declarationId: MOCK_DECL_CS_PREV_ACCEPTED_ID,
    declarationStatus: MOCK_STATUS_ACCEPTED,
    created: MOCK_CS_CURRENT_YEAR_ACCEPTED_TIMESTAMP,
    updated: MOCK_CS_CURRENT_YEAR_ACCEPTED_TIMESTAMP,
    dateSubmitted: '2026-03-04',
    obligations: mockObligationsAllMet,
    obligationStatus: 'Met',
    isRegulation43Compliant: false,
    submitterName: 'Test Submitter B',
    audit: [
      acceptedAudit(MOCK_CS_CURRENT_YEAR_ACCEPTED_TIMESTAMP, mockRegulator2)
    ]
  },
  {
    key: 'cs-prev-cancelled',
    registrationType: COMPLIANCE_SCHEME,
    organisationId: orgs.ecopack.id,
    organisationName: null,
    complianceSchemeName: orgs.ecopack.name,
    schemeOperatorName: orgs.ecopack.operatorName,
    organisationReferenceNumber: orgs.ecopack.reference,
    companiesHouseNumber: orgs.ecopack.companiesHouseNumber,
    submissionStatus: null,
    declarationId: MOCK_DECL_CS_PREV_CANCELLED_ID,
    declarationStatus: MOCK_STATUS_CANCELLED,
    created: MOCK_CS_CURRENT_YEAR_CANCELLED_TIMESTAMP,
    updated: MOCK_CS_CURRENT_YEAR_CANCELLED_TIMESTAMP,
    dateSubmitted: '2026-05-12',
    obligations: mockObligationsAllMet,
    obligationStatus: 'Met',
    isRegulation43Compliant: false,
    submitterName: 'Test Submitter B',
    audit: [
      cancelledAudit(
        MOCK_CS_CURRENT_YEAR_CANCELLED_TIMESTAMP,
        'Tonnage discrepancy identified',
        mockRegulator2
      )
    ]
  },
  {
    key: 'accepted-only',
    registrationType: DIRECT_PRODUCER,
    organisationId: orgs.hill.id,
    organisationName: orgs.hill.name,
    organisationReferenceNumber: orgs.hill.reference,
    companiesHouseNumber: '12345678',
    submissionStatus: null,
    declarationId: 'decl-accepted-only',
    declarationStatus: MOCK_STATUS_ACCEPTED,
    created: MOCK_ACCEPTED_ONLY_TIMESTAMP,
    updated: MOCK_ACCEPTED_ONLY_TIMESTAMP,
    dateSubmitted: '2026-04-15',
    obligations: mockObligationsAllMet,
    obligationStatus: 'Met',
    isRegulation43Compliant: true,
    submitterName: 'Test Submitter D',
    audit: [acceptedAudit(MOCK_ACCEPTED_ONLY_TIMESTAMP)]
  },
  {
    key: 'cancelled-only',
    registrationType: DIRECT_PRODUCER,
    organisationId: orgs.riverdale.id,
    organisationName: orgs.riverdale.name,
    organisationReferenceNumber: orgs.riverdale.reference,
    companiesHouseNumber: '12345678',
    submissionStatus: null,
    declarationId: 'decl-cancelled-only',
    declarationStatus: MOCK_STATUS_CANCELLED,
    created: MOCK_CANCELLED_ONLY_TIMESTAMP,
    updated: MOCK_CANCELLED_ONLY_TIMESTAMP,
    dateSubmitted: '2026-04-08',
    obligations: mockObligationsAllMet,
    obligationStatus: 'Met',
    isRegulation43Compliant: true,
    submitterName: 'Test Submitter C',
    audit: [
      cancelledAudit(
        MOCK_CANCELLED_ONLY_TIMESTAMP,
        'Information could not be verified'
      )
    ]
  }
]
