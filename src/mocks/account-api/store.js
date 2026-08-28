// Account API store: resolves organisations by external id or Companies House
// number and serves their nominated contacts.

function accountSummary(organisation) {
  return {
    externalId: organisation.externalId,
    name: organisation.name,
    referenceNumber: organisation.referenceNumber,
    companiesHouseNumber: organisation.companiesHouseNumber,
    isComplianceScheme: organisation.isComplianceScheme
  }
}

export function createAccountStore(organisations = []) {
  const byExternalId = new Map(
    organisations.map((organisation) => [organisation.externalId, organisation])
  )

  function organisationsByExternalIds(externalIds = []) {
    const found = []
    const notFoundExternalIds = []
    for (const externalId of externalIds) {
      const organisation = byExternalId.get(externalId)
      if (organisation) {
        found.push(accountSummary(organisation))
      } else {
        notFoundExternalIds.push(externalId)
      }
    }
    return { organisations: found, notFoundExternalIds }
  }

  function organisationsByCompaniesHouseNumbers(numbers = []) {
    const wanted = new Set(numbers.filter(Boolean))
    return organisations
      .filter(
        (organisation) =>
          organisation.companiesHouseNumber != null &&
          wanted.has(organisation.companiesHouseNumber)
      )
      .map(accountSummary)
  }

  function organisationWithPersons(externalId) {
    const organisation = byExternalId.get(externalId)
    if (!organisation) {
      return null
    }
    return {
      externalId: organisation.externalId,
      name: organisation.name,
      referenceNumber: organisation.referenceNumber,
      persons: organisation.persons
    }
  }

  function personEmails(organisationId) {
    const organisation = byExternalId.get(organisationId)
    return (organisation?.persons ?? []).map(
      ({ firstName, lastName, email }) => ({ firstName, lastName, email })
    )
  }

  return {
    organisationsByExternalIds,
    organisationsByCompaniesHouseNumbers,
    organisationWithPersons,
    personEmails
  }
}
