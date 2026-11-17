import {
  DEFAULT_LOCALE,
  localeToBcp47
} from '#server/common/helpers/i18n/locales.js'
import {
  hasOwnLocaleKey,
  translate
} from '#server/common/helpers/i18n/translate.js'

const REPORT_STRINGS = 'certificatesOfCompliance.report'

const COLUMN_KEYS = [
  'organisationName',
  'organisationReference',
  'status',
  'regulation43',
  'recyclingObligations',
  'percentageMet',
  'totalObligationTonnes',
  'dateSubmitted',
  'dateAccepted',
  'acceptedBy',
  'cancellations'
]

const LABEL_KEYS = [
  'sheetName',
  'heading.certificates',
  'heading.statements',
  ...COLUMN_KEYS.map((key) => `columns.${key}`),
  'status.pending',
  'status.accepted',
  'status.notSubmitted',
  'recyclingObligations.met',
  'recyclingObligations.notMet',
  'regulation43.compliant',
  'regulation43.notCompliant'
]

// The report changes language only once every report string is translated, so
// a file is never half translated.
export function reportLocale(locale) {
  const translated = LABEL_KEYS.every((key) =>
    hasOwnLocaleKey(locale, `${REPORT_STRINGS}.${key}`)
  )
  return translated ? locale : DEFAULT_LOCALE
}

export function reportLabels(locale = DEFAULT_LOCALE) {
  const language = reportLocale(locale)
  const t = (key, params) =>
    translate(language, `${REPORT_STRINGS}.${key}`, params)

  return {
    bcp47: localeToBcp47(language),
    sheetName: t('sheetName'),
    heading: {
      certificates: (day) => t('heading.certificates', { day }),
      statements: (day) => t('heading.statements', { day })
    },
    columns: Object.fromEntries(
      COLUMN_KEYS.map((key) => [key, t(`columns.${key}`)])
    ),
    status: {
      pending: t('status.pending'),
      accepted: t('status.accepted'),
      notSubmitted: t('status.notSubmitted')
    },
    recyclingObligations: {
      met: t('recyclingObligations.met'),
      notMet: t('recyclingObligations.notMet')
    },
    regulation43: {
      compliant: t('regulation43.compliant'),
      notCompliant: t('regulation43.notCompliant')
    }
  }
}
