import { describe, expect, test } from 'vitest'

import {
  buildCancellationNotificationParameters,
  mapEnvironmentalRegulatorDisplay
} from './cancellation-notification-parameters.js'

describe('mapEnvironmentalRegulatorDisplay', () => {
  test.each([
    ['EA', 'The Environment Agency'],
    ['SEPA', 'The Scottish Environment Protection Agency'],
    ['NIEA', 'The Northern Ireland Environment Agency'],
    ['NRW', 'Natural Resources Wales']
  ])('maps %s to %s', (input, expected) => {
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
      certOrStatement: 'certificate',
      certOrStatement_cy: 'tystysgrif',
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
      certOrStatement: 'certificate',
      certOrStatement_cy: 'tystysgrif',
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
      certOrStatement: 'certificate',
      certOrStatement_cy: 'tystysgrif',
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
      certOrStatement: 'certificate',
      certOrStatement_cy: 'tystysgrif',
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
      certOrStatement: 'statement',
      certOrStatement_cy: 'datganiad',
      regulator: 'Natural Resources Wales',
      regulator_cy: 'Cyfoeth Naturiol Cymru'
    })
  })
})
