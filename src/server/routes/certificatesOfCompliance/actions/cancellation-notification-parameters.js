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

// Reverse lookup so we can accept either the short code (e.g. NRW) or the
// full display name (e.g. Natural Resources Wales) — the Obligations API
// returns the display name.
const REGULATOR_CODE_BY_DISPLAY = Object.fromEntries(
  Object.entries(REGULATOR_DISPLAY_EN).map(([code, display]) => [display, code])
)

const NOTIFY_PERSONALISATION_FIELDS = [
  'certOrStatement',
  'certOrStatementBullet',
  'certOrStatementBullet2'
]

export function normaliseRegulatorCode(environmentalRegulator) {
  if (environmentalRegulator == null || environmentalRegulator === '') {
    return environmentalRegulator
  }

  const trimmed = environmentalRegulator.trim()
  if (REGULATOR_DISPLAY_EN[trimmed]) {
    return trimmed
  }

  return REGULATOR_CODE_BY_DISPLAY[trimmed] ?? trimmed
}

export function mapEnvironmentalRegulatorDisplay(environmentalRegulator) {
  if (environmentalRegulator == null || environmentalRegulator === '') {
    return environmentalRegulator
  }

  const code = normaliseRegulatorCode(environmentalRegulator)
  return REGULATOR_DISPLAY_EN[code] ?? environmentalRegulator.trim()
}

function shouldIncludeRegulatorCy(businessCountry, environmentalRegulator) {
  return (
    isWelshOrganisation(businessCountry) &&
    normaliseRegulatorCode(environmentalRegulator) === 'NRW'
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
