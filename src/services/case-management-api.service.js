import { config } from '#config/config.js'
import { getRegulatorCaseManagementNation } from '#server/common/helpers/regulator-case-management-nation.js'
import { BaseApiService } from './apiBaseClient/base-api.service.js'
import { buildCaseManagementTrustHeaders } from './case-management/cdp-trust-headers.js'

function buildPathWithQuery(basePath, queryString) {
  if (!queryString) {
    return basePath
  }
  return `${basePath}?${queryString}`
}

function appendQueryValues(params, name, value) {
  if (value == null) {
    return
  }
  const values = Array.isArray(value) ? value : [value]
  for (const entry of values) {
    if (entry != null && entry !== '') {
      params.append(name, String(entry))
    }
  }
}

export class CaseManagementApiService extends BaseApiService {
  constructor(options = {}) {
    super({
      ...options,
      serviceName: 'case-management'
    })
  }

  async listCases(
    {
      caseType,
      stateId,
      isTerminal,
      assigneeId,
      unassigned,
      orgId,
      search,
      page,
      pageSize,
      sort,
      dir
    } = {},
    traceId
  ) {
    const params = new URLSearchParams()
    appendQueryValues(params, 'caseType', caseType)
    appendQueryValues(params, 'stateId', stateId)
    if (isTerminal != null) {
      params.set('isTerminal', String(isTerminal))
    }
    if (assigneeId != null) {
      params.set('assigneeId', assigneeId)
    }
    if (unassigned != null) {
      params.set('unassigned', String(unassigned))
    }
    if (orgId != null) {
      params.set('orgId', orgId)
    }
    if (search) {
      params.set('search', search)
    }
    if (page != null) {
      params.set('page', String(page))
    }
    if (pageSize != null) {
      params.set('pageSize', String(pageSize))
    }
    if (sort != null) {
      params.set('sort', sort)
    }
    if (dir != null) {
      params.set('dir', dir)
    }

    return this.getJson(
      buildPathWithQuery('/cases', params.toString()),
      this.getTracingHeader(traceId)
    )
  }
}

export function createCaseManagementApiService({
  sessionUser,
  ...options
} = {}) {
  if (!getRegulatorCaseManagementNation(sessionUser)) {
    throw new Error(
      'Cannot create Case Management API client without a mapped regulator nation'
    )
  }

  const clientId = config.get('caseManagementApi.clientId')
  const sharedSecret = config.get('caseManagementApi.sharedSecret')
  const xApiKey = config.get('caseManagementApi.xApiKey')
  const trustHeaders = buildCaseManagementTrustHeaders({
    sessionUser,
    clientId,
    sharedSecret
  })

  return new CaseManagementApiService({
    baseUrl: config.get('caseManagementApi.baseUrl'),
    requestTimeoutMs: config.get('caseManagementApi.requestTimeoutMs'),
    authMode: config.get('caseManagementApi.authMode'),
    headers: {
      ...trustHeaders,
      ...(xApiKey ? { 'x-api-key': xApiKey } : {})
    },
    tracingHeader: config.get('tracing.header'),
    ...options
  })
}
