import { config } from '#/config/config.js'
import { BaseApiService } from './apiBaseClient/base-api.service.js'

export class WasteOrganisationsApiService extends BaseApiService {
  constructor(options = {}) {
    super({
      ...options,
      serviceName: 'waste-organisations'
    })
  }

  async listComplianceOrganisations(
    { registrationType, registrationYears } = {},
    traceId
  ) {
    const params = new URLSearchParams()

    params.set('statuses', 'REGISTERED')

    if (registrationType != null) {
      switch (registrationType) {
        case 'ComplianceScheme':
          params.set('registrations', 'COMPLIANCE_SCHEME')
          break
        case 'DirectProducer':
          params.set('registrations', 'SMALL_PRODUCER,LARGE_PRODUCER')
          break
      }
    }
    if (registrationYears != null) {
      params.set('registrationYears', String(registrationYears))
    }

    const qs = params.toString()
    return this.getJson(
      `/organisations${qs ? `?${qs}` : ''}`,
      this.getTracingHeader(traceId),
      `organisations-${registrationType}`
    )
  }

  async getOrganisation({ organisationId } = {}, traceId) {
    return this.getJson(
      `/organisations/${organisationId}`,
      this.getTracingHeader(traceId)
    )
  }
}

export function createWasteOrganisationsApiService(options = {}) {
  const xApiKey = config.get('wasteOrganisationsApi.xApiKey')

  return new WasteOrganisationsApiService({
    baseUrl: config.get('wasteOrganisationsApi.baseUrl'),
    authMode: config.get('wasteOrganisationsApi.authMode'),
    clientId: config.get('wasteOrganisationsApi.clientId'),
    clientSecret: config.get('wasteOrganisationsApi.clientSecret'),
    tracingHeader: config.get('tracing.header'),
    headers: xApiKey ? { 'x-api-key': xApiKey } : undefined,
    ...options
  })
}
