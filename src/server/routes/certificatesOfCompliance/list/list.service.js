import { createWasteObligationsApiService } from '#services/waste-obligations-api.service.js'
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
  COMPLIANCE_YEAR,
  DOWNLOAD_PAGE_CONCURRENCY,
  UNSUBMITTED_SORT_FIELD_BY_COLUMN,
  UNSUBMITTED_DEFAULT_SORT
} from '../common/constants.js'
import { mapOrganisationName } from '../common/organisation.js'
import { calculateObligationCoveragePercentage } from '../common/display.js'
import pMap from 'p-map'

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

// A not-submitted row as the unsubmitted endpoint serves it. Name, reference
// number and both obligation metrics arrive materialised, so nothing here needs
// a follow-up lookup.
//
// `id` is null because no declaration exists — the list template keys the
// organisation-detail link off exactly that. Regulation 43 is declaration
// content, so it has no value for an organisation that has not submitted, and
// there is no submission date for the same reason.
export function mapUnsubmittedToItem(row) {
  return {
    id: null,
    organisationId: row.organisationId,
    // The endpoint only returns organisations whose reference number resolved,
    // so this is defensive: it keeps the column from ever rendering 'undefined'.
    organisationReferenceNumber: row.referenceNumber ?? NO_DATA,
    organisationName: row.name,
    recyclingObligationsMet: row.recyclingObligationsMet ?? null,
    regulation43Met: null,
    obligationCoveragePercentage: row.obligationCoveragePercentage ?? null,
    dateSubmitted: null
  }
}

// Maps a UI column onto the endpoint's sort vocabulary. The fallback is
// load-bearing rather than cosmetic: the controller persists whatever `?sort=`
// it is given per tab in the session, so a hand-crafted
// `?tab=not-submitted&sort=DateSubmitted[desc]` would otherwise be stored and
// then 400 the endpoint on every later visit to the tab.
export function resolveUnsubmittedSort(sortColumn, sortDirection) {
  const field = UNSUBMITTED_SORT_FIELD_BY_COLUMN[sortColumn]

  if (!field || (sortDirection !== 'asc' && sortDirection !== 'desc')) {
    return UNSUBMITTED_DEFAULT_SORT
  }

  return `${field}[${sortDirection}]`
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

// Every unsubmitted row for the year, for the CSV export. The endpoint caps a
// page at 100, so the whole population is drained page by page.
//
// Pages after the first are bounded rather than fired at once: at 100 rows a
// page a large population would otherwise open hundreds of simultaneous
// requests, which is the same failure mode as the per-organisation fan-out this
// change removes, one level up. p-map's default stopOnError is kept so a failed
// page fails the export outright rather than writing a short CSV that looks
// complete.
export async function fetchAllUnsubmittedOrganisations(api, params, traceId) {
  const first = await api.listUnsubmittedComplianceDeclarations(
    { ...params, page: 1, pageSize: DECLARATIONS_BATCH_SIZE },
    traceId
  )
  const totalPages = Math.ceil(first.total / DECLARATIONS_BATCH_SIZE)

  if (totalPages <= 1) {
    return first.unsubmittedOrganisations
  }

  const remaining = await pMap(
    Array.from({ length: totalPages - 1 }, (_, i) => i + 2),
    (page) =>
      api.listUnsubmittedComplianceDeclarations(
        { ...params, page, pageSize: DECLARATIONS_BATCH_SIZE },
        traceId
      ),
    { concurrency: DOWNLOAD_PAGE_CONCURRENCY }
  )

  return [
    ...first.unsubmittedOrganisations,
    ...remaining.flatMap((r) => r.unsubmittedOrganisations)
  ]
}

async function getComplianceSummary(obligationsApi, organisationType, traceId) {
  const registrationType = registrationTypeByOrganisationType[organisationType]

  // Three symmetrical count probes. The not-submitted count used to mean
  // repeating the whole submitted/accepted diff a second time per render; the
  // endpoint answers it with a `total`, exactly as the other two tabs do.
  const [pendingResult, acceptedResult, notSubmittedResult] = await Promise.all(
    [
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
      obligationsApi.listUnsubmittedComplianceDeclarations(
        {
          obligationYear: COMPLIANCE_YEAR,
          registrationType,
          pageSize: 1
        },
        traceId
      )
    ]
  )

  return {
    // Real API does not yet expose compliance year; use configured registration year
    complianceYear: String(COMPLIANCE_YEAR),
    totalPending: pendingResult.total,
    totalAccepted: acceptedResult.total,
    totalNotSubmitted: notSubmittedResult.total
  }
}

async function getNotSubmittedComplianceList({
  obligationsApi,
  registrationType,
  sortColumn,
  sortDirection,
  page,
  traceId
}) {
  const data = await obligationsApi.listUnsubmittedComplianceDeclarations(
    {
      obligationYear: COMPLIANCE_YEAR,
      registrationType,
      sort: resolveUnsubmittedSort(sortColumn, sortDirection),
      page,
      pageSize: PAGE_SIZE
    },
    traceId
  )

  return {
    items: data.unsubmittedOrganisations.map(mapUnsubmittedToItem),
    totalPages: Math.ceil(data.total / PAGE_SIZE) || 1,
    currentPage: page
  }
}

async function getComplianceList({
  obligationsApi,
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
  { traceId, locale = 'en', routePrefix = '' } = {}
) {
  const apiWasteObligation = createWasteObligationsApiService()
  const baseUrl = `${routePrefix || '/'}?type=${organisationType}&tab=${tab}`

  const [summary, list] = await Promise.all([
    getComplianceSummary(apiWasteObligation, organisationType, traceId),
    getComplianceList({
      obligationsApi: apiWasteObligation,
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
