import { config } from '#/config/config.js'
import { BaseApiService } from './apiBaseClient/base-api.service.js'

export class AccountApiService extends BaseApiService {
  constructor(options = {}) {
    super({
      ...options,
      serviceName: 'account'
    })
  }

  async getOrganisationsByExternalIds(externalIds, traceId) {
    const response = await this.postJson(
      '/api/organisations/organisations-by-externalIds',
      { externalIds },
      this.getTracingHeader(traceId)
    )
    return {
      organisations: response.organisations ?? response.Organisations ?? [],
      notFoundExternalIds:
        response.notFoundExternalIds ?? response.NotFoundExternalIds ?? []
    }
  }
}

export function createAccountApiService(options = {}) {
  return new AccountApiService({
    baseUrl: config.get('accountApi.baseUrl'),
    authMode: config.get('accountApi.authMode'),
    clientId: config.get('accountApi.clientId'),
    clientSecret: config.get('accountApi.clientSecret'),
    scope: config.get('accountApi.scope'),
    tokenEndpoint: config.get('accountApi.tokenEndpoint'),
    tracingHeader: config.get('tracing.header'),
    ...options
  })
}
