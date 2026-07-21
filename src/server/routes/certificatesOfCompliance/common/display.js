import { NO_DATA, COMPLIANCE_SCHEMES } from './constants.js'

export function isComplianceSchemeRegistrationType(registrationType) {
  return (
    registrationType === 'ComplianceScheme' ||
    registrationType === COMPLIANCE_SCHEMES
  )
}

export function displayOrNoData(value) {
  return value == null || value === '' ? NO_DATA : value
}

export function complianceDocumentNoun(registrationType) {
  return isComplianceSchemeRegistrationType(registrationType)
    ? 'statement of compliance'
    : 'certificate of compliance'
}

export function buildComplianceTypeLabel(obligationYear, registrationType) {
  if (obligationYear == null) {
    return NO_DATA
  }
  const year = String(obligationYear)
  return `${year} ${complianceDocumentNoun(registrationType)}`
}

// Regulation 43 declaration sentence, shown only for compliance schemes.
// Returns null when there is no status — the template renders the "No data"
// empty state itself.
export function buildRegulation43Statement(regulation43Met, organisationName) {
  if (regulation43Met == null) {
    return null
  }
  const compliance = regulation43Met ? 'complied' : 'not complied'
  return `${organisationName} declared they have ${compliance} with all other requirements in regulation 43.`
}
