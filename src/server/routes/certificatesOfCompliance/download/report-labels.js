import {
  DEFAULT_LOCALE,
  localeToBcp47
} from '#server/common/helpers/i18n/locales.js'
import { translate } from '#server/common/helpers/i18n/translate.js'

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

const CANCELLATION_COLUMN_KEYS = [
  'dateSubmitted',
  'dateCancelled',
  'cancelledBy',
  'reason',
  'statusWhenCancelled'
]

export function reportLabels(locale = DEFAULT_LOCALE) {
  const t = (key, params) =>
    translate(locale, `${REPORT_STRINGS}.${key}`, params)

  return {
    locale,
    bcp47: localeToBcp47(locale),
    sheetName: t('sheetName'),
    heading: {
      certificates: (day) => t('heading.certificates', { day }),
      statements: (day) => t('heading.statements', { day })
    },
    columns: Object.fromEntries(
      COLUMN_KEYS.map((key) => [key, t(`columns.${key}`)])
    ),
    cancellation: {
      heading: (number) => t('cancellation.heading', { number }),
      columns: Object.fromEntries(
        CANCELLATION_COLUMN_KEYS.map((key) => [
          key,
          t(`cancellation.columns.${key}`)
        ])
      )
    },
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
