import { UNKNOWN_ORGANISATION } from './constants.js'
import { isComplianceSchemeRegistrationType } from './display.js'

function isBlank(value) {
  return value == null || String(value).trim() === ''
}

// Reads a compliance-declaration snapshot, where `name` is null for compliance
// schemes and the operator name is captured at submission time. The submitted
// tabs deliberately show the operator rather than the scheme (AMCR-247).
export function mapOrganisationName(organisation) {
  if (isComplianceSchemeRegistrationType(organisation.registrationType)) {
    return (
      organisation.schemeOperatorName ??
      organisation.name ??
      UNKNOWN_ORGANISATION
    )
  }
  return organisation.name ?? UNKNOWN_ORGANISATION
}

// Reads a waste-organisations record, which has no `schemeOperatorName` at all —
// passing one to mapOrganisationName therefore always yielded `name`, the
// operator's legal name, and never consulted the trading name.
//
// Mirrors the waste-obligations `Organisation.CompanyName` rule that the
// not-submitted list already renders, so the detail page and the row it was
// opened from agree: a compliance scheme is known by its trading name, falling
// back to the operator's legal name only when no usable one exists. Blank counts
// as missing because waste-organisations stores an empty tradingName verbatim.
//
// The registration type is passed in rather than read off the record: a
// waste-organisations record carries `registrations`, not a resolved type.
export function mapWasteOrganisationName(organisation, registrationType) {
  if (
    isComplianceSchemeRegistrationType(registrationType) &&
    !isBlank(organisation.tradingName)
  ) {
    return organisation.tradingName
  }
  return organisation.name ?? UNKNOWN_ORGANISATION
}
