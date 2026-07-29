// Compliance schemes do NOT share an external id between waste-organisations
// and the Account API (the scheme identity lives in a separate table), so they
// are matched by Companies House number instead — the operator organisation
// carries the reference number and the nominated contact. A Companies House
// number can match more than one Account organisation (e.g. a producer and the
// scheme operator), so only the compliance-scheme operator counts.
//
// Returns a Map of Companies House number -> Account operator organisation.
export async function resolveSchemeOperators(
  accountApi,
  companiesHouseNumbers,
  traceId
) {
  const numbers = companiesHouseNumbers.filter(Boolean)

  if (numbers.length === 0) {
    return new Map()
  }

  const organisations =
    await accountApi.getOrganisationsByCompaniesHouseNumbers(numbers, traceId)

  return new Map(
    organisations
      .filter((org) => org.isComplianceScheme)
      .map((org) => [org.companiesHouseNumber, org])
  )
}
