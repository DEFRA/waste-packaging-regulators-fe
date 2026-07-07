import { config } from '#config/config.js'
import { createAccountApiService } from '#services/account-api.service.js'
import { format, isDate, parseISO } from 'date-fns'
import { createWasteObligationsApiService } from '#services/waste-obligations-api.service.js'
import { createWasteOrganisationsApiService } from '#services/waste-organisations-api.service.js'
import {
  mockSummary,
  mockSummaryByOrganisationType,
  mockListByOrganisationType,
  mockObligationData,
  mockNotSubmittedItems,
  mockComplianceSchemeNotSubmittedItems,
  getMockDetailDataById,
  getMockDeclarationsByOrgYear
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

export function displayOrNoData(value) {
  return value == null || value === '' ? NO_DATA : value
}

function isComplianceSchemeRegistrationType(registrationType) {
  return (
    registrationType === 'ComplianceScheme' ||
    registrationType === 'compliance-schemes'
  )
}

export function buildComplianceTypeLabel(obligationYear, registrationType) {
  if (obligationYear == null) {
    return NO_DATA
  }
  const year = String(obligationYear)
  const docType = isComplianceSchemeRegistrationType(registrationType)
    ? 'statement of compliance'
    : 'certificate of compliance'
  return `${year} ${docType}`
}

function mapOrganisationName(organisation) {
  if (isComplianceSchemeRegistrationType(organisation.registrationType)) {
    return (
      organisation.tradingName ??
      organisation.name ??
      organisation.complianceSchemeName ??
      'Unknown organisation'
    )
  }
  return organisation.name ?? 'Unknown organisation'
}

function findMockNotSubmittedOrganisation(organisationId) {
  const complianceSchemeItem = mockComplianceSchemeNotSubmittedItems.find(
    (item) => item.organisationId === organisationId
  )
  if (complianceSchemeItem) {
    return { ...complianceSchemeItem, registrationType: 'ComplianceScheme' }
  }
  const directProducerItem = mockNotSubmittedItems.find(
    (item) => item.organisationId === organisationId
  )
  if (directProducerItem) {
    return { ...directProducerItem, registrationType: 'DirectProducer' }
  }
  return null
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
      'Unknown organisation',
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
    organisationType === 'compliance-schemes'
      ? (organisation.tradingName ??
        organisation.name ??
        'Unknown organisation')
      : (organisation.name ?? 'Unknown organisation')
  return {
    id: null,
    organisationId: organisation.id,
    organisationReferenceNumber: 'No data',
    organisationName
  }
}

// Fills the 6-digit reference number for "Not submitted" rows from the Account API bulk lookup.
async function resolveNotSubmittedOrganisationDetails(
  accountApi,
  items,
  traceId
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

  for (const item of items) {
    const details = detailsByExternalId.get(item.organisationId)
    item.organisationReferenceNumber = details?.referenceNumber ?? 'No data'
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

    await resolveNotSubmittedOrganisationDetails(accountApi, items, traceId)

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
    approve: `${base}/approve`,
    query: `${base}/query`,
    cancel: `${base}/cancel`
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
  return `coc-mock-status:${declarationKey}`
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
  reviewStatus
) {
  if (!config.get('useMockApi')) {
    return
  }

  const status = declarationStatusByReviewStatus[reviewStatus]
  if (status) {
    session.set(mockStatusSessionKey(declarationKey), status)
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

  return { ...data, status: overrideStatus }
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
  organisationId,
  id,
  { traceId, session, obligationYear } = {}
) {
  if (config.get('useMockApi')) {
    const resolvedObligationYear =
      obligationYear ?? Number(mockSummary.complianceYear)

    if (!id) {
      const mockOrg = findMockNotSubmittedOrganisation(organisationId)
      return mapObligationToDetail(mockObligationData, {
        organisationId,
        obligationYear: resolvedObligationYear,
        organisation: mockOrg
          ? {
              name: mockOrg.organisationName,
              registrationType: mockOrg.registrationType,
              referenceNumber: mockOrg.organisationReferenceNumber
            }
          : null
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
    return mapDeclarationToDetail(mockData, {
      organisationId,
      id,
      declarationsForYear
    })
  }

  if (!id) {
    const [obligationData, organisation] = await Promise.all([
      obligationsApi.getComplianceObligation(
        { organisationId, obligationYear },
        traceId
      ),
      organisationsApi.getOrganisation({ organisationId }, traceId)
    ])
    return mapObligationToDetail(obligationData, {
      organisationId,
      obligationYear,
      organisation
    })
  }

  const declaration = await obligationsApi.getComplianceDeclarationOrNull(
    { id, organisationId },
    traceId
  )

  if (declaration != null) {
    const listResponse =
      await obligationsApi.listOrganisationComplianceDeclarations(
        { organisationId, obligationYear: declaration.obligationYear },
        traceId
      )
    return mapDeclarationToDetail(declaration, {
      organisationId,
      id,
      declarationsForYear: listResponse?.complianceDeclarations ?? []
    })
  }

  const obligationData = await obligationsApi.getComplianceObligation(
    { organisationId, obligationYear },
    traceId
  )
  return mapObligationToDetail(obligationData, {
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
  const detail = await getDeclarationDetail(
    obligationsApi,
    organisationsApi,
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
      return 'Not applicable'
    case 'Cancelled':
      return transitionAudit?.reason ?? null
    default:
      return null
  }
}

function mapCurrentYearHistory(declarations = []) {
  return declarations
    .filter((d) => d.status === 'Accepted' || d.status === 'Cancelled')
    .map((d) => {
      const transitionAudit = (d.audit ?? []).find((e) => e.action === d.status)
      return {
        date: formatHistoryDate(d.updated),
        action: d.status,
        by: d.submitterName ?? '',
        reason: mapHistoryReason(d.status, transitionAudit)
      }
    })
}

function mapDeclarationToDetail(
  data,
  { organisationId, id, declarationsForYear } = {}
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
    'Unknown organisation'

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

  return {
    organisationId: resolvedOrganisationId,
    declarationId: resolvedId,
    complianceYear: obligationYear != null ? String(obligationYear) : null,
    complianceTypeLabel: buildComplianceTypeLabel(
      obligationYear,
      organisation.registrationType
    ),
    companyName,
    declarationStatus: data.status,
    reviewStatus,
    recyclingObligationsMet: mapRecyclingObligationsMet(obligationStatus),
    regulation43Met: isRegulation43Compliant ?? null,
    dateDeclarationSubmitted: displayOrNoData(formatSubmissionDate(created)),
    organisationType: displayOrNoData(organisationTypeDisplay),
    registrationType: organisation.registrationType,
    organisationRef: displayOrNoData(organisation.referenceNumber),
    companiesHouseNumber: displayOrNoData(organisation.companiesHouseNumber),
    nameOnAccount: displayOrNoData(organisation.nameOnAccount),
    declarationEmailAddress: displayOrNoData(organisation.contactEmailAddress),
    companyPhoneNumber: displayOrNoData(organisation.contactPhoneNumber),
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
    currentYearActions: mapCurrentYearHistory(declarationsForYear)
  }
}

function mapObligationToDetail(
  data,
  { organisationId, obligationYear, organisation } = {}
) {
  const { obligations } = data

  const allMapped = obligations.map(mapObligation)
  const materials = allMapped.filter(
    (_, i) => !GLASS_BREAKDOWN_MATERIALS.has(obligations[i].material)
  )
  const glassBreakdown = allMapped.filter((_, i) =>
    GLASS_BREAKDOWN_MATERIALS.has(obligations[i].material)
  )

  const registrationType = organisation?.registrationType ?? null
  const companyName = organisation ? mapOrganisationName(organisation) : null

  return {
    complianceYear: obligationYear != null ? String(obligationYear) : null,
    complianceTypeLabel: buildComplianceTypeLabel(
      obligationYear,
      registrationType
    ),
    companyName,
    declarationStatus: 'Unsubmitted',
    reviewStatus: null,
    recyclingObligationsMet: null,
    regulation43Met: null,
    dateDeclarationSubmitted: NO_DATA,
    organisationType: displayOrNoData(
      registrationType
        ? (organisationTypeDisplayNames[registrationType] ?? registrationType)
        : null
    ),
    registrationType,
    organisationRef: displayOrNoData(
      organisation?.referenceNumber ?? organisationId
    ),
    companiesHouseNumber: NO_DATA,
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
    currentYearActions: []
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

  const detail = await getDeclarationDetail(
    obligationsApi,
    organisationsApi,
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
