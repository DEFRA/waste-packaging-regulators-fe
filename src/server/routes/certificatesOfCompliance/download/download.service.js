import { createWasteObligationsApiService } from '#services/waste-obligations-api.service.js'
import {
  registrationTypeByOrganisationType,
  statusBySubmissionStatus,
  COMPLIANCE_YEAR,
  UNSUBMITTED_DEFAULT_SORT
} from '../common/constants.js'
import {
  fetchAllDeclarations,
  fetchAllUnsubmittedOrganisations,
  mapDeclarationToItem,
  mapUnsubmittedToItem
} from '../list/list.service.js'
import { buildComplianceCsv } from './download-model.js'

// Every row for the active submission status (not just the current page), mirroring the list
// view's data but unpaginated.
async function getAllItemsFor({
  organisationType,
  submissionStatus,
  obligationsApi,
  traceId,
  country
}) {
  const registrationType = registrationTypeByOrganisationType[organisationType]

  if (submissionStatus === 'not-submitted') {
    // A stable total order keeps rows from shifting between pages if a
    // submission lands mid-drain; the CSV itself is sorted by name downstream.
    const rows = await fetchAllUnsubmittedOrganisations(
      obligationsApi,
      {
        obligationYear: COMPLIANCE_YEAR,
        registrationType,
        country,
        sort: UNSUBMITTED_DEFAULT_SORT
      },
      traceId
    )
    return rows.map(mapUnsubmittedToItem)
  }

  const status = statusBySubmissionStatus[submissionStatus]
  if (!status) {
    return []
  }

  const declarations = await fetchAllDeclarations(
    obligationsApi,
    { status, registrationType, country },
    traceId
  )
  return declarations.map(mapDeclarationToItem)
}

export async function getComplianceDownload(
  organisationType,
  submissionStatus,
  traceId,
  countryOrNow = null,
  maybeNow = undefined
) {
  let country = null
  let now = new Date()

  if (countryOrNow instanceof Date) {
    now = countryOrNow
  } else if (typeof countryOrNow === 'string') {
    country = countryOrNow
    if (maybeNow instanceof Date) {
      now = maybeNow
    }
  }

  const obligationsApi = createWasteObligationsApiService()

  const items = await getAllItemsFor({
    organisationType,
    submissionStatus,
    obligationsApi,
    traceId,
    country
  })

  return buildComplianceCsv({
    organisationType,
    submissionStatus,
    items,
    now
  })
}
