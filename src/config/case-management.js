// The Case Management feature flag and API client settings, kept apart so
// config.js stays a readable size.
export const caseManagementConfig = {
  caseManagement: {
    enabled: {
      doc: 'Serve the case management case list at /cases',
      format: Boolean,
      default: false,
      env: 'CASE_MANAGEMENT_ENABLED'
    }
  },
  caseManagementApi: {
    baseUrl: {
      doc: 'Case Management API base URL',
      format: String,
      default: 'http://localhost:8085',
      env: 'CASE_MANAGEMENT_API_BASE_URL'
    },
    requestTimeoutMs: {
      doc: 'Per-request timeout (ms) for Case Management API calls',
      format: 'nat',
      default: 30000,
      env: 'CASE_MANAGEMENT_API_REQUEST_TIMEOUT_MS'
    },
    clientId: {
      doc: 'CDP client id sent as x-cdp-client-id. Must match Auth__ManagementFeClientId on the Case Management service.',
      format: String,
      default: 'frontend',
      env: 'CASE_MANAGEMENT_API_CLIENT_ID'
    },
    sharedSecret: {
      doc: 'HMAC secret for BFF signing (maps to AUTH_SHARED_SECRET__MANAGEMENT_FE on Case Management). Empty in local Development.',
      format: String,
      default: '',
      env: 'CASE_MANAGEMENT_API_SHARED_SECRET',
      sensitive: true
    },
    xApiKey: {
      doc: 'CDP ephemeral API key for protected Case Management endpoints in dev',
      format: String,
      nullable: true,
      default: null,
      env: 'CASE_MANAGEMENT_API_X_API_KEY',
      sensitive: true
    }
  }
}
