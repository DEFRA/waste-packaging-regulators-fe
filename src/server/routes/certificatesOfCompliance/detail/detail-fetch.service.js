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
import { mapOrganisationContact } from './organisation-contact.js'
import {
  mapDeclarationToDetail,
  mapObligationToDetail
} from './detail-mapping.js'
import { deriveRegistrationType } from '../common/registration-type.js'
import { isComplianceSchemeRegistrationType } from '../common/display.js'

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

function mapAccountOrganisationDetails(organisation) {
  return {
    name: organisation?.name ?? null,
    referenceNumber: organisation?.referenceNumber ?? null,
    externalId: organisation?.externalId ?? null
  }
}

async function fetchAccountOrganisationDetails(
  accountApi,
  organisationId,
  traceId
) {
  if (!organisationId) {
    return mapAccountOrganisationDetails(null)
  }

  const { organisations = [] } = await accountApi.getOrganisationsByExternalIds(
    [organisationId],
    traceId
  )
  return mapAccountOrganisationDetails(organisations[0])
}

async function fetchComplianceSchemeAccountDetailsByCompaniesHouseNumber(
  accountApi,
  companiesHouseNumber,
  traceId
) {
  if (!companiesHouseNumber) {
    return mapAccountOrganisationDetails(null)
  }

  const organisations =
    await accountApi.getOrganisationsByCompaniesHouseNumbers(
      [companiesHouseNumber],
      traceId
    )
  // A Companies House number can match more than one organisation (e.g. a
  // producer and the scheme operator); only the compliance-scheme operator
  // carries the reference number we want (matches the not-submitted list).
  return mapAccountOrganisationDetails(
    organisations.find((org) => org.isComplianceScheme)
  )
}

// Direct producers resolve against the Account API by external id; compliance
// schemes only by Companies House number (mirrors the not-submitted list).
async function fetchNotSubmittedAccountOrganisationDetails(
  accountApi,
  organisation,
  organisationId,
  obligationYear,
  traceId
) {
  const registrationType =
    organisation?.registrationType ??
    deriveRegistrationType(organisation?.registrations, obligationYear)

  if (isComplianceSchemeRegistrationType(registrationType)) {
    return fetchComplianceSchemeAccountDetailsByCompaniesHouseNumber(
      accountApi,
      organisation?.companiesHouseNumber,
      traceId
    )
  }

  return fetchAccountOrganisationDetails(accountApi, organisationId, traceId)
}

function resolveMockAccountOrganisationDetails(organisationId) {
  const organisation = getMockAccountOrganisationByExternalId(organisationId)
  return {
    ...mapAccountOrganisationDetails(organisation),
    contact: mapOrganisationContact(organisation)
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
      accountOrganisationReferenceNumber: accountOrganisation.referenceNumber,
      accountOrganisationContact: accountOrganisation.contact
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
  // The waste-organisations record is needed before the Account lookup so we
  // know whether to resolve by external id (direct producers) or Companies
  // House number (compliance schemes).
  const [unsubmittedObligationData, organisation] = await Promise.all([
    obligationsApi.getComplianceObligation(
      { organisationId, obligationYear },
      traceId
    ),
    organisationsApi.getOrganisation({ organisationId }, traceId)
  ])
  const accountOrganisation = await fetchNotSubmittedAccountOrganisationDetails(
    accountApi,
    organisation,
    organisationId,
    obligationYear,
    traceId
  )
  const { externalId } = accountOrganisation
  const organisationWithPersons = externalId
    ? await accountApi.getOrganisationWithPersonsOrNull(externalId, traceId)
    : null
  return mapObligationToDetail(unsubmittedObligationData, {
    organisationId,
    obligationYear,
    organisation,
    accountOrganisationName: accountOrganisation.name,
    accountOrganisationReferenceNumber: accountOrganisation.referenceNumber,
    accountOrganisationContact: mapOrganisationContact(organisationWithPersons)
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
