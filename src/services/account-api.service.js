import { config } from '#config/config.js'
import { BaseApiService } from './apiBaseClient/base-api.service.js'

export const mockAccountDetails = {
  firstName: 'John',
  lastName: 'Doe',
  contactEmail: 'john.doe@example.org',
  serviceRoleId: 4,
  serviceRole: 'Regulator Admin',
  organisationName: 'Example Environment Agency',
  nationId: 1
}

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

  async getAccountDetailsById(userId, traceId) {
    if (config.get('useMockApi')) {
      this.logger?.debug?.(
        { userId },
        'Returning mock account details (MOCK_API)'
      )
      return mockAccountDetails
    }
    const raw = await this.getJson(
      `/api/users/user-organisations?userId=${encodeURIComponent(userId)}`,
      this.getTracingHeader(traceId)
    )
    const user = raw?.user
    if (!user) {
      return {}
    }
    const org = user.organisations?.[0]
    return {
      firstName: user.firstName,
      lastName: user.lastName,
      serviceRole: user.serviceRole,
      serviceRoleId: user.serviceRoleId,
      contactEmail: user.email,
      organisationName: org?.name,
      nationId: org?.nationId
    }
  }
}

export function mapAccountDetailsDtoToViewModel(dto) {
  return {
    firstName: dto.firstName,
    lastName: dto.lastName,
    serviceRole: dto.serviceRole ?? '',
    serviceRoleId: dto.serviceRoleId,
    email: dto.contactEmail ?? '',
    organisationName: dto.organisationName ?? '',
    nationId: dto.nationId
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
