// GOV.UK Notify template IDs — kept in sync with waste-obligations GovukNotifyOptions.
export const cancellationEmailTemplateIds = {
  notSignedByCorrectPerson: {
    en: '1502cfa2-9758-4410-b189-d1f95a7c774f',
    cy: '7cab1c5e-9edf-4139-b3fd-3db4bcf3041d'
  },
  recyclingObligationsChanged: {
    en: '857808d4-d159-421e-92b6-bf9d59711a9e',
    cy: '0a966633-b7ad-42dd-b286-af0cb2405ed2'
  },
  canMeetRecyclingObligations: {
    en: '86345150-cb25-4b59-94c3-578bed7e82d4',
    cy: '308e7224-0ab1-4f54-8e8d-1558c9c57a77'
  },
  producerRequested: {
    en: '3e03c93f-955c-4db3-936c-bfa3f7725a5f',
    cy: 'e419a544-e1b3-4ea5-b8eb-a074e63aea1a'
  }
}

const reasonLabelToTemplateKey = {
  'Not signed by correct person': 'notSignedByCorrectPerson',
  'Recycling obligations changed': 'recyclingObligationsChanged',
  'Producer can meet recycling obligations': 'canMeetRecyclingObligations',
  'Compliance scheme can meet recycling obligations':
    'canMeetRecyclingObligations',
  'Producer requested to cancel': 'producerRequested',
  'Compliance scheme requested to cancel': 'producerRequested'
}

const reasonKeyToTemplateKey = {
  'incorrect-signer': 'notSignedByCorrectPerson',
  'obligations-changed': 'recyclingObligationsChanged',
  'submitted-early': 'canMeetRecyclingObligations',
  'producer-request': 'producerRequested'
}

function templateIdForKey(templateKey, { isWelsh = false } = {}) {
  const template = cancellationEmailTemplateIds[templateKey]
  return isWelsh ? template.cy : template.en
}

export function resolveCancellationTemplateIdForReasonKey(
  reasonKey,
  { isWelsh = false } = {}
) {
  const templateKey = reasonKeyToTemplateKey[reasonKey]
  if (!templateKey) {
    return null
  }

  return templateIdForKey(templateKey, { isWelsh })
}

export function resolveCancellationTemplateId(
  reasonLabel,
  { isWelsh = false } = {}
) {
  const templateKey = reasonLabelToTemplateKey[reasonLabel]
  if (!templateKey) {
    return null
  }

  return templateIdForKey(templateKey, { isWelsh })
}

export function mapRegistrationTypeToEntityTypeCode(registrationType) {
  return registrationType === 'ComplianceScheme' ? 'CS' : 'DR'
}

export function isWelshOrganisation(businessCountry) {
  return businessCountry === 'GB-WLS'
}
