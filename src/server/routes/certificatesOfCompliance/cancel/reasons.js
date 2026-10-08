import { translate } from '#server/common/helpers/i18n/translate.js'
import {
  canonicalLabelToReasonKey,
  LEGACY_CANCEL_REASON_ALIASES
} from './canonical-reason-labels.js'

const REASON_BASE = 'certificatesOfCompliance.cancel.reason'

function wordingFor(registrationType, locale) {
  const isComplianceScheme = registrationType === 'ComplianceScheme'
  return {
    docType: isComplianceScheme
      ? translate(locale, `${REASON_BASE}.wording.docTypeStatement`)
      : translate(locale, `${REASON_BASE}.wording.docTypeCertificate`),
    producerType: isComplianceScheme
      ? translate(locale, `${REASON_BASE}.wording.producerTypeComplianceScheme`)
      : translate(locale, `${REASON_BASE}.wording.producerTypeProducer`),
    producerTypeLower: isComplianceScheme
      ? translate(
          locale,
          `${REASON_BASE}.wording.producerTypeLowerComplianceScheme`
        )
      : translate(locale, `${REASON_BASE}.wording.producerTypeLowerProducer`),
    notMet: isComplianceScheme
      ? ''
      : translate(locale, `${REASON_BASE}.reasons.submittedEarly.notMetSuffix`)
  }
}

const cancelReasonKeys = {
  'incorrect-signer': 'incorrectSigner',
  'obligations-changed': 'obligationsChanged',
  'submitted-early': 'submittedEarly',
  'producer-request': 'producerRequest'
}

export function isValidCancelReason(reason) {
  return Object.hasOwn(cancelReasonKeys, reason)
}

export function buildCancelReasonItems(registrationType, selected, locale) {
  const wording = wordingFor(registrationType, locale)
  return Object.entries(cancelReasonKeys).map(([value, key]) => ({
    value,
    text: translate(locale, `${REASON_BASE}.reasons.${key}.label`, wording),
    hint: {
      text: translate(locale, `${REASON_BASE}.reasons.${key}.hint`, wording)
    },
    checked: value === selected
  }))
}

export function getCancelReasonLabel(registrationType, reason, locale) {
  if (!isValidCancelReason(reason)) {
    return null
  }
  const key = cancelReasonKeys[reason]
  return translate(
    locale,
    `${REASON_BASE}.reasons.${key}.label`,
    wordingFor(registrationType, locale)
  )
}

const REGISTRATION_TYPES = ['DirectProducer', 'ComplianceScheme']

function registrationTypesToTry(registrationType) {
  if (
    registrationType === 'ComplianceScheme' ||
    registrationType === 'DirectProducer'
  ) {
    return [registrationType]
  }
  return REGISTRATION_TYPES
}

function resolveFromWelshStoredLabel(storedReason, registrationType) {
  for (const regType of registrationTypesToTry(registrationType)) {
    for (const reasonKey of Object.keys(cancelReasonKeys)) {
      if (getCancelReasonLabel(regType, reasonKey, 'cy') === storedReason) {
        return { key: reasonKey, registrationType: regType }
      }
    }
  }

  return null
}

export function resolveCancelReasonKeyFromStoredLabel(
  storedReason,
  registrationType
) {
  if (!storedReason) {
    return null
  }

  const canonical = canonicalLabelToReasonKey(storedReason)
  if (canonical) {
    return canonical
  }

  const legacy = LEGACY_CANCEL_REASON_ALIASES[storedReason]
  if (legacy) {
    return legacy
  }

  return resolveFromWelshStoredLabel(storedReason, registrationType)
}

export function displayStoredCancelReason(
  storedReason,
  registrationType,
  locale
) {
  if (!storedReason) {
    return null
  }

  const resolved = resolveCancelReasonKeyFromStoredLabel(
    storedReason,
    registrationType
  )
  if (!resolved) {
    return storedReason
  }

  const regType =
    resolved.registrationType ??
    (registrationType === 'ComplianceScheme' ||
    registrationType === 'DirectProducer'
      ? registrationType
      : 'DirectProducer')

  return getCancelReasonLabel(regType, resolved.key, locale)
}
