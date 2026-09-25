import { previewCancellationTemplate } from '#services/govuk-notify.service.js'
import { createWasteObligationsApiService } from '#services/waste-obligations-api.service.js'
import { createWasteOrganisationsApiService } from '#services/waste-organisations-api.service.js'
import { buildCancellationNotificationParameters } from '../actions/cancellation-notification-parameters.js'
import { isValidCancelReason } from './reasons.js'
import {
  isWelshOrganisation,
  resolveCancellationTemplateIdForReasonKey
} from './cancellation-email-templates.js'
import { buildCancellationEmailRecipients } from './build-cancellation-email-recipients.js'

export { dedupeRecipientsByEmail } from './build-cancellation-email-recipients.js'

export function buildCancellationEmailPersonalisation(
  declaration,
  notificationParameters,
  recipient
) {
  const organisation = declaration.organisation ?? {}

  // Notify templates render "31 January ((year))" — year is the submission deadline year.
  return {
    year: declaration.obligationYear + 1,
    regulatorEmail: organisation.regulatorEmail,
    ...notificationParameters,
    firstName: recipient.firstName,
    lastName: recipient.lastName
  }
}

async function fetchDeclaration(organisationId, id, traceId) {
  const obligationsApi = createWasteObligationsApiService()
  return obligationsApi.getComplianceDeclarationOrNull(
    { organisationId, id },
    traceId
  )
}

async function fetchWasteOrganisation(organisationId, traceId) {
  const organisationsApi = createWasteOrganisationsApiService()
  return organisationsApi.getOrganisation({ organisationId }, traceId)
}

async function fetchCancellationRecipients(
  declaration,
  wasteOrganisation,
  traceId
) {
  return buildCancellationEmailRecipients(
    declaration,
    wasteOrganisation,
    traceId
  )
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
  if (!isValidCancelReason(reasonKey)) {
    return { error: 'invalid-reason' }
  }

  const wasteOrganisation = await fetchWasteOrganisation(
    organisationId,
    traceId
  )
  const recipients = await fetchCancellationRecipients(
    declaration,
    wasteOrganisation,
    traceId
  )

  if (recipients.length === 0) {
    return { error: 'no-recipients' }
  }

  const previewRecipient = recipients[0]
  const isWelsh = isWelshOrganisation(wasteOrganisation?.businessCountry)
  const templateId = resolveCancellationTemplateIdForReasonKey(reasonKey, {
    isWelsh
  })
  if (!templateId) {
    return { error: 'unknown-template' }
  }

  const notificationParameters = buildCancellationNotificationParameters({
    registrationType,
    environmentalRegulator: declaration.organisation?.regulator,
    businessCountry: wasteOrganisation?.businessCountry
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
