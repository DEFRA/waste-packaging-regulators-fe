import { createCaseManagementApiService } from '#services/case-management-api.service.js'

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

export async function fetchUnassignedCsocCases(
  sessionUser,
  traceId,
  { page = 1, pageSize = 20 } = {}
) {
  const api = createCaseManagementApiService({ sessionUser })
  const response = await api.listCases(
    {
      caseType: 'CSoC',
      producerType: 'DIRECT_PRODUCER',
      unassigned: true,
      isTerminal: false,
      page,
      pageSize
    },
    traceId
  )

  return {
    items: (response.items ?? []).map(mapCaseListItemToRow),
    totalCount: response.totalCount ?? 0,
    page: response.page ?? page,
    pageSize: response.pageSize ?? pageSize
  }
}
