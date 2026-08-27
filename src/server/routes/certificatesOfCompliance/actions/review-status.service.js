import { createAccountApiService } from '#services/account-api.service.js'
import { createWasteObligationsApiService } from '#services/waste-obligations-api.service.js'
import { createWasteOrganisationsApiService } from '#services/waste-organisations-api.service.js'
import { getDeclarationDetail } from '../detail/detail-fetch.service.js'

export async function getComplianceDeclarationReviewStatus(
  organisationId,
  id,
  traceId
) {
  const obligationsApi = createWasteObligationsApiService()
  const organisationsApi = createWasteOrganisationsApiService()
  const accountApi = createAccountApiService()
  const detail = await getDeclarationDetail(
    obligationsApi,
    organisationsApi,
    accountApi,
    organisationId,
    id,
    { traceId }
  )

  return detail.reviewStatus
}
