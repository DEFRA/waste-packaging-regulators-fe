import { createAccountApiService } from '#services/account-api.service.js'
import { createWasteObligationsApiService } from '#services/waste-obligations-api.service.js'
import { createWasteOrganisationsApiService } from '#services/waste-organisations-api.service.js'
import { buildCertificateSuccessBanner } from '../actions/detail-actions.js'
import { getDeclarationDetail } from './detail-fetch.service.js'

export async function getCertificateOfComplianceDetailViewModel(
  organisationId,
  id,
  { traceId, bannerFlags = {}, session, obligationYear } = {}
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
    { traceId, session, obligationYear }
  )

  return {
    heading: 'Certificate of compliance',
    backlink: '/certificates-of-compliance',
    backlinkText: 'Back to all submissions',
    successBanner: buildCertificateSuccessBanner(
      bannerFlags,
      detail.registrationType
    ),
    ...detail
  }
}
