import { translateCancellationNotificationField } from '../common/locale-strings.js'
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

const NOTIFY_PERSONALISATION_FIELDS = [
  'certOrStatement',
  'certOrStatementBullet',
  'certOrStatementBullet2'
]

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

function buildNotifyPersonalisationFields(registrationType) {
  const personalisation = {}

  for (const field of NOTIFY_PERSONALISATION_FIELDS) {
    personalisation[field] = translateCancellationNotificationField(
      registrationType,
      field,
      'en'
    )
    personalisation[`${field}_cy`] = translateCancellationNotificationField(
      registrationType,
      field,
      'cy'
    )
  }

  return personalisation
}

export function buildCancellationNotificationParameters({
  registrationType,
  environmentalRegulator,
  businessCountry
} = {}) {
  const parameters = {
    ...buildNotifyPersonalisationFields(registrationType),
    regulator: mapEnvironmentalRegulatorDisplay(environmentalRegulator)
  }

  if (shouldIncludeRegulatorCy(businessCountry, environmentalRegulator)) {
    parameters.regulator_cy = REGULATOR_DISPLAY_CY_NRW
  }

  return parameters
}
