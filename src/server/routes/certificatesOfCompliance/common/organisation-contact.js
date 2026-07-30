const contactServiceRolesByPreference = ['Approved Person', 'Delegated Person']

export function mapOrganisationContact(organisationWithPersons) {
  const persons = organisationWithPersons?.persons ?? []
  const contact = contactServiceRolesByPreference
    .map((serviceRole) =>
      persons.find((person) => person?.serviceRole === serviceRole)
    )
    .find(Boolean)

  return {
    email: contact?.email ?? null,
    telephoneNumber: contact?.telephoneNumber ?? null
  }
}
