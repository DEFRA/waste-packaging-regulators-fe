import { config } from '#config/config.js'
import { createAccountApiService } from '#services/account-api.service.js'
import { createWasteObligationsApiService } from '#services/waste-obligations-api.service.js'
import { createWasteOrganisationsApiService } from '#services/waste-organisations-api.service.js'
import { mockListByOrganisationType } from '../certificates-of-compliance.mock.js'
import {
  registrationTypeByOrganisationType,
  statusBySubmissionStatus,
  COMPLIANCE_YEAR,
  COMPLIANCE_SCHEMES
} from '../common/constants.js'
import {
  fetchAllDeclarations,
  mapDeclarationToItem,
  mapOrganisationToItem,
  resolveNotSubmittedReferenceNumbers,
  resolveNotSubmittedObligationCoveragePercentages
} from '../list/list.service.js'
import { throwIfMockErrorConfigured } from '#server/common/helpers/mock-api-error.js'
import { buildComplianceCsv } from './download-model.js'

// Builds the full, unsorted not-submitted item list for CSV export.
async function getAllNotSubmittedItems({
  obligationsApi,
  organisationsApi,
  accountApi,
  organisationType,
  registrationType,
  traceId
}) {
  const [orgsResult, pendingDeclarations, acceptedDeclarations] =
    await Promise.all([
      organisationsApi.listComplianceOrganisations(
        { registrationType, registrationYears: COMPLIANCE_YEAR },
        traceId
      ),
      fetchAllDeclarations(
        obligationsApi,
        { status: 'Submitted', registrationType },
        traceId
      ),
      fetchAllDeclarations(
        obligationsApi,
        { status: 'Accepted', registrationType },
        traceId
      )
    ])

  const submittedIds = new Set([
    ...pendingDeclarations.map((d) => d.organisation.id),
    ...acceptedDeclarations.map((d) => d.organisation.id)
  ])

  const allItems = orgsResult.organisations
    .filter((org) => !submittedIds.has(org.id))
    .map(mapOrganisationToItem)

  await resolveNotSubmittedReferenceNumbers(
    accountApi,
    allItems,
    traceId,
    organisationType
  )

  if (organisationType !== COMPLIANCE_SCHEMES) {
    await resolveNotSubmittedObligationCoveragePercentages(
      obligationsApi,
      allItems,
      traceId
    )
  }

  return allItems
}

// Every row for the active submission status (not just the current page), mirroring the list
// view's data but unpaginated.
async function getAllItemsFor({
  organisationType,
  submissionStatus,
  obligationsApi,
  organisationsApi,
  accountApi,
  traceId
}) {
  if (config.get('useMockApi')) {
    throwIfMockErrorConfigured('waste-obligations-api')
    const listBySubmissionStatus =
      mockListByOrganisationType[organisationType] ?? {}
    return [...(listBySubmissionStatus[submissionStatus] ?? [])]
  }

  const registrationType = registrationTypeByOrganisationType[organisationType]

  switch (submissionStatus) {
    case 'not-submitted': {
      return getAllNotSubmittedItems({
        obligationsApi,
        organisationsApi,
        accountApi,
        organisationType,
        registrationType,
        traceId
      })
    }
  }

  const status = statusBySubmissionStatus[submissionStatus]
  if (!status) {
    return []
  }

  const declarations = await fetchAllDeclarations(
    obligationsApi,
    { status, registrationType },
    traceId
  )
  return declarations.map(mapDeclarationToItem)
}

export async function getComplianceDownload(
  organisationType,
  submissionStatus,
  traceId,
  now = new Date()
) {
  const obligationsApi = createWasteObligationsApiService()
  const organisationsApi = createWasteOrganisationsApiService()
  const accountApi = createAccountApiService()

  const items = await getAllItemsFor({
    organisationType,
    submissionStatus,
    obligationsApi,
    organisationsApi,
    accountApi,
    traceId
  })

  return buildComplianceCsv({
    organisationType,
    submissionStatus,
    items,
    now
  })
}
