import { createWasteObligationsApiService } from '#services/waste-obligations-api.service.js'
import {
  registrationTypeByOrganisationType,
  statusBySubmissionStatus,
  CANCELLED_STATUS,
  COMPLIANCE_SCHEMES,
  COMPLIANCE_YEAR,
  UNSUBMITTED_DEFAULT_SORT
} from '../common/constants.js'
import { createLogger } from '#server/common/helpers/logging/logger.js'
import {
  fetchAllDeclarations,
  fetchAllUnsubmittedOrganisations,
  ResultSetChangedError
} from './report-pages.js'
import { groupCancellationsByOrganisation } from './cancellations.js'
import { buildReportRows } from './report-rows.js'
import { buildReportWorkbook } from './report-workbook.js'
import { buildReportFilename, buildReportHeading } from './report-naming.js'
import { reportLabels } from './report-labels.js'

const CURRENT_DECLARATION_STATUSES = [
  statusBySubmissionStatus.pending,
  statusBySubmissionStatus.accepted
].join(',')

const DECLARATIONS_REPORT_SORT = {
  sortColumn: 'DateSubmitted',
  sortDirection: 'asc'
}

// Every organisation of one producer type, ignoring the list page's search,
// tab, page and sort.
export async function fetchReportData({
  obligationsApi,
  registrationType,
  country,
  traceId
}) {
  const base = { obligationYear: COMPLIANCE_YEAR, registrationType, country }

  // Sorted by submission date so new submissions land on the last page.
  const [declarations, cancelledDeclarations, unsubmittedOrganisations] =
    await Promise.all([
      fetchAllDeclarations(
        obligationsApi,
        {
          ...base,
          status: CURRENT_DECLARATION_STATUSES,
          ...DECLARATIONS_REPORT_SORT
        },
        traceId
      ),
      fetchAllDeclarations(
        obligationsApi,
        { ...base, status: CANCELLED_STATUS, ...DECLARATIONS_REPORT_SORT },
        traceId
      ),
      fetchAllUnsubmittedOrganisations(
        obligationsApi,
        { ...base, sort: UNSUBMITTED_DEFAULT_SORT },
        traceId
      )
    ])

  return { declarations, cancelledDeclarations, unsubmittedOrganisations }
}

const logger = createLogger()

// Reads once more if the data changed mid-read; a second change fails the download.
async function fetchReportDataWithRetry(args) {
  try {
    return await fetchReportData(args)
  } catch (error) {
    if (!(error instanceof ResultSetChangedError)) {
      throw error
    }
    logger.warn(
      `Report data changed while it was read; reading again: ${error.message}`
    )
    return fetchReportData(args)
  }
}

export async function getComplianceReport(
  organisationType,
  traceId,
  country = null,
  locale = 'en',
  now = new Date()
) {
  const labels = reportLabels(locale)
  const obligationsApi = createWasteObligationsApiService()
  const registrationType = registrationTypeByOrganisationType[organisationType]

  const { declarations, cancelledDeclarations, unsubmittedOrganisations } =
    await fetchReportDataWithRetry({
      obligationsApi,
      registrationType,
      country,
      traceId
    })

  const rows = buildReportRows({
    declarations,
    unsubmittedOrganisations,
    cancellationsByOrganisation: groupCancellationsByOrganisation(
      cancelledDeclarations
    ),
    labels
  })

  const buffer = await buildReportWorkbook({
    heading: buildReportHeading(organisationType, now, labels),
    rows,
    isComplianceScheme: organisationType === COMPLIANCE_SCHEMES,
    labels
  })

  return { filename: buildReportFilename(organisationType, now), buffer }
}
