import { ApiError } from '#services/apiBaseClient/api-error.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { findSubmittedAuditUser } from './audit.js'
import { mapOrganisationContact } from '../common/organisation-contact.js'
import {
  mapDeclarationToDetail,
  mapObligationToDetail
} from './detail-mapping.js'
import { showsCurrentYear } from './detail-mapping-history.js'
import { deriveRegistrationType } from '../common/registration-type.js'
import { isComplianceSchemeRegistrationType } from '../common/display.js'
import { resolveSchemeOperators } from '../common/scheme-operator.js'

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
  const organisation = organisations.find(
    (candidate) => candidate.externalId === organisationId
  )
  return mapAccountOrganisationDetails(organisation)
}

async function fetchSchemeOperatorAccountDetails(
  accountApi,
  companiesHouseNumber,
  traceId
) {
  const schemeOperators = await resolveSchemeOperators(
    accountApi,
    [companiesHouseNumber],
    traceId
  )
  return mapAccountOrganisationDetails(
    schemeOperators.get(companiesHouseNumber)
  )
}

// Direct producers resolve against the Account API by external id; compliance
// schemes only by Companies House number (mirrors the not-submitted list). The
// contact details then hang off whichever Account organisation was matched.
async function fetchNotSubmittedAccountOrganisation(
  accountApi,
  organisation,
  organisationId,
  obligationYear,
  traceId
) {
  const registrationType =
    organisation?.registrationType ??
    deriveRegistrationType(organisation?.registrations, obligationYear)

  const details = isComplianceSchemeRegistrationType(registrationType)
    ? await fetchSchemeOperatorAccountDetails(
        accountApi,
        organisation?.companiesHouseNumber,
        traceId
      )
    : await fetchAccountOrganisationDetails(accountApi, organisationId, traceId)

  return {
    ...details,
    contact: await fetchOrganisationContact(
      accountApi,
      details.externalId,
      traceId
    )
  }
}

// Contact details are secondary and already render a "No data" empty state, so
// a failed lookup must not take the whole page down with it.
async function fetchOrganisationContact(accountApi, externalId, traceId) {
  let organisationWithPersons = null

  if (externalId) {
    try {
      organisationWithPersons =
        await accountApi.getOrganisationWithPersonsOrNull(externalId, traceId)
    } catch {
      // The upstream failure is already logged by the API client; fall through
      // to the "No data" state rather than failing the page.
    }
  }

  return mapOrganisationContact(organisationWithPersons)
}

// The year's accepted and cancelled declarations feed the Current year history
// table. An organisation can be not submitted for the year and still hold them.
async function fetchDeclarationsForYear(
  obligationsApi,
  organisationId,
  obligationYear,
  traceId
) {
  if (obligationYear == null) {
    return []
  }

  const listResponse =
    await obligationsApi.listOrganisationComplianceDeclarations(
      { organisationId, obligationYear },
      traceId
    )
  return listResponse?.complianceDeclarations ?? []
}

async function getNotSubmittedDeclarationDetail({
  obligationsApi,
  organisationsApi,
  accountApi,
  organisationId,
  obligationYear,
  traceId,
  locale = 'en',
  routePrefix = ''
}) {
  // The waste-organisations record is needed before the Account lookup so we
  // know whether to resolve by external id (direct producers) or Companies
  // House number (compliance schemes).
  const [unsubmittedObligationData, organisation, declarationsForYear] =
    await Promise.all([
      obligationsApi.getComplianceObligation(
        { organisationId, obligationYear },
        traceId
      ),
      organisationsApi.getOrganisation({ organisationId }, traceId),
      fetchDeclarationsForYear(
        obligationsApi,
        organisationId,
        obligationYear,
        traceId
      )
    ])
  const accountOrganisation = await fetchNotSubmittedAccountOrganisation(
    accountApi,
    organisation,
    organisationId,
    obligationYear,
    traceId
  )
  return mapObligationToDetail(unsubmittedObligationData, {
    organisationId,
    obligationYear,
    organisation,
    accountOrganisationName: accountOrganisation.name,
    accountOrganisationReferenceNumber: accountOrganisation.referenceNumber,
    accountOrganisationContact: accountOrganisation.contact,
    declarationsForYear,
    locale,
    routePrefix
  })
}

async function getSubmittedDeclarationDetail({
  obligationsApi,
  organisationsApi,
  accountApi,
  organisationId,
  id,
  obligationYear,
  traceId,
  locale = 'en',
  routePrefix = '',
  type,
  tab
}) {
  const declaration = await obligationsApi.getComplianceDeclarationOrNull(
    { id, organisationId },
    traceId
  )

  if (declaration != null) {
    // A view without the Current year section skips the year's declarations
    // lookup.
    const [declarationsForYear, submitterPhoneNumber, wasteOrganisation] =
      await Promise.all([
        showsCurrentYear(declaration.status)
          ? fetchDeclarationsForYear(
              obligationsApi,
              organisationId,
              declaration.obligationYear,
              traceId
            )
          : [],
        fetchSubmitterPhoneNumber(accountApi, declaration.audit, traceId),
        organisationsApi.getOrganisation({ organisationId }, traceId)
      ])
    return mapDeclarationToDetail(declaration, {
      organisationId,
      id,
      declarationsForYear,
      submitterPhoneNumber,
      wasteOrganisation,
      locale,
      routePrefix,
      type,
      tab
    })
  }

  const fallbackObligationData = await obligationsApi.getComplianceObligation(
    { organisationId, obligationYear },
    traceId
  )
  return mapObligationToDetail(fallbackObligationData, {
    organisationId,
    obligationYear,
    locale
  })
}

export async function getDeclarationDetail(
  obligationsApi,
  organisationsApi,
  accountApi,
  organisationId,
  id,
  { traceId, obligationYear, locale = 'en', routePrefix = '', type, tab } = {}
) {
  if (!id) {
    return getNotSubmittedDeclarationDetail({
      obligationsApi,
      organisationsApi,
      accountApi,
      organisationId,
      obligationYear,
      traceId,
      locale,
      routePrefix
    })
  }

  return getSubmittedDeclarationDetail({
    obligationsApi,
    organisationsApi,
    accountApi,
    organisationId,
    id,
    obligationYear,
    traceId,
    locale,
    routePrefix,
    type,
    tab
  })
}
