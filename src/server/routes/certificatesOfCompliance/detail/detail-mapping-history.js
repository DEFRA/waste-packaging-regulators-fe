import { displayOrNoData } from '../common/display.js'
import {
  formatSubmissionDate,
  formatDate,
  formatHistoryDate
} from '../common/dates.js'
import { buildCertificateDetailPath } from '../actions/detail-actions.js'
import { findAuditEntryByAction, auditAction } from './audit.js'

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
    cancellationReason: displayOrNoData(cancelledAudit?.reason, locale)
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

function buildCurrentYearViewSubmissionUrl(
  declaration,
  fallbackOrganisationId,
  locale = 'en'
) {
  const organisationId = declaration.organisation?.id ?? fallbackOrganisationId
  return buildCertificateDetailPath(organisationId, declaration.id, locale)
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
    by: entry.user?.name ?? '',
    reason: mapHistoryReason(entry.action, entry),
    viewSubmissionUrl
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
    by: '',
    reason: mapHistoryReason(declaration.status, null),
    viewSubmissionUrl
  }
}

export function mapCurrentYearHistory(
  fallbackOrganisationId,
  declarations = [],
  locale = 'en'
) {
  const rows = []

  for (const declaration of declarations) {
    const viewSubmissionUrl = buildCurrentYearViewSubmissionUrl(
      declaration,
      fallbackOrganisationId,
      locale
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

export function buildCurrentYearDeclarations(
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

    return [...withoutCurrent, data].toSorted(
      (a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime()
    )
  }

  return declarations
}
