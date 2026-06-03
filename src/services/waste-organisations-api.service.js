import { config } from '#/config/config.js'
import { BaseApiService } from './apiBaseClient/base-api.service.js'

export class WasteOrganisationsApiService extends BaseApiService {
  constructor(options = {}) {
    super({
      ...options,
      serviceName: 'waste-organisations'
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
    // TODO: confirm endpoint path with backend team
    return this.getJson(
      `/compliance-declarations${qs ? `?${qs}` : ''}`,
      this.getTracingHeader(traceId)
    )
  }
}

export function createWasteOrganisationsApiService(options = {}) {
  return new WasteOrganisationsApiService({
    baseUrl: config.get('wasteOrganisationsApi.baseUrl'),
    authMode: config.get('wasteOrganisationsApi.authMode'),
    clientId: config.get('wasteOrganisationsApi.clientId'),
    clientSecret: config.get('wasteOrganisationsApi.clientSecret'),
    tracingHeader: config.get('tracing.header'),
    ...options
  })
}
