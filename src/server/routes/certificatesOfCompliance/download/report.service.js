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

const CURRENT_DECLARATION_STATUSES = [
  statusBySubmissionStatus.pending,
  statusBySubmissionStatus.accepted
].join(',')

const DECLARATIONS_REPORT_SORT = {
  sortColumn: 'DateSubmitted',
  sortDirection: 'asc'
}

// Every organisation of one producer type for the compliance year, whatever
// search, tab, page or sort the list page has applied. The three result sets
// are fetched in parallel and drained page by page.
export async function fetchReportData({
  obligationsApi,
  registrationType,
  country,
  traceId
}) {
  const base = { obligationYear: COMPLIANCE_YEAR, registrationType, country }

  // Each result set is read in a stable order. Declarations are ordered by
  // submission date, which never changes once submitted, so a new submission
  // lands on the last page. A row that leaves a set mid-read still shifts the
  // rows after it, which the page drains detect from a changed `total`.
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

// A result set that changes while it is being read may have lost a row, so the
// whole read is repeated once. A second change fails the download rather than
// writing a file that may be missing an organisation.
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
  now = new Date()
) {
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
    )
  })

  const buffer = await buildReportWorkbook({
    heading: buildReportHeading(organisationType, now),
    rows,
    isComplianceScheme: organisationType === COMPLIANCE_SCHEMES
  })

  return { filename: buildReportFilename(organisationType, now), buffer }
}
