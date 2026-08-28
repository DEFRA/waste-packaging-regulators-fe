import { config } from '#config/config.js'
import { createAccountApiService } from '#services/account-api.service.js'
import { createWasteObligationsApiService } from '#services/waste-obligations-api.service.js'
import { createWasteOrganisationsApiService } from '#services/waste-organisations-api.service.js'
import { deriveRecyclingObligationsMet } from '../detail/detail-mapping.js'
import { bindLocaleUrl } from '#server/common/helpers/i18n/locale-url.js'
import {
  cocPageI18n,
  translateEmptyTabMessage,
  translateTabSummaryText
} from '../common/locale-strings.js'
import { translate } from '#server/common/helpers/i18n/translate.js'
import {
  registrationTypeByOrganisationType,
  statusBySubmissionStatus,
  PAGE_SIZE,
  DECLARATIONS_BATCH_SIZE,
  NO_DATA,
  COMPLIANCE_SCHEMES,
  COMPLIANCE_YEAR
} from '../common/constants.js'
import { mapOrganisationName } from '../common/organisation.js'
import { resolveSchemeOperators } from '../common/scheme-operator.js'
import { calculateObligationCoveragePercentage } from '../common/display.js'
import pMap from 'p-map'
import { createLogger } from '#server/common/helpers/logging/logger.js'

const logger = createLogger()

export function mapDeclarationToItem(declaration) {
  const {
    id,
    organisation,
    obligationStatus,
    isRegulation43Compliant,
    created,
    obligationCoveragePercentage
  } = declaration
  return {
    id,
    organisationReferenceNumber: organisation.referenceNumber,
    organisationId: organisation.id,
    organisationName: mapOrganisationName(organisation),
    recyclingObligationsMet: obligationStatus?.toLowerCase() === 'met',
    regulation43Met: isRegulation43Compliant,
    // Whole number from the obligations API — display as-is (no frontend rounding).
    // The search endpoint does not return one, but it does embed the obligations,
    // so fall back to the same calculation the not-submitted tab uses rather than
    // leaving the column blank.
    obligationCoveragePercentage:
      obligationCoveragePercentage ??
      (declaration.obligations?.length
        ? calculateObligationCoveragePercentage(declaration.obligations)
        : null),
    dateSubmitted: created
  }
}

// Reference number is resolved from the Account API (default 'No data').
function mapOrganisationToItem(organisation) {
  return {
    id: null,
    organisationId: organisation.id,
    companiesHouseNumber: organisation.companiesHouseNumber ?? null,
    organisationReferenceNumber: NO_DATA,
    organisationName: mapOrganisationName(organisation),
    recyclingObligationsMet: null,
    regulation43Met: null,
    obligationCoveragePercentage: null,
    dateSubmitted: null
  }
}

// Direct producers share an external id between waste-organisations and the
// Account API, so their reference number is resolved by external id.
async function resolveNotSubmittedOrganisationReferenceNumbers(
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
    item.organisationReferenceNumber = details?.referenceNumber ?? NO_DATA
  }
}

async function resolveNotSubmittedComplianceSchemeReferenceNumbers(
  accountApi,
  items,
  traceId
) {
  const schemeOperators = await resolveSchemeOperators(
    accountApi,
    items.map((item) => item.companiesHouseNumber),
    traceId
  )

  for (const item of items) {
    const operator = schemeOperators.get(item.companiesHouseNumber)
    item.organisationReferenceNumber = operator?.referenceNumber ?? NO_DATA
  }
}

export async function fetchAllDeclarations(api, params, traceId) {
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

// One obligation lookup per organisation. The on-screen list resolves only the
// visible page (<= PAGE_SIZE), but the CSV export resolves the whole population,
// so the fan-out is bounded with p-map: an unbounded Promise.all here fired
// thousands of simultaneous requests and took the service down. Concurrency is
// configurable; the default matches the page size the list already resolves
// successfully. p-map's default stopOnError aborts the whole export on the first
// failed lookup, so a regulator gets a clear error rather than a partial CSV.
export async function resolveNotSubmittedObligationData(
  obligationsApi,
  items,
  traceId
) {
  const concurrency = config.get('csvExport.obligationConcurrency')

  logger.info(
    { traceId, itemCount: items.length, concurrency },
    'Resolving not-submitted obligation data'
  )

  await pMap(
    items,
    async (item) => {
      const data = await obligationsApi.getComplianceObligationOrNull(
        {
          organisationId: item.organisationId,
          obligationYear: COMPLIANCE_YEAR
        },
        traceId
      )
      const obligations = data?.obligations ?? []
      item.recyclingObligationsMet = deriveRecyclingObligationsMet(obligations)
      item.obligationCoveragePercentage =
        calculateObligationCoveragePercentage(obligations)
    },
    { concurrency }
  )

  logger.info(
    { traceId, itemCount: items.length },
    'Resolved not-submitted obligation data'
  )
}

// Direct producers resolve by external id; compliance schemes by Companies
// House number (their external id doesn't match the Account API).
export async function resolveNotSubmittedReferenceNumbers(
  accountApi,
  items,
  traceId,
  organisationType
) {
  if (organisationType === COMPLIANCE_SCHEMES) {
    await resolveNotSubmittedComplianceSchemeReferenceNumbers(
      accountApi,
      items,
      traceId
    )
  } else {
    await resolveNotSubmittedOrganisationReferenceNumbers(
      accountApi,
      items,
      traceId
    )
  }
}

export function compareValues(valA, valB) {
  if (valA === null && valB === null) {
    return 0
  }
  if (valA === null) {
    return 1
  }
  if (valB === null) {
    return -1
  }

  if (typeof valA === 'boolean') {
    if (valA === valB) {
      return 0
    } else if (valA === true) {
      return 1
    } else {
      return -1
    }
  }

  if (typeof valA === 'number') {
    return valA - valB
  }

  if (typeof valA === 'string') {
    return valA.localeCompare(valB)
  }

  return 0
}

export function sortItems(items, sortColumn, sortDirection) {
  const direction = sortDirection === 'asc' ? 1 : -1

  const frontendSortMapping = {
    RecyclingObligations: 'recyclingObligationsMet',
    PercentageMet: 'obligationCoveragePercentage',
    DateSubmitted: 'dateSubmitted',
    Regulation43: 'regulation43Met',
    OrganisationName: 'organisationName',
    OrganisationId: 'id'
  }
  const sortProperty = frontendSortMapping[sortColumn] || sortColumn

  return items.sort((a, b) => {
    const primary = compareValues(a[sortProperty], b[sortProperty]) * direction

    if (primary !== 0) {
      return primary
    }

    // Secondary sort: organisation name ascending
    return compareValues(a.organisationName, b.organisationName)
  })
}

function countNotSubmittedOrganisations(
  organisations,
  pendingDeclarations,
  acceptedDeclarations
) {
  const submittedIds = new Set([
    ...pendingDeclarations.map((d) => d.organisation.id),
    ...acceptedDeclarations.map((d) => d.organisation.id)
  ])

  return organisations.filter((org) => !submittedIds.has(org.id)).length
}

async function getComplianceSummary(
  obligationsApi,
  organisationsApi,
  organisationType,
  traceId
) {
  const registrationType = registrationTypeByOrganisationType[organisationType]

  const [
    pendingResult,
    acceptedResult,
    orgsResult,
    pendingDeclarations,
    acceptedDeclarations
  ] = await Promise.all([
    obligationsApi.listComplianceDeclarations(
      {
        obligationYear: COMPLIANCE_YEAR,
        status: 'Submitted',
        registrationType,
        pageSize: 1
      },
      traceId
    ),
    obligationsApi.listComplianceDeclarations(
      {
        obligationYear: COMPLIANCE_YEAR,
        status: 'Accepted',
        registrationType,
        pageSize: 1
      },
      traceId
    ),
    organisationsApi.listComplianceOrganisations(
      { registrationType, registrationYears: COMPLIANCE_YEAR },
      traceId
    ),
    fetchAllDeclarations(
      obligationsApi,
      {
        obligationYear: COMPLIANCE_YEAR,
        status: 'Submitted',
        registrationType
      },
      traceId
    ),
    fetchAllDeclarations(
      obligationsApi,
      { obligationYear: COMPLIANCE_YEAR, status: 'Accepted', registrationType },
      traceId
    )
  ])

  return {
    // Real API does not yet expose compliance year; use configured registration year
    complianceYear: String(COMPLIANCE_YEAR),
    totalPending: pendingResult.total,
    totalAccepted: acceptedResult.total,
    totalNotSubmitted: countNotSubmittedOrganisations(
      orgsResult.organisations,
      pendingDeclarations,
      acceptedDeclarations
    )
  }
}

// Builds the full, unsorted not-submitted item list: every organisation with no
// Submitted or Accepted declaration for the year, mapped to items. Reference
// numbers and obligation percentages are resolved separately by the caller — the
// list resolves only the visible page, the CSV export resolves every row.
export async function buildAllNotSubmittedItems({
  obligationsApi,
  organisationsApi,
  registrationType,
  traceId
}) {
  const [orgsResult, pendingDeclarations, acceptedDeclarations] =
    await Promise.all([
      organisationsApi.listComplianceOrganisations(
        { registrationType, registrationYears: COMPLIANCE_YEAR },
        traceId
      ),
      fetchAllDeclarations(
        obligationsApi,
        {
          obligationYear: COMPLIANCE_YEAR,
          status: 'Submitted',
          registrationType
        },
        traceId
      ),
      fetchAllDeclarations(
        obligationsApi,
        {
          obligationYear: COMPLIANCE_YEAR,
          status: 'Accepted',
          registrationType
        },
        traceId
      )
    ])

  const submittedIds = new Set([
    ...pendingDeclarations.map((d) => d.organisation.id),
    ...acceptedDeclarations.map((d) => d.organisation.id)
  ])

  return orgsResult.organisations
    .filter((org) => !submittedIds.has(org.id))
    .map(mapOrganisationToItem)
}

async function getNotSubmittedComplianceList({
  obligationsApi,
  organisationsApi,
  accountApi,
  organisationType,
  registrationType,
  sortColumn,
  sortDirection,
  page,
  traceId
}) {
  const allItems = await buildAllNotSubmittedItems({
    obligationsApi,
    organisationsApi,
    registrationType,
    traceId
  })

  sortItems(allItems, sortColumn, sortDirection)

  const totalPages = Math.ceil(allItems.length / PAGE_SIZE) || 1
  const start = (page - 1) * PAGE_SIZE
  const items = allItems.slice(start, start + PAGE_SIZE)

  await resolveNotSubmittedReferenceNumbers(
    accountApi,
    items,
    traceId,
    organisationType
  )

  await resolveNotSubmittedObligationData(obligationsApi, items, traceId)

  return {
    items,
    totalPages,
    currentPage: page
  }
}

async function getComplianceList({
  obligationsApi,
  organisationsApi,
  accountApi,
  organisationType,
  tab,
  sortColumn,
  sortDirection,
  page,
  traceId
}) {
  const registrationType = registrationTypeByOrganisationType[organisationType]

  if (tab === 'not-submitted') {
    return getNotSubmittedComplianceList({
      obligationsApi,
      organisationsApi,
      accountApi,
      organisationType,
      registrationType,
      sortColumn,
      sortDirection,
      page,
      traceId
    })
  }

  const status = statusBySubmissionStatus[tab]

  if (!status) {
    return { items: [], totalPages: 1, currentPage: page }
  }

  const data = await obligationsApi.listComplianceDeclarations(
    {
      // Always scoped to the compliance year the page shows. It is also the prefix of
      // the ObligationYear_Status_OrganisationRegistrationType index, so sending it
      // lets that index narrow the set before any residual filtering.
      obligationYear: COMPLIANCE_YEAR,
      status,
      registrationType,
      page,
      pageSize: PAGE_SIZE,
      sortColumn,
      sortDirection
    },
    traceId
  )

  return {
    items: data.complianceDeclarations.map(mapDeclarationToItem),
    totalPages: Math.ceil(data.total / PAGE_SIZE) || 1,
    currentPage: page
  }
}

export async function getCertificatesOfComplianceViewModel(
  organisationType,
  tab,
  currentPage,
  sortColumn,
  sortDirection,
  traceId,
  locale = 'en'
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
    getComplianceList({
      obligationsApi: apiWasteObligation,
      organisationsApi: apiWasteOrganisation,
      accountApi: apiAccount,
      organisationType,
      tab,
      sortColumn,
      sortDirection,
      page: currentPage,
      traceId
    })
  ])

  let paginationBaseUrl = baseUrl
  if (sortColumn && sortDirection) {
    paginationBaseUrl += `&sort=${sortColumn}[${sortDirection}]`
  }

  const i18n = cocPageI18n(locale, 'list')
  const url = bindLocaleUrl(locale)

  return {
    heading: translate(locale, 'certificatesOfCompliance.list.heading'),
    backlink: url('./'),
    complianceYear: summary.complianceYear,
    totalPending: summary.totalPending,
    totalAccepted: summary.totalAccepted,
    totalNotSubmitted: summary.totalNotSubmitted,
    organisationType,
    activeTab: tab,
    items: list.items,
    emptyTabMessage: translateEmptyTabMessage(tab, locale),
    tabSummaryText: translateTabSummaryText(tab, locale),
    tabLabels: {
      pending: i18n.t('tabs.pending', { count: summary.totalPending }),
      accepted: i18n.t('tabs.accepted', { count: summary.totalAccepted }),
      notSubmitted: i18n.t('tabs.notSubmitted', {
        count: summary.totalNotSubmitted
      })
    },
    pagination: {
      currentPage,
      totalPages: list.totalPages,
      baseUrl: url(paginationBaseUrl)
    },
    sort: {
      column: sortColumn,
      direction: sortDirection,
      baseUrl: url(`${baseUrl}&page=1`)
    },
    i18n
  }
}
