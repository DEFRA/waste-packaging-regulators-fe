// Pure projections of a compliance record to the raw API shapes the frontend
// reads. No state — the store composes these over its record set.

import {
  OBLIGATION_YEAR,
  COMPLIANCE_SCHEME,
  MOCK_BUSINESS_COUNTRY,
  mockRegulatorName,
  mockRegulatorEmail
} from '#mocks/identities.js'

export function isSubmittedRecord(record) {
  return record.declarationId != null
}

function isBlank(value) {
  return value == null || String(value).trim() === ''
}

function firstNonBlankName(...candidates) {
  for (const value of candidates) {
    if (!isBlank(value)) {
      return value
    }
  }
  return null
}

// complianceSchemeName then organisationName; not schemeOperatorName for display.
export function complianceSchemeDisplayName(record) {
  return firstNonBlankName(record.complianceSchemeName, record.organisationName)
}

// The organisation name a submitted declaration list/search row displays: the
// compliance scheme name for compliance schemes, the organisation name for direct
// producers. Unsubmitted rows use the same rule via unsubmittedOrganisationName.
export function listOrganisationName(record) {
  if (record.registrationType === COMPLIANCE_SCHEME) {
    return complianceSchemeDisplayName(record)
  }
  return record.organisationName ?? null
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
      businessCountry: record.businessCountry ?? MOCK_BUSINESS_COUNTRY,
      regulator: record.environmentalRegulator ?? mockRegulatorName,
      regulatorEmail: record.regulatorEmail ?? mockRegulatorEmail,
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
