// Canonical English cancellation reason strings — keep in sync with waste-obligations
// ComplianceDeclarationCancellationReasons.cs (PATCH reason + audit[].reason on GET).

export const CANONICAL_CANCEL_REASON_LABELS = {
  NOT_SIGNED_BY_CORRECT_PERSON: 'Not signed by correct person',
  RECYCLING_OBLIGATIONS_CHANGED: 'Recycling obligations changed',
  PRODUCER_CAN_MEET_RECYCLING_OBLIGATIONS:
    'Producer can meet recycling obligations',
  COMPLIANCE_SCHEME_CAN_MEET_RECYCLING_OBLIGATIONS:
    'Compliance scheme can meet recycling obligations',
  PRODUCER_REQUESTED_TO_CANCEL: 'Producer requested to cancel',
  COMPLIANCE_SCHEME_REQUESTED_TO_CANCEL: 'Compliance scheme requested to cancel'
}

const {
  NOT_SIGNED_BY_CORRECT_PERSON,
  RECYCLING_OBLIGATIONS_CHANGED,
  PRODUCER_CAN_MEET_RECYCLING_OBLIGATIONS,
  COMPLIANCE_SCHEME_CAN_MEET_RECYCLING_OBLIGATIONS,
  PRODUCER_REQUESTED_TO_CANCEL,
  COMPLIANCE_SCHEME_REQUESTED_TO_CANCEL
} = CANONICAL_CANCEL_REASON_LABELS

export const PRODUCER_REQUEST_REASON_KEY = 'producer-request'

const canonicalLabelToReasonKeyMap = {
  [NOT_SIGNED_BY_CORRECT_PERSON]: {
    key: 'incorrect-signer',
    registrationType: null
  },
  [RECYCLING_OBLIGATIONS_CHANGED]: {
    key: 'obligations-changed',
    registrationType: null
  },
  [PRODUCER_CAN_MEET_RECYCLING_OBLIGATIONS]: {
    key: 'submitted-early',
    registrationType: 'DirectProducer'
  },
  [COMPLIANCE_SCHEME_CAN_MEET_RECYCLING_OBLIGATIONS]: {
    key: 'submitted-early',
    registrationType: 'ComplianceScheme'
  },
  [PRODUCER_REQUESTED_TO_CANCEL]: {
    key: PRODUCER_REQUEST_REASON_KEY,
    registrationType: 'DirectProducer'
  },
  [COMPLIANCE_SCHEME_REQUESTED_TO_CANCEL]: {
    key: PRODUCER_REQUEST_REASON_KEY,
    registrationType: 'ComplianceScheme'
  }
}

export const LEGACY_CANCEL_REASON_ALIASES = {
  RequestedToCancel: {
    key: PRODUCER_REQUEST_REASON_KEY,
    registrationType: null
  }
}

export const canonicalLabelToTemplateKey = {
  [NOT_SIGNED_BY_CORRECT_PERSON]: 'notSignedByCorrectPerson',
  [RECYCLING_OBLIGATIONS_CHANGED]: 'recyclingObligationsChanged',
  [PRODUCER_CAN_MEET_RECYCLING_OBLIGATIONS]: 'canMeetRecyclingObligations',
  [COMPLIANCE_SCHEME_CAN_MEET_RECYCLING_OBLIGATIONS]:
    'canMeetRecyclingObligations',
  [PRODUCER_REQUESTED_TO_CANCEL]: 'producerRequested',
  [COMPLIANCE_SCHEME_REQUESTED_TO_CANCEL]: 'producerRequested'
}

export function canonicalLabelToReasonKey(storedReason) {
  if (!storedReason) {
    return null
  }

  return canonicalLabelToReasonKeyMap[storedReason] ?? null
}

export function allCanonicalCancelReasonLabels() {
  return Object.values(CANONICAL_CANCEL_REASON_LABELS)
}
