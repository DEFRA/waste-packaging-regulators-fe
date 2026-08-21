import { config } from '#config/config.js'
import { createAccountApiService } from '#services/account-api.service.js'
import { previewCancellationTemplate } from '#services/govuk-notify.service.js'
import { createWasteObligationsApiService } from '#services/waste-obligations-api.service.js'
import { createWasteOrganisationsApiService } from '#services/waste-organisations-api.service.js'
import { buildCancellationNotificationParameters } from '../actions/cancellation-notification-parameters.js'
import {
  getMockDetailDataById,
  getMockOrganisationById
} from '../certificates-of-compliance.mock.js'
import { getCancelReasonLabel } from './reasons.js'
import {
  isWelshOrganisation,
  mapRegistrationTypeToEntityTypeCode,
  resolveCancellationTemplateId
} from './cancellation-email-templates.js'

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

export function buildCancellationEmailPersonalisation(
  declaration,
  notificationParameters,
  recipient
) {
  const organisation = declaration.organisation ?? {}

  // Notify templates render "31 January ((year))" — year is the submission deadline year.
  return {
    year: declaration.obligationYear + 1,
    regulator: organisation.regulator,
    regulatorEmail: organisation.regulatorEmail,
    ...notificationParameters,
    firstName: recipient.firstName,
    lastName: recipient.lastName
  }
}

async function fetchDeclaration(organisationId, id, traceId) {
  if (config.get('useMockApi')) {
    return getMockDetailDataById(id)
  }

  const obligationsApi = createWasteObligationsApiService()
  return obligationsApi.getComplianceDeclarationOrNull(
    { organisationId, id },
    traceId
  )
}

async function fetchWasteOrganisation(organisationId, traceId) {
  if (config.get('useMockApi')) {
    return getMockOrganisationById(organisationId)
  }

  const organisationsApi = createWasteOrganisationsApiService()
  return organisationsApi.getOrganisation({ organisationId }, traceId)
}

async function fetchCancellationRecipients(
  organisationId,
  registrationType,
  traceId
) {
  const entityTypeCode = mapRegistrationTypeToEntityTypeCode(registrationType)
  const accountApi = createAccountApiService()
  const recipients = await accountApi.getPersonEmails(
    organisationId,
    entityTypeCode,
    traceId
  )
  return dedupeRecipientsByEmail(recipients)
}

export async function buildCancellationEmailPreview({
  organisationId,
  id,
  reasonKey,
  traceId
}) {
  const declaration = await fetchDeclaration(organisationId, id, traceId)
  if (declaration == null) {
    return { error: 'declaration-not-found' }
  }

  const registrationType = declaration.organisation?.registrationType
  const reasonLabel = getCancelReasonLabel(registrationType, reasonKey)
  if (!reasonLabel) {
    return { error: 'invalid-reason' }
  }

  const [wasteOrganisation, recipients] = await Promise.all([
    fetchWasteOrganisation(organisationId, traceId),
    fetchCancellationRecipients(organisationId, registrationType, traceId)
  ])

  if (recipients.length === 0) {
    return { error: 'no-recipients' }
  }

  const previewRecipient = recipients[0]
  const isWelsh = isWelshOrganisation(wasteOrganisation?.businessCountry)
  const templateId = resolveCancellationTemplateId(reasonLabel, { isWelsh })
  if (!templateId) {
    return { error: 'unknown-template' }
  }

  const notificationParameters = buildCancellationNotificationParameters({
    registrationType,
    environmentalRegulator: declaration.organisation?.regulator
  })
  const personalisation = buildCancellationEmailPersonalisation(
    declaration,
    notificationParameters,
    previewRecipient
  )

  let subject
  let body
  try {
    ;({ subject, body } = await previewCancellationTemplate(
      templateId,
      personalisation
    ))
  } catch (error) {
    if (error.code === 'notify-not-configured') {
      return { error: 'notify-not-configured' }
    }

    throw error
  }

  return {
    subject,
    body,
    toAddresses: recipients.map((recipient) => recipient.email),
    previewRecipient
  }
}
