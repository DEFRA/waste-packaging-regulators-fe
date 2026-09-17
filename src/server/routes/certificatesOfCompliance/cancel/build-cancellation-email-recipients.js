import { createAccountApiService } from '#services/account-api.service.js'
import { findSubmittedAuditUser } from '../detail/audit.js'
import { mapPrimaryContactPerson } from '../common/organisation-contact.js'

export function dedupeRecipientsByEmail(recipients = []) {
  const seen = new Set()

  return recipients
    .filter((recipient) => {
      const email = recipient?.email?.trim()
      if (!email) {
        return false
      }

      const key = email.toLowerCase()
      if (seen.has(key)) {
        return false
      }

      seen.add(key)
      return true
    })
    .sort((left, right) =>
      left.email.localeCompare(right.email, undefined, { sensitivity: 'base' })
    )
}

function matchPersonForSubmitter(persons, submitter) {
  return persons.find(
    (person) =>
      (submitter.id &&
        person?.userId != null &&
        String(person.userId) === String(submitter.id)) ||
      person?.email?.localeCompare(submitter.email, undefined, {
        sensitivity: 'accent'
      }) === 0
  )
}

function resolveSubmitterRecipient(submitter, organisationWithPersons) {
  const email = submitter?.email?.trim()
  if (!email) {
    return null
  }

  const matchedPerson = matchPersonForSubmitter(
    organisationWithPersons?.persons ?? [],
    submitter
  )
  if (!matchedPerson?.firstName || !matchedPerson?.lastName) {
    return null
  }

  return {
    firstName: matchedPerson.firstName,
    lastName: matchedPerson.lastName,
    email
  }
}

async function resolveAccountOrganisationId(
  accountApi,
  registrationType,
  wasteOrganisation,
  traceId
) {
  if (registrationType === 'DirectProducer') {
    return wasteOrganisation?.id ?? null
  }

  const companiesHouseNumber = wasteOrganisation?.companiesHouseNumber?.trim()
  if (!companiesHouseNumber) {
    return null
  }

  const organisations =
    await accountApi.getOrganisationsByCompaniesHouseNumbers(
      [companiesHouseNumber],
      traceId
    )
  const matches = organisations.filter(
    (organisation) => organisation.isComplianceScheme && organisation.externalId
  )

  if (matches.length !== 1) {
    return null
  }

  return matches[0].externalId
}

async function fetchOrganisationWithPersons(
  accountApi,
  accountOrganisationId,
  traceId
) {
  if (!accountOrganisationId) {
    return null
  }

  return accountApi.getOrganisationWithPersonsOrNull(
    accountOrganisationId,
    traceId
  )
}

export async function buildCancellationEmailRecipients(
  declaration,
  wasteOrganisation,
  traceId
) {
  const accountApi = createAccountApiService()
  const submitter = findSubmittedAuditUser(declaration?.audit)
  const registrationType = declaration?.organisation?.registrationType
  const accountOrganisationId = await resolveAccountOrganisationId(
    accountApi,
    registrationType,
    wasteOrganisation,
    traceId
  )
  const organisationWithPersons = await fetchOrganisationWithPersons(
    accountApi,
    accountOrganisationId,
    traceId
  )

  const recipients = []
  const submitterRecipient = resolveSubmitterRecipient(
    submitter,
    organisationWithPersons
  )
  if (submitterRecipient) {
    recipients.push(submitterRecipient)
  }

  const primaryContact = mapPrimaryContactPerson(organisationWithPersons)
  if (primaryContact) {
    recipients.push(primaryContact)
  }

  return dedupeRecipientsByEmail(recipients)
}
