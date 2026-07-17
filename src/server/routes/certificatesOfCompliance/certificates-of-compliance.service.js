import { config } from '#config/config.js'
import { ApiError } from '#services/apiBaseClient/api-error.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { createAccountApiService } from '#services/account-api.service.js'
import { format, isDate, parseISO } from 'date-fns'
import { createWasteObligationsApiService } from '#services/waste-obligations-api.service.js'
import { createWasteOrganisationsApiService } from '#services/waste-organisations-api.service.js'
import {
  mockSummary,
  mockSummaryByOrganisationType,
  mockListByOrganisationType,
  getMockObligationData,
  getMockDetailDataById,
  getMockDeclarationsByOrgYear,
  getMockOrganisationById,
  getMockAccountOrganisationByExternalId
} from './certificates-of-compliance.mock.js'

export {
  mockSummary,
  mockDetailData,
  mockObligationData,
  mockPendingItems,
  mockAcceptedItems,
  mockNotSubmittedItems,
  mockComplianceSchemePendingItems,
  mockComplianceSchemeAcceptedItems,
  mockComplianceSchemeDetailData,
  mockDirectProducerAcceptedDetailData,
  mockDirectProducerCancelledDetailData,
  mockComplianceSchemeAcceptedDetailData,
  mockComplianceSchemeCancelledDetailData
} from './certificates-of-compliance.mock.js'

// --- Response mapping ---

// Maps our organisationType URL param to the API's registrationType value
const registrationTypeByOrganisationType = {
  'compliance-schemes': 'ComplianceScheme',
  'direct-producers': 'DirectProducer'
}

// Maps our tab name to the API's declaration status value
const statusByTab = {
  pending: 'Submitted',
  accepted: 'Accepted'
}

const PAGE_SIZE = 20
const DECLARATIONS_BATCH_SIZE = 100
const NO_DATA = 'No data'
const UNKNOWN_ORGANISATION = 'Unknown organisation'
const COMPLIANCE_SCHEMES = 'compliance-schemes'

export function displayOrNoData(value) {
  return value == null || value === '' ? NO_DATA : value
}

function isComplianceSchemeRegistrationType(registrationType) {
  return (
    registrationType === 'ComplianceScheme' ||
    registrationType === COMPLIANCE_SCHEMES
  )
}

export function complianceDocumentNoun(registrationType) {
  return isComplianceSchemeRegistrationType(registrationType)
    ? 'statement of compliance'
    : 'certificate of compliance'
}

export function buildComplianceTypeLabel(obligationYear, registrationType) {
  if (obligationYear == null) {
    return NO_DATA
  }
  const year = String(obligationYear)
  return `${year} ${complianceDocumentNoun(registrationType)}`
}

// Regulation 43 declaration sentence, shown only for compliance schemes.
// Returns null when there is no status — the template renders the "No data"
// empty state itself.
export function buildRegulation43Statement(regulation43Met, organisationName) {
  if (regulation43Met == null) {
    return null
  }
  const compliance = regulation43Met ? 'complied' : 'not complied'
  return `${organisationName} declared they have ${compliance} with all other requirements in regulation 43.`
}

function mapOrganisationName(organisation) {
  if (isComplianceSchemeRegistrationType(organisation.registrationType)) {
    return (
      organisation.tradingName ??
      organisation.name ??
      organisation.complianceSchemeName ??
      UNKNOWN_ORGANISATION
    )
  }
  return organisation.name ?? UNKNOWN_ORGANISATION
}

function mapRecyclingObligationsMet(obligationStatus) {
  if (obligationStatus == null) {
    return null
  }
  return obligationStatus.toLowerCase() === 'met'
}

function mapDeclarationToItem(declaration) {
  const {
    id,
    organisation,
    obligationStatus,
    isRegulation43Compliant,
    created,
    percentageMet
  } = declaration
  return {
    id,
    organisationReferenceNumber: organisation.referenceNumber,
    organisationId: organisation.id,
    organisationName:
      organisation.name ??
      organisation.complianceSchemeName ??
      organisation.schemeOperatorName ??
      UNKNOWN_ORGANISATION,
    recyclingObligationsMet: obligationStatus?.toLowerCase() === 'met',
    regulation43Met: isRegulation43Compliant,
    percentageMet: percentageMet ?? null,
    dateSubmitted: created
  }
}

// Reference number is resolved from the Account API (default 'No data'); the
// organisation name keeps its compliance-scheme-aware derivation.
function mapOrganisationToItem(organisation, organisationType) {
  const organisationName =
    organisationType === COMPLIANCE_SCHEMES
      ? (organisation.tradingName ?? organisation.name ?? UNKNOWN_ORGANISATION)
      : (organisation.name ?? UNKNOWN_ORGANISATION)
  return {
    id: null,
    organisationId: organisation.id,
    organisationReferenceNumber: 'No data',
    organisationName
  }
}

// Fills the reference number (and, for compliance schemes, the name) for "Not submitted" rows from the Account API bulk lookup.
async function resolveNotSubmittedOrganisationDetails(
  accountApi,
  items,
  traceId,
  organisationType
) {
  const externalIds = items.map((item) => item.organisationId).filter(Boolean)

  if (externalIds.length === 0) {
    return
  }

  const { organisations = [] } = await accountApi.getOrganisationsByExternalIds(
    externalIds,
    traceId
  )

  const detailsByExternalId = new Map(
    organisations.map((org) => [org.externalId, org])
  )

  const resolvesName = organisationType === COMPLIANCE_SCHEMES
  for (const item of items) {
    const details = detailsByExternalId.get(item.organisationId)
    item.organisationReferenceNumber = details?.referenceNumber ?? NO_DATA
    if (resolvesName) {
      item.organisationName = details?.name ?? NO_DATA
    }
  }
}

async function fetchAllDeclarations(api, params, traceId) {
  const first = await api.listComplianceDeclarations(
    { ...params, page: 1, pageSize: DECLARATIONS_BATCH_SIZE },
    traceId
  )
  const totalPages = Math.ceil(first.total / DECLARATIONS_BATCH_SIZE)

  if (totalPages <= 1) {
    return first.complianceDeclarations
  }

  const remaining = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, i) =>
      api.listComplianceDeclarations(
        { ...params, page: i + 2, pageSize: DECLARATIONS_BATCH_SIZE },
        traceId
      )
    )
  )

  return [
    ...first.complianceDeclarations,
    ...remaining.flatMap((r) => r.complianceDeclarations)
  ]
}

// --- API calls ---

const complianceYear = 2026

async function getComplianceSummary(
  obligationsApi,
  organisationsApi,
  organisationType,
  traceId
) {
  if (config.get('useMockApi')) {
    return mockSummaryByOrganisationType[organisationType] ?? mockSummary
  }

  const registrationType = registrationTypeByOrganisationType[organisationType]

  const [pendingResult, acceptedResult, notSubmittedResult] = await Promise.all(
    [
      obligationsApi.listComplianceDeclarations(
        { status: 'Submitted', registrationType, pageSize: 1 },
        traceId
      ),
      obligationsApi.listComplianceDeclarations(
        { status: 'Accepted', registrationType, pageSize: 1 },
        traceId
      ),
      organisationsApi.listComplianceOrganisations(
        { registrationType, registrationYears: complianceYear },
        traceId
      )
    ]
  )

  return {
    // Real API does not yet expose compliance year; use configured registration year
    complianceYear: String(complianceYear),
    totalPending: pendingResult.total,
    totalAccepted: acceptedResult.total,
    totalNotSubmitted:
      notSubmittedResult.organisations.length -
      pendingResult.total -
      acceptedResult.total
  }
}

async function getComplianceList(
  obligationsApi,
  organisationsApi,
  accountApi,
  organisationType,
  tab,
  page,
  traceId
) {
  if (config.get('useMockApi')) {
    const listByTab = mockListByOrganisationType[organisationType] ?? {}
    return {
      items: listByTab[tab] ?? [],
      totalPages: 6,
      currentPage: page
    }
  }

  const registrationType = registrationTypeByOrganisationType[organisationType]

  if (tab === 'not-submitted') {
    const [orgsResult, pendingDeclarations, acceptedDeclarations] =
      await Promise.all([
        organisationsApi.listComplianceOrganisations(
          { registrationType, registrationYears: complianceYear },
          traceId
        ),
        fetchAllDeclarations(
          obligationsApi,
          { status: 'Submitted', registrationType },
          traceId
        ),
        fetchAllDeclarations(
          obligationsApi,
          { status: 'Accepted', registrationType },
          traceId
        )
      ])

    const submittedIds = new Set([
      ...pendingDeclarations.map((d) => d.organisation.id),
      ...acceptedDeclarations.map((d) => d.organisation.id)
    ])

    const allItems = orgsResult.organisations
      .filter((org) => !submittedIds.has(org.id))
      .map((org) => mapOrganisationToItem(org, organisationType))

    const totalPages = Math.ceil(allItems.length / PAGE_SIZE) || 1
    const start = (page - 1) * PAGE_SIZE
    const items = allItems.slice(start, start + PAGE_SIZE)

    await resolveNotSubmittedOrganisationDetails(
      accountApi,
      items,
      traceId,
      organisationType
    )

    return {
      items,
      totalPages,
      currentPage: page
    }
  }

  const status = statusByTab[tab]

  if (!status) {
    return { items: [], totalPages: 1, currentPage: page }
  }

  const data = await obligationsApi.listComplianceDeclarations(
    { status, registrationType, page, pageSize: PAGE_SIZE },
    traceId
  )

  return {
    items: data.complianceDeclarations.map(mapDeclarationToItem),
    totalPages: Math.ceil(data.total / PAGE_SIZE) || 1,
    currentPage: page
  }
}

// --- List page view model ---

export async function getCertificatesOfComplianceViewModel(
  organisationType,
  tab,
  currentPage,
  traceId
) {
  const apiWasteObligation = createWasteObligationsApiService()
  const apiWasteOrganisation = createWasteOrganisationsApiService()
  const apiAccount = createAccountApiService()
  const baseUrl = `/certificates-of-compliance?type=${organisationType}&tab=${tab}`

  const [summary, list] = await Promise.all([
    getComplianceSummary(
      apiWasteObligation,
      apiWasteOrganisation,
      organisationType,
      traceId
    ),
    getComplianceList(
      apiWasteObligation,
      apiWasteOrganisation,
      apiAccount,
      organisationType,
      tab,
      currentPage,
      traceId
    )
  ])

  return {
    heading: 'View certificates and statements of compliance',
    backlink: './',
    complianceYear: summary.complianceYear,
    totalPending: summary.totalPending,
    totalAccepted: summary.totalAccepted,
    totalNotSubmitted: summary.totalNotSubmitted,
    organisationType,
    activeTab: tab,
    items: list.items,
    pagination: {
      currentPage,
      totalPages: list.totalPages,
      baseUrl
    }
  }
}

// --- Detail response mapping ---

const organisationTypeDisplayNames = {
  DirectProducer: 'Direct producer',
  ComplianceScheme: 'Compliance scheme'
}

const registrationTypeFromApi = {
  COMPLIANCE_SCHEME: 'ComplianceScheme',
  SMALL_PRODUCER: 'DirectProducer',
  LARGE_PRODUCER: 'DirectProducer'
}

export function deriveRegistrationType(registrations, obligationYear) {
  const resolvedRegistrations = registrations ?? []
  if (!resolvedRegistrations.length) {
    return null
  }

  const resolveType = (registration) =>
    registrationTypeFromApi[registration?.type] ?? null

  const selectFromPool = (pool) => {
    if (!pool.length) {
      return null
    }
    const registered = pool.filter(
      (registration) => registration.status === 'REGISTERED'
    )
    const candidates = registered.length > 0 ? registered : pool
    const selected = candidates.reduce((best, current) => {
      if (!best) {
        return current
      }
      const bestTime = best.updated ? Date.parse(best.updated) : 0
      const currentTime = current.updated ? Date.parse(current.updated) : 0
      return currentTime >= bestTime ? current : best
    }, null)

    return resolveType(selected ?? candidates[0])
  }

  if (obligationYear != null) {
    const forYear = resolvedRegistrations.filter(
      (registration) =>
        Number(registration.registrationYear) === Number(obligationYear)
    )
    const typeForYear = selectFromPool(forYear)
    if (typeForYear) {
      return typeForYear
    }
  }

  const latestYear = Math.max(
    ...resolvedRegistrations.map(
      (registration) => Number(registration.registrationYear) || 0
    )
  )
  const latestRegistrations = resolvedRegistrations.filter(
    (registration) => Number(registration.registrationYear) === latestYear
  )

  return selectFromPool(latestRegistrations)
}

export function mapWasteOrganisationToDetailFields(
  organisation,
  { obligationYear } = {}
) {
  if (!organisation) {
    return {
      companyName: null,
      registrationType: null,
      organisationType: NO_DATA,
      companiesHouseNumber: NO_DATA
    }
  }

  const registrationType =
    organisation.registrationType ??
    deriveRegistrationType(organisation.registrations, obligationYear)

  return {
    companyName: mapOrganisationName({ ...organisation, registrationType }),
    registrationType,
    organisationType: displayOrNoData(
      registrationType
        ? (organisationTypeDisplayNames[registrationType] ?? registrationType)
        : null
    ),
    companiesHouseNumber: displayOrNoData(organisation.companiesHouseNumber)
  }
}

export function findSubmittedAuditUser(audit = []) {
  const entry = audit.find((auditEntry) => auditEntry.action === 'Submitted')
  return entry?.user ?? null
}

function findAcceptedAuditEntry(audit = []) {
  return audit.find((auditEntry) => auditEntry.action === 'Accepted')
}

function buildComplianceStatusLabel(registrationType) {
  return registrationType === 'ComplianceScheme'
    ? 'Statement status'
    : 'Certificate status'
}

function mapAcceptedOutcomeFields(data, registrationType) {
  if (data.status !== 'Accepted') {
    return {
      showAcceptedOutcome: false,
      complianceStatusLabel: null,
      acceptedBy: null,
      acceptedDate: null
    }
  }

  const acceptedAudit = findAcceptedAuditEntry(data.audit)

  return {
    showAcceptedOutcome: true,
    complianceStatusLabel: buildComplianceStatusLabel(registrationType),
    acceptedBy: displayOrNoData(acceptedAudit?.user?.name),
    acceptedDate: displayOrNoData(
      formatSubmissionDate(acceptedAudit?.timestamp ?? data.updated)
    )
  }
}

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

const certificateActionLabelsByRegistrationType = {
  DirectProducer: {
    accept: 'Accept certificate',
    cancel: 'Cancel certificate'
  },
  ComplianceScheme: {
    accept: 'Accept statement',
    cancel: 'Cancel statement'
  }
}

const certificateSuccessBannerCopyByRegistrationType = {
  DirectProducer: {
    accepted: {
      heading: 'Certificate accepted',
      text: 'Certificate has been accepted.'
    },
    cancelled: {
      heading: 'Certificate cancelled',
      text: 'Certificate has been cancelled and an email sent to the producer.'
    }
  },
  ComplianceScheme: {
    accepted: {
      heading: 'Statement accepted',
      text: 'Statement has been accepted.'
    },
    cancelled: {
      heading: 'Statement cancelled',
      text: 'Statement has been cancelled and an email sent to the compliance scheme.'
    }
  }
}

const reviewStatusByDeclarationStatus = {
  Submitted: 'Pending',
  Accepted: 'Approved',
  Queried: 'Queried',
  Cancelled: 'Cancelled'
}

export function mapDeclarationStatusToReviewStatus(status) {
  return reviewStatusByDeclarationStatus[status] ?? 'Pending'
}

export function buildCertificateDetailActionUrls(organisationId, id) {
  const base = `/${organisationId}/certificates-of-compliance/${id}`
  return {
    accept: `${base}/accept`,
    query: `${base}/query`,
    cancel: `${base}/cancel/reason`
  }
}

export function buildCertificateDetailActions(
  reviewStatus,
  organisationId,
  id,
  registrationType
) {
  const urls = buildCertificateDetailActionUrls(organisationId, id)
  const labels =
    certificateActionLabelsByRegistrationType[registrationType] ??
    certificateActionLabelsByRegistrationType.DirectProducer
  const showAccept = reviewStatus === 'Pending' || reviewStatus === 'Queried'
  const showCancel = showAccept || reviewStatus === 'Approved'

  return {
    showAccept,
    showCancel,
    labels,
    urls: {
      accept: urls.accept,
      cancel: urls.cancel
    }
  }
}

export function buildCertificateSuccessBanner(
  { showApprovalBanner, showQueryBanner, showCancelBanner },
  registrationType
) {
  const copyByType =
    certificateSuccessBannerCopyByRegistrationType[registrationType] ??
    certificateSuccessBannerCopyByRegistrationType.DirectProducer

  if (showApprovalBanner) {
    return { ...copyByType.accepted, type: 'accepted' }
  }
  if (showCancelBanner) {
    return { ...copyByType.cancelled, type: 'cancelled' }
  }
  if (showQueryBanner) {
    return null
  }
  return null
}

export function getDeclarationSessionKey(organisationId, id) {
  return `${organisationId}/${id}`
}

export const certificateActionSessionKeys = {
  justApproved: 'coc-just-approved',
  justQueried: 'coc-just-queried',
  justCancelled: 'coc-just-cancelled'
}

const declarationStatusByReviewStatus = {
  Pending: 'Submitted',
  Approved: 'Accepted',
  Queried: 'Queried',
  Cancelled: 'Cancelled'
}

function mockStatusSessionKey(declarationKey) {
  return `certificate-mock-status:${declarationKey}`
}

function mockAuditSessionKey(declarationKey) {
  return `certificate-mock-audit:${declarationKey}`
}

function mockCancelReasonSessionKey(declarationKey) {
  return `certificate-mock-cancel-reason:${declarationKey}`
}

function appendMockTransitionAudit(session, declarationKey, auditEntry) {
  const existing = session.get(mockAuditSessionKey(declarationKey)) ?? []
  const alreadyRecorded = existing.some(
    (entry) =>
      entry.action === auditEntry.action &&
      entry.timestamp === auditEntry.timestamp
  )

  if (alreadyRecorded) {
    return
  }

  session.set(mockAuditSessionKey(declarationKey), [...existing, auditEntry])
}

export function canApproveComplianceDeclaration(reviewStatus) {
  return reviewStatus === 'Pending' || reviewStatus === 'Queried'
}

export function canCancelComplianceDeclaration(reviewStatus) {
  return (
    reviewStatus === 'Pending' ||
    reviewStatus === 'Queried' ||
    reviewStatus === 'Approved'
  )
}

export function setMockDeclarationStatusOverride(
  session,
  declarationKey,
  reviewStatus,
  { reason } = {}
) {
  if (!config.get('useMockApi')) {
    return
  }

  const status = declarationStatusByReviewStatus[reviewStatus]
  if (status) {
    session.set(mockStatusSessionKey(declarationKey), status)
  }

  if (reviewStatus === 'Approved') {
    const { auditEntry } = buildMockAcceptedAuditEntry(session, declarationKey)
    appendMockTransitionAudit(session, declarationKey, auditEntry)
  }

  if (reviewStatus === 'Cancelled') {
    if (reason != null) {
      session.set(mockCancelReasonSessionKey(declarationKey), reason)
    }
    const { auditEntry } = buildMockCancelledAuditEntry(session, declarationKey)
    appendMockTransitionAudit(session, declarationKey, auditEntry)
  }
}

function nextMockAuditTimestamp(session, declarationKey) {
  const existing = session?.get?.(mockAuditSessionKey(declarationKey)) ?? []
  const lastTimestamp = existing.at(-1)?.timestamp
  const now = Date.now()
  const nextMs = lastTimestamp
    ? Math.max(now, new Date(lastTimestamp).getTime() + 1)
    : now

  return new Date(nextMs).toISOString()
}

function buildMockAcceptedAuditEntry(session, declarationKey) {
  const sessionUser = session?.get?.('user')
  const user = mapSessionUserToApiUser(sessionUser)
  const timestamp = nextMockAuditTimestamp(session, declarationKey)

  return {
    auditEntry: {
      action: 'Accepted',
      timestamp,
      user
    },
    updated: timestamp
  }
}

function buildMockCancelledAuditEntry(session, declarationKey) {
  const sessionUser = session?.get?.('user')
  const user = mapSessionUserToApiUser(sessionUser)
  const timestamp = nextMockAuditTimestamp(session, declarationKey)
  const reason =
    session?.get?.(mockCancelReasonSessionKey(declarationKey)) ?? null

  return {
    auditEntry: {
      action: 'Cancelled',
      timestamp,
      user,
      reason
    },
    updated: timestamp
  }
}

function applyMockDeclarationStatusOverride(data, declarationKey, session) {
  if (!config.get('useMockApi') || !session) {
    return data
  }

  const overrideStatus = session.get(mockStatusSessionKey(declarationKey))

  if (!overrideStatus) {
    return data
  }

  let sessionAudits = session.get(mockAuditSessionKey(declarationKey)) ?? []

  if (sessionAudits.length === 0) {
    if (overrideStatus === 'Accepted') {
      const { auditEntry } = buildMockAcceptedAuditEntry(
        session,
        declarationKey
      )
      sessionAudits = [auditEntry]
    } else if (overrideStatus === 'Cancelled') {
      const { auditEntry } = buildMockCancelledAuditEntry(
        session,
        declarationKey
      )
      sessionAudits = [auditEntry]
    } else {
      // No other status synthesises a mock audit entry - this else is only here to satisfy SonarQube rules.
    }
  }

  const updated = sessionAudits.at(-1)?.timestamp ?? data.updated

  return {
    ...data,
    status: overrideStatus,
    updated,
    audit: [...(data.audit ?? []), ...sessionAudits]
  }
}

export function readAndClearCertificateActionBannerFlags(
  session,
  declarationKey
) {
  const showApprovalBanner =
    session.get(certificateActionSessionKeys.justApproved) === declarationKey
  const showQueryBanner =
    session.get(certificateActionSessionKeys.justQueried) === declarationKey
  const showCancelBanner =
    session.get(certificateActionSessionKeys.justCancelled) === declarationKey

  if (showApprovalBanner) {
    session.clear(certificateActionSessionKeys.justApproved)
  }
  if (showQueryBanner) {
    session.clear(certificateActionSessionKeys.justQueried)
  }
  if (showCancelBanner) {
    session.clear(certificateActionSessionKeys.justCancelled)
  }

  return { showApprovalBanner, showQueryBanner, showCancelBanner }
}

async function getDeclarationDetail(
  obligationsApi,
  organisationsApi,
  accountApi,
  organisationId,
  id,
  { traceId, session, obligationYear } = {}
) {
  if (config.get('useMockApi')) {
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
    return mapDeclarationToDetail(mockData, {
      organisationId,
      id,
      declarationsForYear,
      submitterPhoneNumber
    })
  }

  if (!id) {
    const [obligationData, organisation, accountOrganisation] =
      await Promise.all([
        obligationsApi.getComplianceObligation(
          { organisationId, obligationYear },
          traceId
        ),
        organisationsApi.getOrganisation({ organisationId }, traceId),
        fetchAccountOrganisationDetails(accountApi, organisationId, traceId)
      ])
    return mapObligationToDetail(obligationData, {
      organisationId,
      obligationYear,
      organisation,
      accountOrganisationName: accountOrganisation.name,
      accountOrganisationReferenceNumber: accountOrganisation.referenceNumber
    })
  }

  const declaration = await obligationsApi.getComplianceDeclarationOrNull(
    { id, organisationId },
    traceId
  )

  if (declaration != null) {
    const [listResponse, submitterPhoneNumber] = await Promise.all([
      obligationsApi.listOrganisationComplianceDeclarations(
        { organisationId, obligationYear: declaration.obligationYear },
        traceId
      ),
      fetchSubmitterPhoneNumber(accountApi, declaration.audit, traceId)
    ])
    return mapDeclarationToDetail(declaration, {
      organisationId,
      id,
      declarationsForYear: listResponse?.complianceDeclarations ?? [],
      submitterPhoneNumber
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

export async function getComplianceDeclarationReviewStatus(
  organisationId,
  id,
  traceId,
  session
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
    {
      traceId,
      session
    }
  )

  return detail.reviewStatus
}

export function mapSessionUserToApiUser(sessionUser) {
  if (sessionUser?.id && sessionUser?.email) {
    return {
      id: sessionUser.id,
      email: sessionUser.email,
      name: sessionUser.name ?? 'Unknown'
    }
  }

  return { id: 'mock-user', email: 'mock-user@test.local', name: 'Mock User' }
}

export async function approveComplianceDeclaration(
  organisationId,
  id,
  sessionUser,
  traceId
) {
  if (config.get('useMockApi')) {
    return null
  }

  const api = createWasteObligationsApiService()
  return api.updateComplianceDeclaration(
    {
      organisationId,
      id,
      status: 'Accepted',
      user: mapSessionUserToApiUser(sessionUser)
    },
    traceId
  )
}

export async function cancelComplianceDeclaration(
  organisationId,
  id,
  sessionUser,
  reason,
  traceId
) {
  if (config.get('useMockApi')) {
    return null
  }

  const api = createWasteObligationsApiService()
  return api.updateComplianceDeclaration(
    {
      organisationId,
      id,
      status: 'Cancelled',
      reason,
      user: mapSessionUserToApiUser(sessionUser)
    },
    traceId
  )
}

const GLASS_BREAKDOWN_MATERIALS = new Set(['GlassRemelt', 'RemainingGlass'])

function formatSubmissionDate(isoString) {
  if (!isoString) return null
  const date = isDate(isoString) ? isoString : parseISO(isoString)
  return format(date, "d MMMM yyyy 'at' HH:mm")
}

function formatDate(isoString) {
  if (!isoString) return null
  return new Date(isoString).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

function mapObligationStatus(status) {
  switch (status) {
    case 'Met':
      return 'met'
    case 'NotMet':
      return 'not-met'
    case 'NoDataYet':
    case null:
    case undefined:
      return 'no-data'
    default:
      throw new Error(`Unexpected obligation status: ${status}`)
  }
}

function mapObligation(obligation) {
  return {
    name: obligation.material,
    obligationToMeet: obligation.tonnages.obligated ?? 0,
    awaitingAcceptance: obligation.tonnages.awaitingAcceptance ?? 0,
    accepted: obligation.tonnages.accepted ?? 0,
    outstanding: obligation.tonnages.outstanding ?? 0,
    status: mapObligationStatus(obligation.status)
  }
}

function deriveTotalsStatus(rows) {
  if (rows.some((r) => r.status === 'not-met')) return 'not-met'
  if (rows.every((r) => r.status === 'no-data')) return 'no-data'
  return 'met'
}

function computeTotals(rows) {
  return {
    obligationToMeet: rows.reduce((sum, r) => sum + r.obligationToMeet, 0),
    awaitingAcceptance: rows.reduce((sum, r) => sum + r.awaitingAcceptance, 0),
    accepted: rows.reduce((sum, r) => sum + r.accepted, 0),
    outstanding: rows.reduce((sum, r) => sum + r.outstanding, 0),
    status: deriveTotalsStatus(rows)
  }
}

function mapQueryDetails(queryDetails) {
  if (!queryDetails) return null
  return {
    queriedMaterials: queryDetails.queriedMaterials ?? null,
    reason: queryDetails.reason ?? null,
    dateQueried: formatDate(queryDetails.dateQueried ?? queryDetails.actionDate)
  }
}

function mapResubmissionRequestedDisplay(cancellationDetails) {
  const resubmission = cancellationDetails.resubmissionRequested
  if (resubmission === true) {
    return 'Yes'
  }
  if (resubmission === false) {
    return 'No'
  }
  return cancellationDetails.resubmissionRequestedDisplay ?? null
}

function mapCancellationDetails(cancellationDetails) {
  if (!cancellationDetails) return null
  return {
    reason: cancellationDetails.reason ?? null,
    resubmissionRequested: mapResubmissionRequestedDisplay(cancellationDetails),
    dateCancelled: formatDate(
      cancellationDetails.dateCancelled ?? cancellationDetails.actionDate
    )
  }
}

function formatHistoryDate(isoString) {
  if (!isoString) return null
  const d = new Date(isoString)
  const datePart = d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  })
  const timePart = d.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC'
  })
  return `${datePart} at ${timePart}`
}

function mapHistoryReason(status, transitionAudit) {
  switch (status) {
    case 'Accepted':
      return ''
    case 'Cancelled':
      return transitionAudit?.reason ?? null
    default:
      return null
  }
}

function mapCurrentYearHistory(declarations = []) {
  const rows = []

  for (const declaration of declarations) {
    const transitionAudits = (declaration.audit ?? []).filter(
      (entry) => entry.action === 'Accepted' || entry.action === 'Cancelled'
    )

    if (transitionAudits.length > 0) {
      for (const entry of transitionAudits) {
        rows.push({
          sortTimestamp: entry.timestamp ?? declaration.updated,
          date: formatHistoryDate(entry.timestamp ?? declaration.updated),
          action: entry.action,
          by: entry.user?.name ?? '',
          reason: mapHistoryReason(entry.action, entry)
        })
      }
      continue
    }

    if (
      declaration.status === 'Accepted' ||
      declaration.status === 'Cancelled'
    ) {
      rows.push({
        sortTimestamp: declaration.updated,
        date: formatHistoryDate(declaration.updated),
        action: declaration.status,
        by: '',
        reason: mapHistoryReason(declaration.status, null)
      })
    }
  }

  return rows
    .sort(
      (a, b) =>
        new Date(b.sortTimestamp).getTime() -
        new Date(a.sortTimestamp).getTime()
    )
    .map(({ sortTimestamp, ...row }) => row)
}

function buildCurrentYearDeclarations(
  declarationsForYear,
  data,
  status,
  declarationId
) {
  const declarations = [...(declarationsForYear ?? [])]

  if ((status === 'Accepted' || status === 'Cancelled') && declarationId) {
    const withoutCurrent = declarations.filter(
      (declaration) => declaration.id !== declarationId
    )

    return [...withoutCurrent, data].sort(
      (a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime()
    )
  }

  return declarations
}

function mapDeclarationToDetail(
  data,
  { organisationId, id, declarationsForYear, submitterPhoneNumber } = {}
) {
  const {
    organisation,
    obligationYear,
    obligations,
    obligationStatus,
    isRegulation43Compliant,
    submitterName,
    created,
    status
  } = data

  const reviewStatus = mapDeclarationStatusToReviewStatus(status)
  const resolvedOrganisationId = organisationId ?? organisation?.id ?? null
  const resolvedId = id ?? data.id ?? null

  const companyName =
    organisation.name ??
    organisation.complianceSchemeName ??
    organisation.schemeOperatorName ??
    UNKNOWN_ORGANISATION

  const allMapped = obligations.map(mapObligation)
  const materials = allMapped.filter(
    (_, i) => !GLASS_BREAKDOWN_MATERIALS.has(obligations[i].material)
  )
  const glassBreakdown = allMapped.filter((_, i) =>
    GLASS_BREAKDOWN_MATERIALS.has(obligations[i].material)
  )

  const actions =
    resolvedOrganisationId && resolvedId
      ? buildCertificateDetailActions(
          reviewStatus,
          resolvedOrganisationId,
          resolvedId,
          organisation.registrationType
        )
      : {
          showAccept: false,
          showCancel: false,
          labels: certificateActionLabelsByRegistrationType.DirectProducer,
          urls: { accept: '#', cancel: '#' }
        }

  const organisationTypeDisplay =
    organisationTypeDisplayNames[organisation.registrationType] ??
    organisation.registrationType

  const submittedUser = findSubmittedAuditUser(data.audit)
  const acceptedOutcome = mapAcceptedOutcomeFields(
    data,
    organisation.registrationType
  )

  const historyDeclarations = buildCurrentYearDeclarations(
    declarationsForYear,
    data,
    status,
    resolvedId
  )

  return {
    organisationId: resolvedOrganisationId,
    declarationId: resolvedId,
    complianceYear: obligationYear == null ? null : String(obligationYear),
    complianceTypeLabel: buildComplianceTypeLabel(
      obligationYear,
      organisation.registrationType
    ),
    companyName,
    declarationStatus: data.status,
    reviewStatus,
    showDeclaration: true,
    complianceDocumentNoun: complianceDocumentNoun(
      organisation.registrationType
    ),
    recyclingObligationsMet: mapRecyclingObligationsMet(obligationStatus),
    regulation43Met: isRegulation43Compliant ?? null,
    regulation43Statement: buildRegulation43Statement(
      isRegulation43Compliant ?? null,
      companyName
    ),
    dateDeclarationSubmitted: displayOrNoData(formatSubmissionDate(created)),
    ...acceptedOutcome,
    organisationType: displayOrNoData(organisationTypeDisplay),
    registrationType: organisation.registrationType,
    organisationRef: displayOrNoData(organisation.referenceNumber),
    companiesHouseNumber: displayOrNoData(organisation.companiesHouseNumber),
    nameOnAccount: displayOrNoData(submittedUser?.name),
    declarationEmailAddress: displayOrNoData(submittedUser?.email),
    companyPhoneNumber: displayOrNoData(submitterPhoneNumber),
    declarationSignedBy: displayOrNoData(submitterName),
    materials,
    materialTotals: computeTotals(materials),
    glassBreakdown,
    glassBreakdownTotals: computeTotals(glassBreakdown),
    actions,
    queryDetails:
      reviewStatus === 'Queried' ? mapQueryDetails(data.queryDetails) : null,
    cancellationDetails:
      reviewStatus === 'Cancelled'
        ? mapCancellationDetails(data.cancellationDetails)
        : null,
    currentYearActions: mapCurrentYearHistory(historyDeclarations),
    showObligations: obligations.length !== 0
  }
}

function mapObligationToDetail(
  data,
  {
    organisationId,
    obligationYear,
    organisation,
    accountOrganisationName,
    accountOrganisationReferenceNumber
  } = {}
) {
  const obligations = data?.obligations ?? []

  const allMapped = obligations.map(mapObligation)
  const materials = allMapped.filter(
    (_, i) => !GLASS_BREAKDOWN_MATERIALS.has(obligations[i].material)
  )
  const glassBreakdown = allMapped.filter((_, i) =>
    GLASS_BREAKDOWN_MATERIALS.has(obligations[i].material)
  )

  const orgFields = mapWasteOrganisationToDetailFields(organisation, {
    obligationYear
  })

  return {
    complianceYear: obligationYear == null ? null : String(obligationYear),
    complianceTypeLabel: buildComplianceTypeLabel(
      obligationYear,
      orgFields.registrationType
    ),
    ...orgFields,
    companyName: displayOrNoData(
      accountOrganisationName ?? orgFields.companyName
    ),
    declarationStatus: 'Unsubmitted',
    reviewStatus: null,
    showDeclaration: false,
    complianceDocumentNoun: complianceDocumentNoun(orgFields.registrationType),
    recyclingObligationsMet: null,
    regulation43Met: null,
    dateDeclarationSubmitted: NO_DATA,
    organisationRef: displayOrNoData(
      accountOrganisationReferenceNumber ??
        organisation?.referenceNumber ??
        organisationId
    ),
    nameOnAccount: NO_DATA,
    declarationEmailAddress: NO_DATA,
    companyPhoneNumber: NO_DATA,
    declarationSignedBy: NO_DATA,
    materials,
    materialTotals: computeTotals(materials),
    glassBreakdown,
    glassBreakdownTotals: computeTotals(glassBreakdown),
    actions: {
      showAccept: false,
      showCancel: false,
      labels: certificateActionLabelsByRegistrationType.DirectProducer,
      urls: { accept: '#', cancel: '#' }
    },
    showAcceptedOutcome: false,
    complianceStatusLabel: null,
    acceptedBy: null,
    acceptedDate: null,
    currentYearActions: [],
    showObligations: obligations.length !== 0
  }
}

// --- Detail page view model ---

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
    successBanner: buildCertificateSuccessBanner(
      bannerFlags,
      detail.registrationType
    ),
    ...detail
  }
}
