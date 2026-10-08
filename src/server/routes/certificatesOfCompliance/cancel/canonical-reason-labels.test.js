import { describe, expect, it } from 'vitest'
import {
  allCanonicalCancelReasonLabels,
  CANONICAL_CANCEL_REASON_LABELS,
  canonicalLabelToReasonKey,
  LEGACY_CANCEL_REASON_ALIASES,
  PRODUCER_REQUEST_REASON_KEY
} from './canonical-reason-labels.js'

describe('canonical-reason-labels.js', () => {
  it('maps all six canonical English strings to reason keys', () => {
    expect(
      canonicalLabelToReasonKey(
        CANONICAL_CANCEL_REASON_LABELS.NOT_SIGNED_BY_CORRECT_PERSON
      )
    ).toEqual({ key: 'incorrect-signer', registrationType: null })

    expect(
      canonicalLabelToReasonKey(
        CANONICAL_CANCEL_REASON_LABELS.RECYCLING_OBLIGATIONS_CHANGED
      )
    ).toEqual({ key: 'obligations-changed', registrationType: null })

    expect(
      canonicalLabelToReasonKey(
        CANONICAL_CANCEL_REASON_LABELS.PRODUCER_CAN_MEET_RECYCLING_OBLIGATIONS
      )
    ).toEqual({ key: 'submitted-early', registrationType: 'DirectProducer' })

    expect(
      canonicalLabelToReasonKey(
        CANONICAL_CANCEL_REASON_LABELS.COMPLIANCE_SCHEME_CAN_MEET_RECYCLING_OBLIGATIONS
      )
    ).toEqual({
      key: 'submitted-early',
      registrationType: 'ComplianceScheme'
    })

    expect(
      canonicalLabelToReasonKey(
        CANONICAL_CANCEL_REASON_LABELS.PRODUCER_REQUESTED_TO_CANCEL
      )
    ).toEqual({
      key: PRODUCER_REQUEST_REASON_KEY,
      registrationType: 'DirectProducer'
    })

    expect(
      canonicalLabelToReasonKey(
        CANONICAL_CANCEL_REASON_LABELS.COMPLIANCE_SCHEME_REQUESTED_TO_CANCEL
      )
    ).toEqual({
      key: PRODUCER_REQUEST_REASON_KEY,
      registrationType: 'ComplianceScheme'
    })
  })

  it('returns null for empty stored reasons', () => {
    expect(canonicalLabelToReasonKey(null)).toBeNull()
    expect(canonicalLabelToReasonKey('')).toBeNull()
  })

  it('returns all canonical English labels', () => {
    expect(allCanonicalCancelReasonLabels()).toEqual(
      Object.values(CANONICAL_CANCEL_REASON_LABELS)
    )
  })

  it('returns null for unknown stored reasons', () => {
    expect(
      canonicalLabelToReasonKey('Submitted after the deadline.')
    ).toBeNull()
  })

  it('defines a legacy alias for RequestedToCancel', () => {
    expect(LEGACY_CANCEL_REASON_ALIASES.RequestedToCancel).toEqual({
      key: PRODUCER_REQUEST_REASON_KEY,
      registrationType: null
    })
  })
})
