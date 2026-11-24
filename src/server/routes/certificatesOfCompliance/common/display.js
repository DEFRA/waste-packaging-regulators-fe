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

// The API's percentage, or calculated from the obligations when it is missing
// (the search endpoint does not return it).
export function declarationCoveragePercentage({
  obligationCoveragePercentage,
  obligations
}) {
  if (obligationCoveragePercentage != null) {
    return obligationCoveragePercentage
  }
  return obligations?.length
    ? calculateObligationCoveragePercentage(obligations)
    : null
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
