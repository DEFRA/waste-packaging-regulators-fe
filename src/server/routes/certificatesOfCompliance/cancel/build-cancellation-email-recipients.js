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

function splitDisplayName(name) {
  const trimmed = name?.trim()
  if (!trimmed) {
    return { firstName: '', lastName: '' }
  }

  const [firstName, ...remainingParts] = trimmed.split(/\s+/)
  return {
    firstName,
    lastName: remainingParts.join(' ')
  }
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
  if (matchedPerson?.firstName && matchedPerson?.lastName) {
    return {
      firstName: matchedPerson.firstName,
      lastName: matchedPerson.lastName,
      email
    }
  }

  const { firstName, lastName } = splitDisplayName(submitter.name)

  return {
    firstName,
    lastName,
    email
  }
}

async function fetchOrganisationWithPersons(
  accountApi,
  organisationId,
  traceId
) {
  return accountApi.getOrganisationWithPersonsOrNull(organisationId, traceId)
}

export async function buildCancellationEmailRecipients(
  declaration,
  organisationId,
  traceId
) {
  const accountApi = createAccountApiService()
  const submitter = findSubmittedAuditUser(declaration?.audit)
  const organisationWithPersons = await fetchOrganisationWithPersons(
    accountApi,
    organisationId,
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
