import { ApiError } from '#services/apiBaseClient/api-error.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { config } from '#config/config.js'
import {
  mockSummary,
  getMockObligationData,
  getMockDetailDataById,
  getMockDeclarationsByOrgYear,
  getMockOrganisationById,
  getMockAccountOrganisationByExternalId
} from '../certificates-of-compliance.mock.js'
import {
  applyMockDeclarationStatusOverride,
  getDeclarationSessionKey
} from '../actions/session.service.js'
import { findSubmittedAuditUser } from './audit.js'
import {
  mapDeclarationToDetail,
  mapObligationToDetail
} from './detail-mapping.js'

export { findSubmittedAuditUser } from './audit.js'

async function fetchSubmitterPhoneNumber(accountApi, audit, traceId) {
  const userId = findSubmittedAuditUser(audit)?.id
  if (!userId) {
    return null
  }

  try {
    const details = await accountApi.getAccountDetailsById(userId, traceId)
    return details.telephone ?? null
  } catch (err) {
    if (err instanceof ApiError && err.status === statusCodes.notFound) {
      return null
    }
    throw err
  }
}

async function fetchAccountOrganisationDetails(
  accountApi,
  organisationId,
  traceId
) {
  if (!organisationId) {
    return { name: null, referenceNumber: null }
  }

  const { organisations = [] } = await accountApi.getOrganisationsByExternalIds(
    [organisationId],
    traceId
  )
  const organisation = organisations[0]
  return {
    name: organisation?.name ?? null,
    referenceNumber: organisation?.referenceNumber ?? null
  }
}

function resolveMockAccountOrganisationDetails(organisationId) {
  const organisation = getMockAccountOrganisationByExternalId(organisationId)
  return {
    name: organisation?.name ?? null,
    referenceNumber: organisation?.referenceNumber ?? null
  }
}

async function getMockDeclarationDetail(
  accountApi,
  organisationId,
  id,
  { traceId, session, obligationYear } = {}
) {
  const resolvedObligationYear =
    obligationYear ?? Number(mockSummary.complianceYear)

  if (!id) {
    const accountOrganisation =
      resolveMockAccountOrganisationDetails(organisationId)
    return mapObligationToDetail(getMockObligationData(organisationId), {
      organisationId,
      obligationYear: resolvedObligationYear,
      organisation: getMockOrganisationById(organisationId),
      accountOrganisationName: accountOrganisation.name,
      accountOrganisationReferenceNumber: accountOrganisation.referenceNumber
    })
  }

  const mockData = applyMockDeclarationStatusOverride(
    getMockDetailDataById(id),
    getDeclarationSessionKey(organisationId, id),
    session
  )
  const declarationsForYear = getMockDeclarationsByOrgYear(
    mockData?.organisation?.id ?? organisationId,
    mockData?.obligationYear
  )
  const submitterPhoneNumber = await fetchSubmitterPhoneNumber(
    accountApi,
    mockData.audit,
    traceId
  )
  const resolvedOrganisationId = mockData?.organisation?.id ?? organisationId
  return mapDeclarationToDetail(mockData, {
    organisationId,
    id,
    declarationsForYear,
    submitterPhoneNumber,
    wasteOrganisation: getMockOrganisationById(resolvedOrganisationId)
  })
}

async function getNotSubmittedDeclarationDetail(
  obligationsApi,
  organisationsApi,
  accountApi,
  organisationId,
  obligationYear,
  traceId
) {
  const [unsubmittedObligationData, organisation, accountOrganisation] =
    await Promise.all([
      obligationsApi.getComplianceObligation(
        { organisationId, obligationYear },
        traceId
      ),
      organisationsApi.getOrganisation({ organisationId }, traceId),
      fetchAccountOrganisationDetails(accountApi, organisationId, traceId)
    ])
  return mapObligationToDetail(unsubmittedObligationData, {
    organisationId,
    obligationYear,
    organisation,
    accountOrganisationName: accountOrganisation.name,
    accountOrganisationReferenceNumber: accountOrganisation.referenceNumber
  })
}

async function getSubmittedDeclarationDetail(
  obligationsApi,
  organisationsApi,
  accountApi,
  organisationId,
  id,
  obligationYear,
  traceId
) {
  const declaration = await obligationsApi.getComplianceDeclarationOrNull(
    { id, organisationId },
    traceId
  )

  if (declaration != null) {
    const [listResponse, submitterPhoneNumber, wasteOrganisation] =
      await Promise.all([
        obligationsApi.listOrganisationComplianceDeclarations(
          { organisationId, obligationYear: declaration.obligationYear },
          traceId
        ),
        fetchSubmitterPhoneNumber(accountApi, declaration.audit, traceId),
        organisationsApi.getOrganisation({ organisationId }, traceId)
      ])
    return mapDeclarationToDetail(declaration, {
      organisationId,
      id,
      declarationsForYear: listResponse?.complianceDeclarations ?? [],
      submitterPhoneNumber,
      wasteOrganisation
    })
  }

  const fallbackObligationData = await obligationsApi.getComplianceObligation(
    { organisationId, obligationYear },
    traceId
  )
  return mapObligationToDetail(fallbackObligationData, {
    organisationId,
    obligationYear
  })
}

export async function getDeclarationDetail(
  obligationsApi,
  organisationsApi,
  accountApi,
  organisationId,
  id,
  { traceId, session, obligationYear } = {}
) {
  if (config.get('useMockApi')) {
    return getMockDeclarationDetail(accountApi, organisationId, id, {
      traceId,
      session,
      obligationYear
    })
  }

  if (!id) {
    return getNotSubmittedDeclarationDetail(
      obligationsApi,
      organisationsApi,
      accountApi,
      organisationId,
      obligationYear,
      traceId
    )
  }

  return getSubmittedDeclarationDetail(
    obligationsApi,
    organisationsApi,
    accountApi,
    organisationId,
    id,
    obligationYear,
    traceId
  )
}
