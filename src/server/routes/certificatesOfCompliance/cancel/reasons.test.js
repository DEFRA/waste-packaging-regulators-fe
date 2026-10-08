import { describe, expect, it } from 'vitest'
import { CANONICAL_CANCEL_REASON_LABELS } from './canonical-reason-labels.js'
import {
  displayStoredCancelReason,
  getCancelReasonLabel,
  resolveCancelReasonKeyFromStoredLabel
} from './reasons.js'

describe('reasons.js', () => {
  describe('resolveCancelReasonKeyFromStoredLabel', () => {
    it('resolves an English direct producer label', () => {
      expect(
        resolveCancelReasonKeyFromStoredLabel(
          'Producer requested to cancel',
          'DirectProducer'
        )
      ).toEqual({
        key: 'producer-request',
        registrationType: 'DirectProducer'
      })
    })

    it('resolves a Welsh direct producer label', () => {
      const welshLabel = getCancelReasonLabel(
        'DirectProducer',
        'producer-request',
        'cy'
      )

      expect(
        resolveCancelReasonKeyFromStoredLabel(welshLabel, 'DirectProducer')
      ).toEqual({
        key: 'producer-request',
        registrationType: 'DirectProducer'
      })
    })

    it('resolves a compliance scheme label when registration type is unknown', () => {
      expect(
        resolveCancelReasonKeyFromStoredLabel(
          'Compliance scheme requested to cancel',
          undefined
        )
      ).toEqual({
        key: 'producer-request',
        registrationType: 'ComplianceScheme'
      })
    })

    it('returns null for an unknown label', () => {
      expect(
        resolveCancelReasonKeyFromStoredLabel('Submitted after the deadline.')
      ).toBeNull()
    })

    it('resolves a canonical English string without locale scanning', () => {
      expect(
        resolveCancelReasonKeyFromStoredLabel(
          CANONICAL_CANCEL_REASON_LABELS.PRODUCER_REQUESTED_TO_CANCEL,
          'DirectProducer'
        )
      ).toEqual({
        key: 'producer-request',
        registrationType: 'DirectProducer'
      })
    })

    it('resolves the RequestedToCancel legacy alias', () => {
      expect(
        resolveCancelReasonKeyFromStoredLabel('RequestedToCancel')
      ).toEqual({
        key: 'producer-request',
        registrationType: 'DirectProducer'
      })
    })
  })

  describe('displayStoredCancelReason', () => {
    it('displays an English label when the audit stores Welsh text', () => {
      const welshLabel = getCancelReasonLabel(
        'DirectProducer',
        'producer-request',
        'cy'
      )

      expect(
        displayStoredCancelReason(welshLabel, 'DirectProducer', 'en')
      ).toBe('Producer requested to cancel')
    })

    it('displays a Welsh label when the audit stores English text', () => {
      const welshLabel = getCancelReasonLabel(
        'DirectProducer',
        'producer-request',
        'cy'
      )

      expect(
        displayStoredCancelReason(
          'Producer requested to cancel',
          'DirectProducer',
          'cy'
        )
      ).toBe(welshLabel)
    })

    it('returns legacy free-text reasons unchanged', () => {
      expect(
        displayStoredCancelReason(
          'Submitted after the deadline.',
          'DirectProducer',
          'en'
        )
      ).toBe('Submitted after the deadline.')
    })

    it('localises the RequestedToCancel legacy alias', () => {
      expect(
        displayStoredCancelReason('RequestedToCancel', 'DirectProducer', 'en')
      ).toBe('Producer requested to cancel')

      const welshLabel = getCancelReasonLabel(
        'DirectProducer',
        'producer-request',
        'cy'
      )
      expect(
        displayStoredCancelReason('RequestedToCancel', 'DirectProducer', 'cy')
      ).toBe(welshLabel)
    })
  })
})
