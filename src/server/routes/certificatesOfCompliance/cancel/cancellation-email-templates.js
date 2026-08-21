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
    en: 'aa63e6d0-cea6-4f70-8d0f-266199c6ca45',
    cy: '308e7224-0ab1-4f54-8e8d-1558c9c57a77'
  },
  producerRequested: {
    en: '42273ea5-a702-4fe1-982f-9e002de2522b',
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

export function resolveCancellationTemplateId(
  reasonLabel,
  { isWelsh = false } = {}
) {
  const templateKey = reasonLabelToTemplateKey[reasonLabel]
  if (!templateKey) {
    return null
  }

  const template = cancellationEmailTemplateIds[templateKey]
  return isWelsh ? template.cy : template.en
}

export function mapRegistrationTypeToEntityTypeCode(registrationType) {
  return registrationType === 'ComplianceScheme' ? 'CS' : 'DR'
}

export function isWelshOrganisation(businessCountry) {
  return businessCountry === 'GB-WLS'
}
