import { translate } from '#server/common/helpers/i18n/translate.js'

const DIRECT_PRODUCER_BASE =
  'certificatesOfCompliance.cancel.notificationParameters.directProducer'
const COMPLIANCE_SCHEME_BASE =
  'certificatesOfCompliance.cancel.notificationParameters.complianceScheme'

function notifyFieldsFromLocale(base, enLocale, cyLocale) {
  const fields = [
    'certOrStatement',
    'certOrStatementBullet',
    'certOrStatementBullet2'
  ]

  return fields.reduce((personalisation, field) => {
    personalisation[field] = translate(enLocale, `${base}.${field}`)
    personalisation[`${field}_cy`] = translate(cyLocale, `${base}.${field}`)
    return personalisation
  }, {})
}

export function expectedDirectProducerNotifyFields() {
  return notifyFieldsFromLocale(DIRECT_PRODUCER_BASE, 'en', 'cy')
}

export function expectedComplianceSchemeNotifyFields() {
  return notifyFieldsFromLocale(COMPLIANCE_SCHEME_BASE, 'en', 'cy')
}
