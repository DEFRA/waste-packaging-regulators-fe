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

// Do not collapse this back into one translated string: interpolate() substitutes
// parameters raw, so bolding the term would need `| safe` and make the search box
// an HTML injection point.
const SEARCH_TERM_PLACEHOLDER = '{{searchTerm}}'

export function translateSearchResultCount(locale, count) {
  const key =
    count === 1
      ? 'list.searchResults.resultSingular'
      : 'list.searchResults.resultPlural'

  const sentence = translateCoc(locale, key, {
    count: String(count),
    searchTerm: SEARCH_TERM_PLACEHOLDER
  })

  const [before, after = ''] = sentence.split(SEARCH_TERM_PLACEHOLDER)

  return { before, after }
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

export function translateCancellationNotificationField(
  registrationType,
  field,
  locale
) {
  const regKey =
    registrationType === 'ComplianceScheme'
      ? 'complianceScheme'
      : 'directProducer'
  return translateCoc(
    locale,
    `cancel.notificationParameters.${regKey}.${field}`
  )
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
