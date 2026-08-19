import { isComplianceSchemeRegistrationType } from '../common/display.js'

const ENVIRONMENTAL_REGULATOR_WELSH_BY_REGULATOR = {
  'Natural Resources Wales': 'Cyfoeth Naturiol Cymru (CNC)',
  NRW: 'Cyfoeth Naturiol Cymru (CNC)',
  'Environment Agency': 'Asiantaeth yr Amgylchedd',
  EA: 'Asiantaeth yr Amgylchedd'
}

const DEFAULT_ENVIRONMENTAL_REGULATOR_WELSH = 'Regulator'

export function mapEnvironmentalRegulatorWelsh(environmentalRegulator) {
  if (environmentalRegulator == null || environmentalRegulator === '') {
    return DEFAULT_ENVIRONMENTAL_REGULATOR_WELSH
  }

  return (
    ENVIRONMENTAL_REGULATOR_WELSH_BY_REGULATOR[environmentalRegulator] ??
    DEFAULT_ENVIRONMENTAL_REGULATOR_WELSH
  )
}

export function buildCancellationNotificationParameters({
  registrationType,
  environmentalRegulator
} = {}) {
  const complianceScheme = isComplianceSchemeRegistrationType(registrationType)

  return {
    certOrStatement: complianceScheme ? 'statement' : 'certificate',
    certOrStatement_cy: complianceScheme ? 'datganiad' : 'tystysgrif',
    regulator_cy: mapEnvironmentalRegulatorWelsh(environmentalRegulator)
  }
}
