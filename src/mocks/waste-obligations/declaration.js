// Pure projections of a compliance record to the raw API shapes the frontend
// reads. No state — the store composes these over its record set.

import {
  OBLIGATION_YEAR,
  COMPLIANCE_SCHEME,
  mockRegulatorName,
  mockRegulatorEmail
} from '#mocks/identities.js'

export function isSubmittedRecord(record) {
  return record.declarationId != null
}

// The organisation name a list/search row displays: the scheme operator for
// compliance schemes, the organisation name for direct producers.
export function listOrganisationName(record) {
  return record.registrationType === COMPLIANCE_SCHEME
    ? record.schemeOperatorName
    : record.organisationName
}

// The declaration shape returned by both GET /compliance-declarations (list rows)
// and GET /organisations/{organisationId}/compliance-declarations/{id} (detail).
export function toDeclaration(record) {
  const declaration = {
    id: record.declarationId,
    created: record.created,
    updated: record.updated,
    status: record.declarationStatus,
    organisation: {
      id: record.organisationId,
      registrationType: record.registrationType,
      name: record.organisationName ?? null,
      complianceSchemeName: record.complianceSchemeName ?? null,
      schemeOperatorName: record.schemeOperatorName ?? null,
      referenceNumber: record.organisationReferenceNumber,
      address: {},
      regulator: mockRegulatorName,
      regulatorEmail: mockRegulatorEmail,
      companiesHouseNumber: record.companiesHouseNumber ?? null
    },
    obligationYear: OBLIGATION_YEAR,
    obligations: record.obligations,
    obligationStatus: record.obligationStatus ?? null,
    obligationCoveragePercentage: record.obligationCoveragePercentage ?? null,
    declarationText:
      record.registrationType === COMPLIANCE_SCHEME
        ? { text: 'I declare on behalf of the scheme...', language: 'en' }
        : { text: 'I declare...', language: 'en' },
    submitterName: record.submitterName,
    isRegulation43Compliant: record.isRegulation43Compliant ?? null,
    audit: record.audit
  }

  if (record.queryDetails) {
    declaration.queryDetails = record.queryDetails
  }

  return declaration
}
