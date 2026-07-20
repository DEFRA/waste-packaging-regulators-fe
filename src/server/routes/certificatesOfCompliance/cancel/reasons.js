// Cancellation reasons shown as radio options on the cancel reason page, and
// their producer-type-aware copy. Adapted from the prototype's cancel screen:
// https://github.com/defra-design/regulator-responsibility-prototype/blob/3839b9d2a40168799ee4b9fe93019a1d7e9e80d1/app/views/v3/certificates-of-compliance/main/cancel-certificate.njk

function wordingFor(registrationType) {
  const isComplianceScheme = registrationType === 'ComplianceScheme'
  return {
    docType: isComplianceScheme ? 'Statement' : 'Certificate',
    producerType: isComplianceScheme ? 'Compliance scheme' : 'Producer',
    producerTypeLower: isComplianceScheme ? 'compliance scheme' : 'producer',
    notMet: isComplianceScheme ? '' : 'as not met'
  }
}

// Each reason's label and hint, keyed by the value stored against the
// declaration. Functions receive the resolved wording so the copy matches the
// producer type.
const cancelReasons = {
  'incorrect-signer': {
    label: () => 'Not signed by correct person',
    hint: () => 'Name entered is not an approved or delegated person'
  },
  'obligations-changed': {
    label: () => 'Recycling obligations changed',
    hint: ({ producerTypeLower }) =>
      `For example, the ${producerTypeLower} resubmitted packaging data`
  },
  'submitted-early': {
    label: ({ producerType }) =>
      `${producerType} can meet recycling obligations`,
    hint: ({ docType, notMet }) =>
      `${docType} submitted ${notMet} with time to acquire PRNs or PERNs`
  },
  'producer-request': {
    label: ({ producerType }) => `${producerType} requested to cancel`,
    hint: () => 'For example, to update information and resubmit'
  }
}

export function isValidCancelReason(reason) {
  return Object.hasOwn(cancelReasons, reason)
}

// The GDS radio items for the cancel reason page, with the given reason
// pre-selected (none, when selected is null/undefined).
export function buildCancelReasonItems(registrationType, selected) {
  const wording = wordingFor(registrationType)
  return Object.entries(cancelReasons).map(([value, reason]) => ({
    value,
    text: reason.label(wording),
    hint: { text: reason.hint(wording) },
    checked: value === selected
  }))
}

// The label recorded against the declaration and shown on the confirmation and
// detail pages once cancelled.
export function getCancelReasonLabel(registrationType, reason) {
  if (!isValidCancelReason(reason)) {
    return null
  }
  return cancelReasons[reason].label(wordingFor(registrationType))
}
