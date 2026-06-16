import { config } from '#/config/config.js'
import { BaseApiService } from './apiBaseClient/base-api.service.js'

export class AccountApiService extends BaseApiService {
  constructor(options = {}) {
    super({
      ...options,
      serviceName: 'account'
    })
  }

  /**
   * Bulk-resolves organisation name + 6-digit reference number for a list of
   * organisation external ids, via the Account API (reached through the
   * regulator gateway).
   *
   * Used by the CSoC "Not submitted" tab, where the Obligations API does not
   * snapshot the organisation details, so they must be resolved at request time.
   *
   * Contract (epr-backend-account-microservice):
   *   POST /api/organisations/organisations-by-externalIds
   *   request -> { externalIds: string[] }   (each id is a GUID)
   *   200     -> { organisations: [{ externalId, name, referenceNumber }],
   *               notFoundExternalIds: string[] }
   * The endpoint responds 200 for a non-empty request; ids that do not resolve
   * are returned in `notFoundExternalIds` rather than as a 404. A non-2xx
   * response throws an `ApiError`.
   *
   * @param {string[]} externalIds - organisation external ids (GUIDs)
   * @param {string} [traceId] - request trace id for upstream correlation
   * @returns {Promise<{ organisations: Array<{ externalId: string, name: string, referenceNumber: string }>, notFoundExternalIds: string[] }>}
   */
  async getOrganisationsByExternalIds(externalIds, traceId) {
    return this.postJson(
      '/api/organisations/organisations-by-externalIds',
      { externalIds },
      this.getTracingHeader(traceId)
    )
  }
}

export function createAccountApiService(options = {}) {
  const xApiKey = config.get('accountApi.xApiKey')

  return new AccountApiService({
    baseUrl: config.get('accountApi.baseUrl'),
    authMode: config.get('accountApi.authMode'),
    clientId: config.get('accountApi.clientId'),
    clientSecret: config.get('accountApi.clientSecret'),
    tracingHeader: config.get('tracing.header'),
    headers: xApiKey ? { 'x-api-key': xApiKey } : undefined,
    ...options
  })
}
