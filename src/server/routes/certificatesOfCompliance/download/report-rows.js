import {
  UNKNOWN_ORGANISATION,
  statusBySubmissionStatus
} from '../common/constants.js'
import {
  declarationCoveragePercentage,
  isComplianceSchemeRegistrationType
} from '../common/display.js'
import { displayStoredCancelReason } from '../cancel/reasons.js'
import {
  auditAction,
  findAcceptedAuditEntry,
  findAuditEntryByAction
} from '../detail/audit.js'
import { cancelledAt } from './cancellations.js'
import { toLondonCalendarDate } from './report-dates.js'
import { reportLabels } from './report-labels.js'

const statusKeyByDeclarationStatus = {
  [statusBySubmissionStatus.pending]: 'pending',
  [statusBySubmissionStatus.accepted]: 'accepted'
}

// Compliance schemes are named by scheme name, not operator, for every status.
export function reportOrganisationName(organisation) {
  if (isComplianceSchemeRegistrationType(organisation.registrationType)) {
    return (
      organisation.complianceSchemeName ??
      organisation.name ??
      UNKNOWN_ORGANISATION
    )
  }
  return organisation.name ?? UNKNOWN_ORGANISATION
}

// Reference numbers are stored as numbers so they sort, but kept as text if
// they have letters, a leading zero or over 15 digits.
const PLAIN_WHOLE_NUMBER = /^[1-9]\d{0,14}$/

export function reportReferenceNumber(referenceNumber) {
  if (referenceNumber == null || referenceNumber === '') {
    return null
  }
  const text = String(referenceNumber).trim()
  return PLAIN_WHOLE_NUMBER.test(text) ? Number(text) : text
}

function metOrNotMet(met, labels) {
  if (met == null) {
    return null
  }
  return met
    ? labels.recyclingObligations.met
    : labels.recyclingObligations.notMet
}

function declarationRecyclingObligations(obligationStatus, labels) {
  const status = obligationStatus?.toLowerCase()
  if (status === 'met') {
    return metOrNotMet(true, labels)
  }
  if (status === 'notmet') {
    return metOrNotMet(false, labels)
  }
  return null
}

// A missing flag counts as Not compliant.
function regulation43Text(isRegulation43Compliant, labels) {
  return isRegulation43Compliant === true
    ? labels.regulation43.compliant
    : labels.regulation43.notCompliant
}

// Glass comes as remaining glass and remelt, so summing every material counts it
// once. Rounding removes floating-point noise such as 2.9999999999999996.
export function totalObligatedTonnes(obligations) {
  if (!obligations?.length) {
    return null
  }
  const total = obligations.reduce(
    (sum, obligation) => sum + (obligation.tonnages?.obligated ?? 0),
    0
  )
  return Math.round(total * 1000) / 1000
}

// An Accepted audit entry means it was accepted before it was cancelled. With
// neither entry the status is unknown, so it is left blank.
function statusWhenCancelled(audit, cancelled, labels) {
  if (findAcceptedAuditEntry(audit)) {
    return labels.status.accepted
  }
  return cancelled ? labels.status.pending : null
}

export function cancellationToReportEntry(
  declaration,
  labels = reportLabels()
) {
  const cancelled = findAuditEntryByAction(
    declaration.audit,
    auditAction.cancelled
  )
  return {
    dateSubmitted: toLondonCalendarDate(declaration.created),
    dateCancelled: toLondonCalendarDate(cancelledAt(declaration)),
    cancelledBy: cancelled?.user?.name ?? null,
    reason: displayStoredCancelReason(
      cancelled?.reason,
      declaration.organisation?.registrationType,
      labels.locale
    ),
    statusWhenCancelled: statusWhenCancelled(
      declaration.audit,
      cancelled,
      labels
    )
  }
}

// Oldest first: groupCancellationsByOrganisation sorts each group.
function cancellationFields(
  cancellationsByOrganisation,
  organisationId,
  labels
) {
  const cancellationHistory = (
    cancellationsByOrganisation.get(organisationId) ?? []
  ).map((declaration) => cancellationToReportEntry(declaration, labels))
  return { cancellations: cancellationHistory.length, cancellationHistory }
}

export function declarationToReportRow(
  declaration,
  cancellationsByOrganisation = new Map(),
  labels = reportLabels()
) {
  const { organisation } = declaration
  const accepted =
    declaration.status === statusBySubmissionStatus.accepted
      ? findAcceptedAuditEntry(declaration.audit)
      : null

  return {
    organisationId: organisation.id,
    organisationName: reportOrganisationName(organisation),
    organisationReference: reportReferenceNumber(organisation.referenceNumber),
    status: labels.status[statusKeyByDeclarationStatus[declaration.status]],
    regulation43: regulation43Text(declaration.isRegulation43Compliant, labels),
    recyclingObligations: declarationRecyclingObligations(
      declaration.obligationStatus,
      labels
    ),
    percentageMet: declarationCoveragePercentage(declaration),
    totalObligationTonnes: totalObligatedTonnes(declaration.obligations),
    dateSubmitted: toLondonCalendarDate(declaration.created),
    dateAccepted: toLondonCalendarDate(accepted?.timestamp),
    acceptedBy: accepted?.user?.name ?? null,
    ...cancellationFields(cancellationsByOrganisation, organisation.id, labels)
  }
}

// The unsubmitted endpoint does not return a total obligation yet.
export function unsubmittedToReportRow(
  row,
  cancellationsByOrganisation = new Map(),
  labels = reportLabels()
) {
  return {
    organisationId: row.organisationId,
    organisationName: row.name ?? UNKNOWN_ORGANISATION,
    organisationReference: reportReferenceNumber(row.referenceNumber),
    status: labels.status.notSubmitted,
    regulation43: null,
    recyclingObligations: metOrNotMet(row.recyclingObligationsMet, labels),
    percentageMet: row.obligationCoveragePercentage ?? null,
    totalObligationTonnes: null,
    dateSubmitted: null,
    dateAccepted: null,
    acceptedBy: null,
    ...cancellationFields(
      cancellationsByOrganisation,
      row.organisationId,
      labels
    )
  }
}

// If an organisation ever has two current declarations, the newest wins.
function currentDeclarationPerOrganisation(declarations) {
  const byOrganisation = new Map()
  for (const declaration of declarations) {
    const organisationId = declaration.organisation.id
    const existing = byOrganisation.get(organisationId)
    if (
      !existing ||
      Date.parse(declaration.created) > Date.parse(existing.created)
    ) {
      byOrganisation.set(organisationId, declaration)
    }
  }
  return [...byOrganisation.values()]
}

function byOrganisationName(a, b) {
  return (
    a.organisationName.localeCompare(b.organisationName, 'en-GB', {
      sensitivity: 'base'
    }) ||
    String(a.organisationReference ?? '').localeCompare(
      String(b.organisationReference ?? ''),
      'en-GB',
      { numeric: true }
    )
  )
}

// Every organisation once, sorted A to Z. A declaration row wins over an
// unsubmitted row for the same organisation.
export function buildReportRows({
  declarations = [],
  unsubmittedOrganisations = [],
  cancellationsByOrganisation = new Map(),
  labels = reportLabels()
}) {
  const declarationRows = currentDeclarationPerOrganisation(declarations).map(
    (declaration) =>
      declarationToReportRow(declaration, cancellationsByOrganisation, labels)
  )
  const declaredOrganisationIds = new Set(
    declarationRows.map((row) => row.organisationId)
  )
  const unsubmittedRows = unsubmittedOrganisations
    .filter((row) => !declaredOrganisationIds.has(row.organisationId))
    .map((row) =>
      unsubmittedToReportRow(row, cancellationsByOrganisation, labels)
    )

  return [...declarationRows, ...unsubmittedRows].sort(byOrganisationName)
}
