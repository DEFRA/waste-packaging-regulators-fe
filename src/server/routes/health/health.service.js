import { config } from '#config/config.js'
import { getServiceOAuthAccessToken } from '#services/apiBaseClient/oauth-token.js'
import { createWasteObligationsApiService } from '#services/waste-obligations-api.service.js'
import { createWasteOrganisationsApiService } from '#services/waste-organisations-api.service.js'

const HEALTH_CHECK_TIMEOUT_MS = 5000

async function checkWasteObligationsApi() {
  const service = createWasteObligationsApiService({
    requestTimeoutMs: HEALTH_CHECK_TIMEOUT_MS
  })
  await service.listComplianceDeclarations({ pageSize: 1 })
}

async function checkWasteOrganisationsApi() {
  const service = createWasteOrganisationsApiService()
  await service.listComplianceOrganisations({
    registrationYears: ['2020'],
    registrationType: 'DirectProducer'
  })
}

async function checkAccountApiToken() {
  await getServiceOAuthAccessToken({
    clientId: config.get('accountApi.clientId'),
    clientSecret: config.get('accountApi.clientSecret'),
    scope: config.get('accountApi.scope'),
    tokenEndpoint: config.get('accountApi.tokenEndpoint')
  })
}

export async function runHealthChecks() {
  const [obligations, organisations, accountToken] = await Promise.allSettled([
    checkWasteObligationsApi(),
    checkWasteOrganisationsApi(),
    checkAccountApiToken()
  ])

  const checks = {
    'waste-obligations': toCheckResult(obligations),
    'waste-organisations': toCheckResult(organisations),
    'account-token': toCheckResult(accountToken)
  }

  const allOk = Object.values(checks).every((c) => c.ok)

  return { message: allOk ? 'success' : 'degraded', checks }
}

function toCheckResult(settled) {
  if (settled.status === 'fulfilled') {
    return { ok: true }
  }
  return { ok: false, error: settled.reason?.message ?? String(settled.reason) }
}
