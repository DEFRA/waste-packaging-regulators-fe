import { config } from '#config/config.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { ApiError } from './apiBaseClient/api-error.js'
import { BaseApiService } from './apiBaseClient/base-api.service.js'

function buildPathWithQuery(basePath, queryString) {
  if (!queryString) {
    return basePath
  }
  return `${basePath}?${queryString}`
}

export class WasteObligationsApiService extends BaseApiService {
  constructor(options = {}) {
    super({
      ...options,
      serviceName: 'waste-obligations'
    })
  }

  async listComplianceDeclarations(
    {
      status,
      registrationType,
      obligationYear,
      page,
      pageSize,
      sortColumn,
      sortDirection
    } = {},
    traceId
  ) {
    const params = new URLSearchParams()
    if (status != null) {
      params.set('status', status)
    }
    if (registrationType != null) {
      params.set('registrationType', registrationType)
    }
    if (obligationYear != null) {
      params.set('obligationYear', String(obligationYear))
    }
    if (page != null) {
      params.set('page', String(page))
    }
    if (pageSize != null) {
      params.set('pageSize', String(pageSize))
    }
    if (sortColumn != null && sortDirection != null) {
      const sortParam =
        sortColumn === 'OrganisationName'
          ? `OrganisationName[${sortDirection}]`
          : `${sortColumn}[${sortDirection}],OrganisationName[asc]`
      params.set('sort', sortParam)
    }
    const qs = params.toString()
    return this.getJson(
      buildPathWithQuery('/compliance-declarations', qs),
      this.getTracingHeader(traceId)
    )
  }

  async getComplianceDeclaration({ id, organisationId } = {}, traceId) {
    return this.getJson(
      `/organisations/${organisationId}/compliance-declarations/${id}`,
      this.getTracingHeader(traceId)
    )
  }

  async listOrganisationComplianceDeclarations(
    { organisationId, obligationYear } = {},
    traceId
  ) {
    const params = new URLSearchParams()
    params.set('obligationYear', String(obligationYear))
    return this.getJson(
      buildPathWithQuery(
        `/organisations/${organisationId}/compliance-declarations`,
        params.toString()
      ),
      this.getTracingHeader(traceId)
    )
  }

  async updateComplianceDeclaration(
    { organisationId, id, status, reason, user } = {},
    traceId
  ) {
    const body = { status, user }
    if (reason != null) {
      body.reason = reason
    }

    return this.patchJson(
      `/organisations/${organisationId}/compliance-declarations/${id}`,
      body,
      this.getTracingHeader(traceId)
    )
  }

  async getComplianceDeclarationOrNull({ id, organisationId } = {}, traceId) {
    try {
      return await this.getComplianceDeclaration(
        { id, organisationId },
        traceId
      )
    } catch (err) {
      if (err instanceof ApiError && err.status === statusCodes.notFound) {
        return null
      }
      throw err
    }
  }

  async getComplianceObligation(
    { organisationId, obligationYear } = {},
    traceId
  ) {
    const params = new URLSearchParams()
    if (obligationYear != null) {
      params.set('obligationYear', String(obligationYear))
    }
    const qs = params.toString()
    return this.getJson(
      buildPathWithQuery(`/organisations/${organisationId}/obligations`, qs),
      this.getTracingHeader(traceId)
    )
  }

  async getComplianceObligationOrNull(
    { organisationId, obligationYear } = {},
    traceId
  ) {
    try {
      return await this.getComplianceObligation(
        { organisationId, obligationYear },
        traceId
      )
    } catch (err) {
      if (err instanceof ApiError && err.status === statusCodes.notFound) {
        return null
      }
      throw err
    }
  }
}

export function createWasteObligationsApiService(options = {}) {
  const xApiKey = config.get('wasteObligationsApi.xApiKey')

  return new WasteObligationsApiService({
    baseUrl: config.get('wasteObligationsApi.baseUrl'),
    authMode: config.get('wasteObligationsApi.authMode'),
    clientId: config.get('wasteObligationsApi.clientId'),
    clientSecret: config.get('wasteObligationsApi.clientSecret'),
    tracingHeader: config.get('tracing.header'),
    headers: xApiKey ? { 'x-api-key': xApiKey } : undefined,
    ...options
  })
}
