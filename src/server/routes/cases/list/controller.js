import Boom from '@hapi/boom'
import { config } from '#config/config.js'
import { getLocale } from '#server/common/helpers/i18n/get-locale.js'
import { bindLocaleUrl } from '#server/common/helpers/i18n/locale-url.js'
import { pageI18n } from '#server/common/helpers/i18n/translate.js'
import { getForwardedPrefix } from '#server/common/helpers/proxy/forwarded-prefix.js'
import { getSessionUser } from '#server/common/helpers/get-session-user.js'
import { getRegulatorCaseManagementNation } from '#server/common/helpers/regulator-case-management-nation.js'
import {
  COMPLIANCE_YEAR,
  COMPLIANCE_SCHEMES,
  DIRECT_PRODUCERS
} from '#server/routes/certificatesOfCompliance/common/constants.js'
import { formatDate } from '#server/routes/certificatesOfCompliance/common/dates.js'
import { fetchUnassignedCsocCases } from './case-list-fetch.service.js'

const TABS = ['unassigned', 'assigned-to-me', 'assigned-to-team', 'completed']

// The Case Management API's largest page; the list is not paginated yet, so
// every page is fetched.
const PAGE_SIZE = 100

// Case Management CSoC states, shown with the certificate statuses the
// submission-status tag already renders.
const SUBMISSION_STATUS_BY_STATE = {
  SUBMITTED: 'Pending',
  ACCEPTED: 'Accepted',
  CANCELLED: 'Cancelled'
}

async function fetchAllUnassignedCsocCases(sessionUser, traceId) {
  const items = []
  let totalCount = 0
  for (let page = 1; ; page++) {
    const result = await fetchUnassignedCsocCases(sessionUser, traceId, {
      page,
      pageSize: PAGE_SIZE
    })
    items.push(...result.items)
    totalCount = result.totalCount
    if (result.items.length < PAGE_SIZE || items.length >= totalCount) {
      return { items, totalCount }
    }
  }
}

function validateListParams(type, tab) {
  if (![DIRECT_PRODUCERS, COMPLIANCE_SCHEMES].includes(type)) {
    throw Boom.badRequest(`Invalid organisation type: ${type}`)
  }
  if (!TABS.includes(tab)) {
    throw Boom.badRequest(`Invalid tab: ${tab}`)
  }
}

export const casesListController = {
  async handler(request, h) {
    if (!config.get('caseManagement.enabled')) {
      throw Boom.notFound()
    }

    const { type = DIRECT_PRODUCERS, tab = 'unassigned' } = request.query
    validateListParams(type, tab)

    const sessionUser = getSessionUser(request)
    if (getRegulatorCaseManagementNation(sessionUser) == null) {
      throw Boom.forbidden('Session user has no mapped Case Management nation')
    }

    const locale = getLocale(request)
    const routePrefix = getForwardedPrefix(request)
    const url = bindLocaleUrl(locale)
    const traceId = request.headers[config.get('tracing.header')]

    const unassigned =
      type === DIRECT_PRODUCERS
        ? await fetchAllUnassignedCsocCases(sessionUser, traceId)
        : { items: [], totalCount: 0 }

    const counts = {
      unassigned: unassigned.totalCount,
      'assigned-to-me': 0,
      'assigned-to-team': 0,
      completed: 0
    }
    const items = tab === 'unassigned' ? unassigned.items : []
    const i18n = pageI18n(locale, 'cases.list')

    return h
      .view('cases/list/index', {
        pageTitle: i18n.t('heading'),
        heading: i18n.t('heading'),
        complianceYear: String(COMPLIANCE_YEAR),
        locale,
        i18n,
        routePrefix,
        organisationType: type,
        activeTab: tab,
        tabs: TABS.map((id) => ({
          id,
          text: i18n.t(`tabs.${id}`, { count: counts[id] }),
          href: url(`${routePrefix}/cases?type=${type}&tab=${id}`),
          current: id === tab
        })),
        tabCount: counts[tab],
        tabSummaryText: i18n.t(
          `tabSummary.${tab}.${counts[tab] === 1 ? 'one' : 'other'}`
        ),
        emptyTabMessage: i18n.t(`emptyTab.${tab}`),
        items: items.map((item) => ({
          ...item,
          dateSubmitted: formatDate(item.dateSubmitted, locale, 'd MMMM yyyy'),
          submissionStatus:
            SUBMISSION_STATUS_BY_STATE[item.submissionStatus] ??
            item.submissionStatus
        }))
      })
      .header('Cache-Control', 'no-cache, no-store, must-revalidate')
  }
}
