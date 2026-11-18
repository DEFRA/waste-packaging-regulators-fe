import { createCaseManagementApiService } from '#services/case-management-api.service.js'

const DIRECT_PRODUCER = 'DIRECT_PRODUCER'

function displayFieldValue(displayData, fieldName) {
  const field = displayData?.[fieldName]
  if (field == null) {
    return null
  }
  if (typeof field === 'object' && field !== null && 'value' in field) {
    return field.value ?? null
  }
  return String(field)
}

export function mapCaseListItemToRow(item) {
  const displayData = item.displayData ?? {}
  return {
    caseId: item.id,
    organisationName: displayFieldValue(displayData, 'organisationName'),
    organisationId:
      item.orgId ?? displayFieldValue(displayData, 'organisationId'),
    dateSubmitted: item.submittedAt ?? null,
    submissionStatus: item.stateId ?? null,
    producerType: item.producerType ?? null
  }
}

export function filterDirectProducerCases(items) {
  return items.filter(
    (item) => String(item.producerType ?? '').toUpperCase() === DIRECT_PRODUCER
  )
}

export async function fetchUnassignedCsocCases(
  sessionUser,
  traceId,
  { page = 1, pageSize = 20, directProducersOnly = true } = {}
) {
  const api = createCaseManagementApiService({ sessionUser })
  const response = await api.listCases(
    {
      caseType: 'CSoC',
      unassigned: true,
      page,
      pageSize
    },
    traceId
  )

  let items = response.items ?? []
  if (directProducersOnly) {
    items = filterDirectProducerCases(items)
  }

  return {
    items: items.map(mapCaseListItemToRow),
    totalCount: directProducersOnly ? items.length : (response.totalCount ?? 0),
    page: response.page ?? page,
    pageSize: response.pageSize ?? pageSize
  }
}
