const contactServiceRolesByPreference = ['Approved Person', 'Delegated Person']
const approvedPersonServiceRole = 'Approved Person'

export function mapPrimaryContactPerson(organisationWithPersons) {
  const persons = organisationWithPersons?.persons ?? []
  const contact = persons.find(
    (person) => person?.serviceRole === approvedPersonServiceRole
  )

  const email = contact?.email?.trim()
  const firstName = contact?.firstName?.trim()
  const lastName = contact?.lastName?.trim()

  if (!email || !firstName || !lastName) {
    return null
  }

  return {
    firstName,
    lastName,
    email
  }
}

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
