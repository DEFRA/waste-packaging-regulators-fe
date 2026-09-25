import { describe, expect, test } from 'vitest'

import {
  expectedComplianceSchemeNotifyFields,
  expectedDirectProducerNotifyFields
} from '#test-helpers/cancellation-notification-parameters.expected.js'
import {
  buildCancellationNotificationParameters,
  mapEnvironmentalRegulatorDisplay,
  normaliseRegulatorCode
} from './cancellation-notification-parameters.js'

describe('normaliseRegulatorCode', () => {
  test.each([
    ['EA', 'EA'],
    ['SEPA', 'SEPA'],
    ['NIEA', 'NIEA'],
    ['NRW', 'NRW']
  ])('returns short code %s unchanged', (input, expected) => {
    expect(normaliseRegulatorCode(input)).toBe(expected)
  })

  test.each([
    ['The Environment Agency', 'EA'],
    ['The Scottish Environment Protection Agency', 'SEPA'],
    ['The Northern Ireland Environment Agency', 'NIEA'],
    ['Natural Resources Wales', 'NRW']
  ])('maps Obligations API display name %s to %s', (input, expected) => {
    expect(normaliseRegulatorCode(input)).toBe(expected)
  })

  test('trims whitespace before resolving display names', () => {
    expect(normaliseRegulatorCode('  Natural Resources Wales  ')).toBe('NRW')
  })

  test('returns unknown values unchanged', () => {
    expect(normaliseRegulatorCode('Unknown Agency')).toBe('Unknown Agency')
  })

  test('returns null and empty string unchanged', () => {
    expect(normaliseRegulatorCode(null)).toBeNull()
    expect(normaliseRegulatorCode('')).toBe('')
  })
})

describe('mapEnvironmentalRegulatorDisplay', () => {
  test.each([
    ['EA', 'The Environment Agency'],
    ['SEPA', 'The Scottish Environment Protection Agency'],
    ['NIEA', 'The Northern Ireland Environment Agency'],
    ['NRW', 'Natural Resources Wales']
  ])('maps short code %s to %s', (input, expected) => {
    expect(mapEnvironmentalRegulatorDisplay(input)).toBe(expected)
  })

  test('returns unknown values unchanged', () => {
    expect(mapEnvironmentalRegulatorDisplay('Unknown Agency')).toBe(
      'Unknown Agency'
    )
  })

  test('returns null and empty string unchanged', () => {
    expect(mapEnvironmentalRegulatorDisplay(null)).toBeNull()
    expect(mapEnvironmentalRegulatorDisplay('')).toBe('')
  })
})

describe('buildCancellationNotificationParameters', () => {
  test('builds English regulator for a direct producer in England without regulator_cy', () => {
    expect(
      buildCancellationNotificationParameters({
        registrationType: 'DirectProducer',
        environmentalRegulator: 'EA',
        businessCountry: 'GB-ENG'
      })
    ).toEqual({
      ...expectedDirectProducerNotifyFields(),
      regulator: 'The Environment Agency'
    })
  })

  test('builds English regulator for a Scottish producer without regulator_cy', () => {
    expect(
      buildCancellationNotificationParameters({
        registrationType: 'DirectProducer',
        environmentalRegulator: 'SEPA',
        businessCountry: 'GB-SCT'
      })
    ).toEqual({
      ...expectedDirectProducerNotifyFields(),
      regulator: 'The Scottish Environment Protection Agency'
    })
  })

  test('builds Welsh NRW regulator_cy only for a Wales-registered NRW org', () => {
    expect(
      buildCancellationNotificationParameters({
        registrationType: 'DirectProducer',
        environmentalRegulator: 'NRW',
        businessCountry: 'GB-WLS'
      })
    ).toEqual({
      ...expectedDirectProducerNotifyFields(),
      regulator: 'Natural Resources Wales',
      regulator_cy: 'Cyfoeth Naturiol Cymru'
    })
  })

  test('includes regulator_cy when the Obligations API returns the NRW display name for a Wales-registered org', () => {
    expect(
      buildCancellationNotificationParameters({
        registrationType: 'DirectProducer',
        environmentalRegulator: 'Natural Resources Wales',
        businessCountry: 'GB-WLS'
      })
    ).toEqual({
      ...expectedDirectProducerNotifyFields(),
      regulator: 'Natural Resources Wales',
      regulator_cy: 'Cyfoeth Naturiol Cymru'
    })
  })

  test('omits regulator_cy for a Wales-registered org regulated by EA', () => {
    expect(
      buildCancellationNotificationParameters({
        registrationType: 'DirectProducer',
        environmentalRegulator: 'EA',
        businessCountry: 'GB-WLS'
      })
    ).toEqual({
      ...expectedDirectProducerNotifyFields(),
      regulator: 'The Environment Agency'
    })
  })

  test('builds compliance scheme notification parameters', () => {
    expect(
      buildCancellationNotificationParameters({
        registrationType: 'ComplianceScheme',
        environmentalRegulator: 'NRW',
        businessCountry: 'GB-WLS'
      })
    ).toEqual({
      ...expectedComplianceSchemeNotifyFields(),
      regulator: 'Natural Resources Wales',
      regulator_cy: 'Cyfoeth Naturiol Cymru'
    })
  })

  test('accepts the API display name for the regulator on English previews', () => {
    expect(
      buildCancellationNotificationParameters({
        registrationType: 'DirectProducer',
        environmentalRegulator: 'The Environment Agency',
        businessCountry: 'GB-ENG'
      })
    ).toEqual({
      ...expectedDirectProducerNotifyFields(),
      regulator: 'The Environment Agency'
    })
  })
})
