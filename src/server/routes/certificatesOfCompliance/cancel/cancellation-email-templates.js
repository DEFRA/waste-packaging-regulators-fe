// GOV.UK Notify template IDs — kept in sync with waste-obligations GovukNotifyOptions.
export const cancellationEmailTemplateIds = {
  notSignedByCorrectPerson: {
    en: '1502cfa2-9758-4410-b189-d1f95a7c774f',
    cy: '7cab1c5e-9edf-4139-b3fd-3db4bcf3041d'
  },
  recyclingObligationsChanged: {
    en: 'af2796ff-c322-4c3c-ab46-926a86129abf',
    cy: '0e041d31-3f21-45b3-8605-ed2ef10a4358'
  },
  canMeetRecyclingObligations: {
    en: '86345150-cb25-4b59-94c3-578bed7e82d4',
    cy: 'a2662ff5-5663-4d72-9ac2-60c578bf9fb0'
  },
  producerRequested: {
    en: '3e03c93f-955c-4db3-936c-bfa3f7725a5f',
    cy: 'd2f5f617-db32-4195-a091-de2d3ec29456'
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
