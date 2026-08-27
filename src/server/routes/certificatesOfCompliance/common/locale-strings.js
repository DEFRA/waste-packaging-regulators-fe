import { localeToBcp47 } from '#server/common/helpers/i18n/locales.js'
import { pageI18n, translate } from '#server/common/helpers/i18n/translate.js'

const BASE = 'certificatesOfCompliance'

export function cocPageI18n(locale, pageKey) {
  return pageI18n(locale, `${BASE}.${pageKey}`)
}

export function translateCoc(locale, key, params = {}) {
  return translate(locale, `${BASE}.${key}`, params)
}

const emptyTabKeyByTab = {
  pending: 'list.emptyTab.pending',
  accepted: 'list.emptyTab.accepted',
  'not-submitted': 'list.emptyTab.notSubmitted'
}

const tabSummaryKeyByTab = {
  pending: 'list.tabSummary.pending',
  accepted: 'list.tabSummary.accepted',
  'not-submitted': 'list.tabSummary.notSubmitted'
}

export function translateEmptyTabMessage(tab, locale) {
  const key = emptyTabKeyByTab[tab]
  return key ? translateCoc(locale, key) : ''
}

export function translateTabSummaryText(tab, locale) {
  const key = tabSummaryKeyByTab[tab]
  return key ? translateCoc(locale, key) : ''
}

export function translateSuccessBanner(registrationType, bannerType, locale) {
  const regKey =
    registrationType === 'ComplianceScheme'
      ? 'complianceScheme'
      : 'directProducer'
  return {
    heading: translateCoc(
      locale,
      `common.successBanner.${regKey}.${bannerType}.heading`
    ),
    text: translateCoc(
      locale,
      `common.successBanner.${regKey}.${bannerType}.text`
    )
  }
}

export function translateActionLabels(registrationType, locale) {
  const regKey =
    registrationType === 'ComplianceScheme'
      ? 'complianceScheme'
      : 'directProducer'
  return {
    accept: translateCoc(locale, `common.actions.${regKey}.accept`),
    cancel: translateCoc(locale, `common.actions.${regKey}.cancel`)
  }
}

export function translateOrganisationTypeDisplay(registrationType, locale) {
  const key =
    registrationType === 'ComplianceScheme'
      ? 'common.organisationType.complianceScheme'
      : 'common.organisationType.directProducer'
  return translateCoc(locale, key)
}

export function translateNoData(locale) {
  return translateCoc(locale, 'common.noData')
}

export function translateUnknownOrganisation(locale) {
  return translateCoc(locale, 'common.unknownOrganisation')
}

export function translateComplianceDocumentNoun(registrationType, locale) {
  const key =
    registrationType === 'ComplianceScheme'
      ? 'common.documentNoun.statementOfCompliance'
      : 'common.documentNoun.certificateOfCompliance'
  return translateCoc(locale, key)
}

export function translateComplianceTypeLabel(
  obligationYear,
  registrationType,
  locale
) {
  if (obligationYear == null) {
    return translateNoData(locale)
  }
  return translateCoc(locale, 'common.complianceTypeLabel', {
    year: String(obligationYear),
    documentNoun: translateComplianceDocumentNoun(registrationType, locale)
  })
}

export function translateRegulation43Statement(
  regulation43Met,
  organisationName,
  locale
) {
  if (regulation43Met == null) {
    return null
  }
  const compliance = regulation43Met
    ? translateCoc(locale, 'common.regulation43.complied')
    : translateCoc(locale, 'common.regulation43.notComplied')
  return translateCoc(locale, 'common.regulation43.statement', {
    organisationName,
    compliance
  })
}

export function formatLocaleDate(isoString, locale, options = {}) {
  if (!isoString) {
    return null
  }
  return new Date(isoString).toLocaleDateString(localeToBcp47(locale), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...options
  })
}

export function formatLocaleHistoryDate(isoString, locale) {
  if (!isoString) {
    return null
  }
  const bcp47 = localeToBcp47(locale)
  const d = new Date(isoString)
  const datePart = d.toLocaleDateString(bcp47, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  })
  const timePart = d.toLocaleTimeString(bcp47, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC'
  })
  const atWord = locale === 'cy' ? 'am' : 'at'
  return `${datePart} ${atWord} ${timePart}`
}
