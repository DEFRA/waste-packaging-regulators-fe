import { translate } from '#server/common/helpers/i18n/translate.js'

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
