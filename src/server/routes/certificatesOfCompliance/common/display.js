import { COMPLIANCE_SCHEMES } from './constants.js'
import {
  translateComplianceDocumentNoun,
  translateComplianceTypeLabel,
  translateNoData,
  translateRegulation43Statement
} from './locale-strings.js'

export function isComplianceSchemeRegistrationType(registrationType) {
  return (
    registrationType === 'ComplianceScheme' ||
    registrationType === COMPLIANCE_SCHEMES
  )
}

export function displayOrNoData(value, locale = 'en') {
  return value == null || value === '' ? translateNoData(locale) : value
}

export function complianceDocumentNoun(registrationType, locale = 'en') {
  return translateComplianceDocumentNoun(registrationType, locale)
}

export function buildComplianceTypeLabel(
  obligationYear,
  registrationType,
  locale = 'en'
) {
  return translateComplianceTypeLabel(obligationYear, registrationType, locale)
}

export function buildRegulation43Statement(
  regulation43Met,
  organisationName,
  locale = 'en'
) {
  return translateRegulation43Statement(
    regulation43Met,
    organisationName,
    locale
  )
}

export function calculateObligationCoveragePercentage(obligations = []) {
  const totalAccepted = obligations.reduce(
    (sum, o) => sum + (o.tonnages?.accepted ?? 0),
    0
  )
  const totalObligated = obligations.reduce(
    (sum, o) => sum + (o.tonnages?.obligated ?? 0),
    0
  )

  if (totalObligated === 0) {
    return 0
  }

  const percentage = (totalAccepted / totalObligated) * 100
  return Math.round(Math.min(percentage, 100))
}

/** @deprecated use translateNoData(locale) — kept for tests referencing NO_DATA literal */
export { NO_DATA } from './constants.js'
