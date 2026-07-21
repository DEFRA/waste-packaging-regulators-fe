import {
  NO_DATA,
  organisationTypeDisplayNames,
  registrationTypeFromApi
} from './constants.js'
import { displayOrNoData } from './display.js'
import { mapOrganisationName } from './organisation.js'

const emptyWasteOrganisationDetailFields = {
  companyName: null,
  registrationType: null,
  organisationType: NO_DATA,
  companiesHouseNumber: NO_DATA
}

export function deriveRegistrationType(registrations, obligationYear) {
  const resolvedRegistrations = registrations ?? []
  if (!resolvedRegistrations.length) {
    return null
  }

  const resolveType = (registration) =>
    registrationTypeFromApi[registration?.type] ?? null

  const selectFromPool = (pool) => {
    if (!pool.length) {
      return null
    }
    const registered = pool.filter(
      (registration) => registration.status === 'REGISTERED'
    )
    const candidates = registered.length > 0 ? registered : pool
    const selected = candidates.reduce((best, current) => {
      if (!best) {
        return current
      }
      const bestTime = best.updated ? Date.parse(best.updated) : 0
      const currentTime = current.updated ? Date.parse(current.updated) : 0
      return currentTime >= bestTime ? current : best
    }, null)

    return resolveType(selected ?? candidates[0])
  }

  if (obligationYear != null) {
    const forYear = resolvedRegistrations.filter(
      (registration) =>
        Number(registration.registrationYear) === Number(obligationYear)
    )
    const typeForYear = selectFromPool(forYear)
    if (typeForYear) {
      return typeForYear
    }
  }

  const latestYear = Math.max(
    ...resolvedRegistrations.map(
      (registration) => Number(registration.registrationYear) || 0
    )
  )
  const latestRegistrations = resolvedRegistrations.filter(
    (registration) => Number(registration.registrationYear) === latestYear
  )

  return selectFromPool(latestRegistrations)
}

function resolveWasteOrganisationRegistrationType(
  organisation,
  obligationYear
) {
  return (
    organisation.registrationType ??
    deriveRegistrationType(organisation.registrations, obligationYear)
  )
}

function mapRegistrationTypeToOrganisationType(registrationType) {
  return displayOrNoData(
    registrationType
      ? (organisationTypeDisplayNames[registrationType] ?? registrationType)
      : null
  )
}

export function mapCompaniesHouseNumberFromWasteOrganisation(organisation) {
  return displayOrNoData(organisation?.companiesHouseNumber)
}

export function mapWasteOrganisationToDetailFields(
  organisation,
  { obligationYear } = {}
) {
  if (!organisation) {
    return emptyWasteOrganisationDetailFields
  }

  const registrationType = resolveWasteOrganisationRegistrationType(
    organisation,
    obligationYear
  )

  return {
    companyName: mapOrganisationName({ ...organisation, registrationType }),
    registrationType,
    organisationType: mapRegistrationTypeToOrganisationType(registrationType),
    companiesHouseNumber:
      mapCompaniesHouseNumberFromWasteOrganisation(organisation)
  }
}

export { mapRegistrationTypeToOrganisationType }
