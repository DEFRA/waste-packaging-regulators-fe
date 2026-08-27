import {
  organisationTypeDisplayNames,
  registrationTypeFromApi
} from './constants.js'
import { displayOrNoData } from './display.js'
import { mapOrganisationName } from './organisation.js'

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

// An unmapped type falls back to the raw value rather than hiding it. The
// own-property check keeps inherited Object keys (e.g. 'constructor') from
// resolving to a function.
export function mapRegistrationTypeToOrganisationType(
  registrationType,
  locale = 'en'
) {
  return displayOrNoData(
    Object.hasOwn(organisationTypeDisplayNames, registrationType)
      ? organisationTypeDisplayNames[registrationType]
      : registrationType,
    locale
  )
}

export function mapCompaniesHouseNumberFromWasteOrganisation(
  organisation,
  locale = 'en'
) {
  return displayOrNoData(organisation?.companiesHouseNumber, locale)
}

export function mapWasteOrganisationToDetailFields(
  organisation,
  { obligationYear, locale = 'en' } = {}
) {
  if (!organisation) {
    return {
      companyName: null,
      registrationType: null,
      organisationType: displayOrNoData(null, locale),
      companiesHouseNumber: displayOrNoData(null, locale)
    }
  }

  const registrationType = resolveWasteOrganisationRegistrationType(
    organisation,
    obligationYear
  )

  return {
    companyName: mapOrganisationName(organisation),
    registrationType,
    organisationType: mapRegistrationTypeToOrganisationType(
      registrationType,
      locale
    ),
    companiesHouseNumber: mapCompaniesHouseNumberFromWasteOrganisation(
      organisation,
      locale
    )
  }
}
