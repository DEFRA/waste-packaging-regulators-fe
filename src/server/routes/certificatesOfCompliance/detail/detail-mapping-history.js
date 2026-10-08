import { displayOrNoData } from '../common/display.js'
import { translateNotApplicable } from '../common/locale-strings.js'
import {
  formatSubmissionDate,
  formatDate,
  formatHistoryDate
} from '../common/dates.js'
import {
  buildCertificateDetailPath,
  documentTypeFromRegistrationType
} from '../actions/detail-actions.js'
import { findAuditEntryByAction, auditAction } from './audit.js'
import { displayStoredCancelReason } from '../cancel/reasons.js'

export function mapAcceptedOutcomeFields(data, locale = 'en') {
  if (data.status !== 'Accepted') {
    return {
      showAcceptedOutcome: false,
      acceptedBy: null,
      acceptedDate: null
    }
  }

  const acceptedAudit = findAuditEntryByAction(data.audit, auditAction.accepted)

  return {
    showAcceptedOutcome: true,
    acceptedBy: displayOrNoData(acceptedAudit?.user?.name, locale),
    acceptedDate: displayOrNoData(
      formatSubmissionDate(acceptedAudit?.timestamp ?? data.updated, locale),
      locale
    )
  }
}

export function mapCancelledOutcomeFields(data, locale = 'en') {
  if (data.status !== 'Cancelled') {
    return {
      showCancelledOutcome: false,
      cancelledBy: null,
      cancelledDate: null,
      cancellationReason: null
    }
  }

  const cancelledAudit = findAuditEntryByAction(
    data.audit,
    auditAction.cancelled
  )

  return {
    showCancelledOutcome: true,
    cancelledBy: displayOrNoData(cancelledAudit?.user?.name, locale),
    cancelledDate: displayOrNoData(
      formatSubmissionDate(cancelledAudit?.timestamp ?? data.updated, locale),
      locale
    ),
    cancellationReason: displayOrNoData(
      displayStoredCancelReason(
        cancelledAudit?.reason,
        data.organisation?.registrationType,
        locale
      ),
      locale
    )
  }
}

function mapQueryDetails(queryDetails, locale = 'en') {
  if (!queryDetails) {
    return null
  }
  return {
    queriedMaterials: queryDetails.queriedMaterials ?? null,
    reason: queryDetails.reason ?? null,
    dateQueried: formatDate(
      queryDetails.dateQueried ?? queryDetails.actionDate,
      locale
    )
  }
}

export function mapQueriedOutcome(data, locale = 'en') {
  return data.status === 'Queried'
    ? mapQueryDetails(data.queryDetails, locale)
    : null
}

function mapHistoryReason(
  status,
  transitionAudit,
  registrationType,
  locale = 'en'
) {
  switch (status) {
    case 'Accepted':
      return translateNotApplicable(locale)
    case 'Cancelled':
      return (
        displayStoredCancelReason(
          transitionAudit?.reason,
          registrationType,
          locale
        ) ?? null
      )
    default:
      return null
  }
}

function buildCurrentYearViewSubmissionUrl(
  declaration,
  fallbackOrganisationId,
  locale = 'en',
  routePrefix = ''
) {
  const organisationId = declaration.organisation?.id ?? fallbackOrganisationId
  const documentType = documentTypeFromRegistrationType(
    declaration.organisation?.registrationType
  )
  return buildCertificateDetailPath(
    organisationId,
    declaration.id,
    documentType,
    locale,
    routePrefix
  )
}

function getCurrentYearTransitionAudits(declaration) {
  return (declaration.audit ?? []).filter(
    (entry) => entry.action === 'Accepted' || entry.action === 'Cancelled'
  )
}

function buildCurrentYearHistoryRow(
  declaration,
  entry,
  viewSubmissionUrl,
  locale = 'en'
) {
  return {
    sortTimestamp: entry.timestamp ?? declaration.updated,
    date: formatHistoryDate(entry.timestamp ?? declaration.updated, locale),
    action: entry.action,
    by: displayOrNoData(entry.user?.name, locale),
    reason: mapHistoryReason(
      entry.action,
      entry,
      declaration.organisation?.registrationType,
      locale
    ),
    ...(entry.action === 'Cancelled' && { viewSubmissionUrl })
  }
}

function buildCurrentYearHistoryRowFromStatus(
  declaration,
  viewSubmissionUrl,
  locale = 'en'
) {
  return {
    sortTimestamp: declaration.updated,
    date: formatHistoryDate(declaration.updated, locale),
    action: declaration.status,
    by: displayOrNoData(null, locale),
    reason: mapHistoryReason(
      declaration.status,
      null,
      declaration.organisation?.registrationType,
      locale
    ),
    ...(declaration.status === 'Cancelled' && { viewSubmissionUrl })
  }
}

export function mapCurrentYearHistory(
  fallbackOrganisationId,
  declarations = [],
  locale = 'en',
  routePrefix = ''
) {
  const rows = []

  for (const declaration of declarations) {
    const viewSubmissionUrl = buildCurrentYearViewSubmissionUrl(
      declaration,
      fallbackOrganisationId,
      locale,
      routePrefix
    )
    const transitionAudits = getCurrentYearTransitionAudits(declaration)

    if (transitionAudits.length > 0) {
      for (const entry of transitionAudits) {
        rows.push(
          buildCurrentYearHistoryRow(
            declaration,
            entry,
            viewSubmissionUrl,
            locale
          )
        )
      }
      continue
    }

    if (
      declaration.status === 'Accepted' ||
      declaration.status === 'Cancelled'
    ) {
      rows.push(
        buildCurrentYearHistoryRowFromStatus(
          declaration,
          viewSubmissionUrl,
          locale
        )
      )
    }
  }

  const sorted = rows.toSorted(
    (a, b) =>
      new Date(b.sortTimestamp).getTime() - new Date(a.sortTimestamp).getTime()
  )
  return sorted.map(({ sortTimestamp: _sortTimestamp, ...row }) => row)
}

// The Current year section shows on the current submission only, never on a
// cancelled submission view.
export function showsCurrentYear(status) {
  return status !== 'Cancelled'
}

export function buildCurrentYearDeclarations(
  declarationsForYear,
  data,
  status,
  declarationId
) {
  const declarations = [...(declarationsForYear ?? [])]

  // The year's list can still hold a just-accepted declaration as Submitted,
  // so the accepted one being viewed replaces it.
  if (status === 'Accepted' && declarationId) {
    const withoutCurrent = declarations.filter(
      (declaration) => declaration.id !== declarationId
    )

    return [...withoutCurrent, data].toSorted(
      (a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime()
    )
  }

  return declarations
}
