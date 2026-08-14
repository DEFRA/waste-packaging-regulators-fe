export const registrationTypeByOrganisationType = {
  'compliance-schemes': 'ComplianceScheme',
  'direct-producers': 'DirectProducer'
}

export const statusBySubmissionStatus = {
  pending: 'Submitted',
  accepted: 'Accepted'
}

export const PAGE_SIZE = 20
export const DECLARATIONS_BATCH_SIZE = 100
export const NO_DATA = 'No data'
export const UNKNOWN_ORGANISATION = 'Unknown organisation'
export const COMPLIANCE_SCHEMES = 'compliance-schemes'
export const COMPLIANCE_YEAR = 2026

export const emptyTabMessages = {
  pending:
    'No submissions waiting for review. New submissions will appear here as they arrive.',
  accepted:
    'No accepted submissions yet. Submissions you accept will be listed here.',
  'not-submitted': 'There are no outstanding submissions'
}

export const organisationTypeDisplayNames = {
  DirectProducer: 'Direct producer',
  ComplianceScheme: 'Compliance scheme'
}

export const registrationTypeFromApi = {
  COMPLIANCE_SCHEME: 'ComplianceScheme',
  SMALL_PRODUCER: 'DirectProducer',
  LARGE_PRODUCER: 'DirectProducer'
}

export const certificateActionLabelsByRegistrationType = {
  DirectProducer: {
    accept: 'Accept certificate',
    cancel: 'Cancel certificate'
  },
  ComplianceScheme: {
    accept: 'Accept statement',
    cancel: 'Cancel statement'
  }
}

export const certificateSuccessBannerCopyByRegistrationType = {
  DirectProducer: {
    accepted: {
      heading: 'Certificate accepted',
      text: 'Certificate has been accepted.'
    },
    cancelled: {
      heading: 'Certificate cancelled',
      text: 'Certificate has been cancelled and an email sent to the producer.'
    }
  },
  ComplianceScheme: {
    accepted: {
      heading: 'Statement accepted',
      text: 'Statement has been accepted.'
    },
    cancelled: {
      heading: 'Statement cancelled',
      text: 'Statement has been cancelled and an email sent to the compliance scheme.'
    }
  }
}

export const reviewStatusByDeclarationStatus = {
  Submitted: 'Pending',
  Accepted: 'Approved',
  Queried: 'Queried',
  Cancelled: 'Cancelled'
}

export const declarationStatusByReviewStatus = {
  Pending: 'Submitted',
  Approved: 'Accepted',
  Queried: 'Queried',
  Cancelled: 'Cancelled'
}

export const GLASS_BREAKDOWN_MATERIALS = new Set([
  'GlassRemelt',
  'RemainingGlass'
])
