import {
  UNKNOWN_ORGANISATION,
  wasteOrganisationsRegistrationStatus
} from './constants.js'
import { isComplianceSchemeRegistrationType } from './display.js'

export function formatOrganisationName(organisation, year) {
  if (organisation == null || typeof organisation !== 'object') {
    return ''
  }

  const registrations = organisation.registrations ?? []
  const matchingRegistrations = registrations
    .filter((x) => x.registrationYear === Number(year))
    .sort((a, b) => new Date(b.updated) - new Date(a.updated))
  const registration =
    matchingRegistrations.find(
      (x) => x.status === wasteOrganisationsRegistrationStatus.REGISTERED
    ) ?? matchingRegistrations[0]

  if (!registration) {
    return ''
  }

  return organisation.name ?? ''
}

function nonBlankName(...candidates) {
  for (const value of candidates) {
    if (value != null && String(value).trim() !== '') {
      return value
    }
  }
  return null
}

export function mapOrganisationName(organisation) {
  if (isComplianceSchemeRegistrationType(organisation.registrationType)) {
    return (
      nonBlankName(organisation.complianceSchemeName, organisation.name) ??
      UNKNOWN_ORGANISATION
    )
  }
  return organisation.name ?? UNKNOWN_ORGANISATION
}
