export const registrationTypeByOrganisationType = {
  'compliance-schemes': 'ComplianceScheme',
  'direct-producers': 'DirectProducer'
}

export const statusByTab = {
  pending: 'Submitted',
  accepted: 'Accepted'
}

export const PAGE_SIZE = 20
export const DECLARATIONS_BATCH_SIZE = 100
export const NO_DATA = 'No data'
export const UNKNOWN_ORGANISATION = 'Unknown organisation'
export const COMPLIANCE_SCHEMES = 'compliance-schemes'
export const COMPLIANCE_YEAR = 2026

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
