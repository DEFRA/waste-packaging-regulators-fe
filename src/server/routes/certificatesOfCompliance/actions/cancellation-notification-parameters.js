import { isComplianceSchemeRegistrationType } from '../common/display.js'
import { isWelshOrganisation } from '../cancel/cancellation-email-templates.js'

const THE_ENVIRONMENT_AGENCY = 'The Environment Agency'
const THE_SCOTTISH_ENVIRONMENT_PROTECTION_AGENCY =
  'The Scottish Environment Protection Agency'
const THE_NORTHERN_IRELAND_ENVIRONMENT_AGENCY =
  'The Northern Ireland Environment Agency'
const NATURAL_RESOURCES_WALES = 'Natural Resources Wales'
const REGULATOR_DISPLAY_CY_NRW = 'Cyfoeth Naturiol Cymru'

const REGULATOR_DISPLAY_EN = {
  EA: THE_ENVIRONMENT_AGENCY,
  SEPA: THE_SCOTTISH_ENVIRONMENT_PROTECTION_AGENCY,
  NIEA: THE_NORTHERN_IRELAND_ENVIRONMENT_AGENCY,
  NRW: NATURAL_RESOURCES_WALES
}

export function mapEnvironmentalRegulatorDisplay(environmentalRegulator) {
  if (environmentalRegulator == null || environmentalRegulator === '') {
    return environmentalRegulator
  }

  return (
    REGULATOR_DISPLAY_EN[environmentalRegulator.trim()] ??
    environmentalRegulator
  )
}

function shouldIncludeRegulatorCy(businessCountry, environmentalRegulator) {
  return (
    isWelshOrganisation(businessCountry) &&
    environmentalRegulator?.trim() === 'NRW'
  )
}

export function buildCancellationNotificationParameters({
  registrationType,
  environmentalRegulator,
  businessCountry
} = {}) {
  const complianceScheme = isComplianceSchemeRegistrationType(registrationType)

  const parameters = {
    certOrStatement: complianceScheme ? 'statement' : 'certificate',
    certOrStatement_cy: complianceScheme ? 'datganiad' : 'tystysgrif',
    regulator: mapEnvironmentalRegulatorDisplay(environmentalRegulator)
  }

  if (shouldIncludeRegulatorCy(businessCountry, environmentalRegulator)) {
    parameters.regulator_cy = REGULATOR_DISPLAY_CY_NRW
  }

  return parameters
}
