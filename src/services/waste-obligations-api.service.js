import { config } from '#/config/config.js'
import { BaseApiService } from './apiBaseClient/base-api.service.js'

export class WasteObligationsApiService extends BaseApiService {
  constructor(options = {}) {
    super({
      ...options,
      serviceName: 'waste-obligations'
    })
  }

  async listComplianceDeclarations(
    { status, registrationType, obligationYear, page, pageSize } = {},
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

    const qs = params.toString()
    return this.getJson(
      `/compliance-declarations${qs ? `?${qs}` : ''}`,
      this.getTracingHeader(traceId)
    )
  }

  async getComplianceDeclaration({ id, organisationId } = {}, traceId) {
    return this.getJson(
      `/organisations/${organisationId}/compliance-declarations/${id}`,
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
