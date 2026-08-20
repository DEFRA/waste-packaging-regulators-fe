import { describe, expect, test } from 'vitest'

import {
  buildCancellationNotificationParameters,
  mapEnvironmentalRegulatorWelsh
} from './cancellation-notification-parameters.js'

describe('mapEnvironmentalRegulatorWelsh', () => {
  test('maps Natural Resources Wales to the Welsh regulator name', () => {
    expect(mapEnvironmentalRegulatorWelsh('Natural Resources Wales')).toBe(
      'Cyfoeth Naturiol Cymru (CNC)'
    )
  })

  test('maps NRW to the Welsh regulator name', () => {
    expect(mapEnvironmentalRegulatorWelsh('NRW')).toBe(
      'Cyfoeth Naturiol Cymru (CNC)'
    )
  })

  test('maps Environment Agency to the Welsh regulator name', () => {
    expect(mapEnvironmentalRegulatorWelsh('Environment Agency')).toBe(
      'Asiantaeth yr Amgylchedd'
    )
  })

  test('maps EA to the Welsh regulator name', () => {
    expect(mapEnvironmentalRegulatorWelsh('EA')).toBe(
      'Asiantaeth yr Amgylchedd'
    )
  })

  test('defaults to Regulator for unknown or missing values', () => {
    expect(mapEnvironmentalRegulatorWelsh('SEPA')).toBe('Regulator')
    expect(mapEnvironmentalRegulatorWelsh(null)).toBe('Regulator')
    expect(mapEnvironmentalRegulatorWelsh('')).toBe('Regulator')
  })
})

describe('buildCancellationNotificationParameters', () => {
  test('builds direct producer notification parameters', () => {
    expect(
      buildCancellationNotificationParameters({
        registrationType: 'DirectProducer',
        environmentalRegulator: 'EA'
      })
    ).toEqual({
      certOrStatement: 'certificate',
      certOrStatement_cy: 'tystysgrif',
      regulator_cy: 'Asiantaeth yr Amgylchedd'
    })
  })

  test('builds compliance scheme notification parameters', () => {
    expect(
      buildCancellationNotificationParameters({
        registrationType: 'ComplianceScheme',
        environmentalRegulator: 'Natural Resources Wales'
      })
    ).toEqual({
      certOrStatement: 'statement',
      certOrStatement_cy: 'datganiad',
      regulator_cy: 'Cyfoeth Naturiol Cymru (CNC)'
    })
  })
})
