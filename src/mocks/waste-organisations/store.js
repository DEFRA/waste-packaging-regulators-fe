// waste-organisations store: registry lookups over one set of organisations.

function wasteOrganisationRegistrationType(organisation) {
  return organisation.registrations?.[0]?.type ?? null
}

// `listedOrganisationIds` (owned by the obligations mock) decides which
// organisations the listing returns, so a detail-only organisation is reachable
// by id but never listed.
export function createOrganisationsStore(
  organisations = [],
  { listedOrganisationIds = new Set() } = {}
) {
  const byId = new Map(
    organisations.map((organisation) => [organisation.id, organisation])
  )

  function getWasteOrganisation(organisationId) {
    return byId.get(organisationId) ?? null
  }

  function listWasteOrganisations(registrationsFilter) {
    const listed = organisations.filter((organisation) =>
      listedOrganisationIds.has(organisation.id)
    )
    if (!registrationsFilter) {
      return listed
    }
    const wanted = new Set(registrationsFilter.split(','))
    return listed.filter((organisation) =>
      wanted.has(wasteOrganisationRegistrationType(organisation))
    )
  }

  return { getWasteOrganisation, listWasteOrganisations }
}
