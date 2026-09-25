import { describe, expect, test } from 'vitest'

import {
  cancellationEmailTemplateIds,
  isWelshOrganisation,
  mapRegistrationTypeToEntityTypeCode,
  resolveCancellationTemplateId,
  resolveCancellationTemplateIdForReasonKey
} from './cancellation-email-templates.js'

describe('cancellation-email-templates', () => {
  test('maps direct producer registration type to DR', () => {
    expect(mapRegistrationTypeToEntityTypeCode('DirectProducer')).toBe('DR')
  })

  test('maps compliance scheme registration type to CS', () => {
    expect(mapRegistrationTypeToEntityTypeCode('ComplianceScheme')).toBe('CS')
  })

  test('detects Welsh organisations by business country', () => {
    expect(isWelshOrganisation('GB-WLS')).toBe(true)
    expect(isWelshOrganisation('GB-ENG')).toBe(false)
  })

  test.each([
    ['Not signed by correct person', false, 'notSignedByCorrectPerson'],
    ['Recycling obligations changed', false, 'recyclingObligationsChanged'],
    [
      'Producer can meet recycling obligations',
      false,
      'canMeetRecyclingObligations'
    ],
    [
      'Compliance scheme can meet recycling obligations',
      false,
      'canMeetRecyclingObligations'
    ],
    ['Producer requested to cancel', false, 'producerRequested'],
    ['Compliance scheme requested to cancel', false, 'producerRequested']
  ])(
    'resolves English template for "%s"',
    (reasonLabel, isWelsh, templateKey) => {
      expect(resolveCancellationTemplateId(reasonLabel, { isWelsh })).toBe(
        cancellationEmailTemplateIds[templateKey].en
      )
    }
  )

  test('resolves Welsh template for a known reason label', () => {
    expect(
      resolveCancellationTemplateId('Producer requested to cancel', {
        isWelsh: true
      })
    ).toBe(cancellationEmailTemplateIds.producerRequested.cy)
  })

  test('returns null for an unknown reason label', () => {
    expect(resolveCancellationTemplateId('Unknown reason')).toBeNull()
  })

  test.each([
    ['incorrect-signer', false, 'notSignedByCorrectPerson'],
    ['obligations-changed', false, 'recyclingObligationsChanged'],
    ['submitted-early', false, 'canMeetRecyclingObligations'],
    ['producer-request', false, 'producerRequested']
  ])(
    'resolves English template for reason key "%s"',
    (reasonKey, isWelsh, templateKey) => {
      expect(
        resolveCancellationTemplateIdForReasonKey(reasonKey, { isWelsh })
      ).toBe(cancellationEmailTemplateIds[templateKey].en)
    }
  )

  test('resolves Welsh template for reason key regardless of translated label', () => {
    expect(
      resolveCancellationTemplateIdForReasonKey('producer-request', {
        isWelsh: true
      })
    ).toBe(cancellationEmailTemplateIds.producerRequested.cy)
  })

  test('returns null for an unknown reason key', () => {
    expect(
      resolveCancellationTemplateIdForReasonKey('not-a-valid-reason')
    ).toBeNull()
  })
})
