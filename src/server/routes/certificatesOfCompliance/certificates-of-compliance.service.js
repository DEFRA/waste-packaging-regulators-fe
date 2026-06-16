import { config } from '#/config/config.js'
import { createWasteObligationsApiService } from '#/services/waste-obligations-api.service.js'
import { createWasteOrganisationsApiService } from '#/services/waste-organisations-api.service.js'
import {
  mockSummary,
  mockSummaryByOrganisationType,
  mockListByOrganisationType,
  getMockDetailDataById
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

function mapOrganisationToItem(organisation, organisationType) {
  const organisationName =
    organisation.registrationType === 'compliance-schemes'
      ? (organisation.tradingName ??
        organisation.name ??
        'Unknown organisation')
      : (organisation.name ?? 'Unknown organisation')
  return {
    id: organisation.companiesHouseNumber,
    organisationName
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
        { registrationType, registrationYears: 2026 },
        traceId
      )
    ]
  )

  return {
    // Real API does not yet expose compliance year; use mock default until available
    complianceYear: mockSummary.complianceYear,
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
          { registrationType, registrationYears: 2026 },
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
    return {
      items: allItems.slice(start, start + PAGE_SIZE),
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
      accept: urls.approve,
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
  organisationId,
  id,
  { traceId, session } = {}
) {
  if (config.get('useMockApi')) {
    const mockData = applyMockDeclarationStatusOverride(
      getMockDetailDataById(id),
      getDeclarationSessionKey(organisationId, id),
      session
    )
    return mapDeclarationToDetail(mockData, {
      organisationId,
      id
    })
  }

  const declaration = await obligationsApi.getComplianceDeclarationOrNull(
    { id, organisationId },
    traceId
  )

  if (declaration != null) {
    return mapDeclarationToDetail(declaration, { organisationId, id })
  }

  const obligationData = await obligationsApi.getComplianceObligation(
    { organisationId },
    traceId
  )
  return mapObligationToDetail(obligationData, organisationId)
}

export async function getComplianceDeclarationReviewStatus(
  organisationId,
  id,
  traceId,
  session
) {
  const api = createWasteObligationsApiService()
  const detail = await getDeclarationDetail(api, organisationId, id, {
    traceId,
    session
  })

  return detail.reviewStatus
}

export function mapSessionUserToApiUser(sessionUser) {
  const profile = sessionUser?.profile
  if (profile) {
    const id = profile.sub ?? profile.oid ?? profile.id
    const email = profile.email ?? profile.emails?.[0]
    if (id && email) {
      return { id, email }
    }
  }

  return { id: 'mock-user', email: 'mock-user@test.local' }
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

function formatDate(isoString) {
  if (!isoString) return null
  return new Date(isoString).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

function mapObligation(obligation) {
  return {
    name: obligation.material,
    obligationToMeet: obligation.tonnages.obligated,
    awaitingAcceptance: obligation.tonnages.awaitingAcceptance,
    accepted: obligation.tonnages.accepted,
    outstanding: obligation.tonnages.outstanding,
    met: obligation.status?.toLowerCase() === 'met'
  }
}

function computeTotals(rows) {
  return {
    obligationToMeet: rows.reduce((sum, r) => sum + r.obligationToMeet, 0),
    awaitingAcceptance: rows.reduce((sum, r) => sum + r.awaitingAcceptance, 0),
    accepted: rows.reduce((sum, r) => sum + r.accepted, 0),
    outstanding: rows.reduce((sum, r) => sum + r.outstanding, 0),
    met: rows.every((r) => r.met)
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

function mapDeclarationToDetail(data, { organisationId, id } = {}) {
  const {
    organisation,
    obligationYear,
    obligations,
    obligationStatus,
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

  return {
    organisationId: resolvedOrganisationId,
    declarationId: resolvedId,
    complianceYear: String(obligationYear),
    companyName,
    declarationStatus: data.status,
    reviewStatus,
    recyclingObligationsMet: obligationStatus?.toLowerCase() === 'met',
    dateDeclarationSubmitted: formatDate(created),
    organisationType:
      organisationTypeDisplayNames[organisation.registrationType] ??
      organisation.registrationType,
    registrationType: organisation.registrationType,
    organisationRef: organisation.referenceNumber,
    // Contact fields are on the organisation object from the obligations API response
    companiesHouseNumber: organisation.companiesHouseNumber ?? null,
    nameOnAccount: organisation.nameOnAccount ?? null,
    declarationEmailAddress: organisation.contactEmailAddress ?? null,
    companyPhoneNumber: organisation.contactPhoneNumber ?? null,
    declarationSignedBy: submitterName,
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
        : null
  }
}

function mapObligationToDetail(data, organisationId) {
  const { obligations } = data

  const allMapped = obligations.map(mapObligation)
  const materials = allMapped.filter(
    (_, i) => !GLASS_BREAKDOWN_MATERIALS.has(obligations[i].material)
  )
  const glassBreakdown = allMapped.filter((_, i) =>
    GLASS_BREAKDOWN_MATERIALS.has(obligations[i].material)
  )

  return {
    complianceYear: null,
    companyName: null,
    declarationStatus: 'Unsubmitted',
    recyclingObligationsMet: false,
    dateDeclarationSubmitted: null,
    organisationType: null,
    organisationRef: organisationId,
    companiesHouseNumber: null,
    nameOnAccount: null,
    declarationEmailAddress: null,
    companyPhoneNumber: null,
    declarationSignedBy: null,
    materials,
    materialTotals: computeTotals(materials),
    glassBreakdown,
    glassBreakdownTotals: computeTotals(glassBreakdown)
  }
}

// --- Detail page view model ---

export async function getCertificateOfComplianceDetailViewModel(
  organisationId,
  id,
  { traceId, bannerFlags = {}, session } = {}
) {
  const apiWasteObligation = createWasteObligationsApiService()

  const detail = await getDeclarationDetail(
    apiWasteObligation,
    organisationId,
    id,
    { traceId, session }
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
