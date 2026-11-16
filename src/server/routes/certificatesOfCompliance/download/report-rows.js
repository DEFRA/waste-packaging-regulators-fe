import {
  UNKNOWN_ORGANISATION,
  statusBySubmissionStatus
} from '../common/constants.js'
import {
  declarationCoveragePercentage,
  isComplianceSchemeRegistrationType
} from '../common/display.js'
import { findAcceptedAuditEntry } from '../detail/audit.js'
import { toLondonCalendarDate } from './report-dates.js'

export const REPORT_STATUS = {
  pending: 'Pending',
  accepted: 'Accepted',
  notSubmitted: 'Not submitted'
}

const reportStatusByDeclarationStatus = {
  [statusBySubmissionStatus.pending]: REPORT_STATUS.pending,
  [statusBySubmissionStatus.accepted]: REPORT_STATUS.accepted
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

// Kept as text when a number would change it (letters or a leading zero).
const PLAIN_WHOLE_NUMBER = /^[1-9]\d{0,14}$/

export function reportReferenceNumber(referenceNumber) {
  if (referenceNumber == null || referenceNumber === '') {
    return null
  }
  const text = String(referenceNumber).trim()
  return PLAIN_WHOLE_NUMBER.test(text) ? Number(text) : text
}

function metOrNotMet(met) {
  if (met == null) {
    return null
  }
  return met ? 'Met' : 'Not met'
}

function declarationRecyclingObligations(obligationStatus) {
  const status = obligationStatus?.toLowerCase()
  if (status === 'met') {
    return metOrNotMet(true)
  }
  if (status === 'notmet') {
    return metOrNotMet(false)
  }
  return metOrNotMet(null)
}

// A missing flag counts as Not compliant.
function regulation43Text(isRegulation43Compliant) {
  return isRegulation43Compliant === true ? 'Compliant' : 'Not compliant'
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

function cancellationCount(cancellationsByOrganisation, organisationId) {
  return cancellationsByOrganisation.get(organisationId)?.length ?? 0
}

export function declarationToReportRow(
  declaration,
  cancellationsByOrganisation = new Map()
) {
  const { organisation } = declaration
  const status = reportStatusByDeclarationStatus[declaration.status]
  const accepted =
    status === REPORT_STATUS.accepted
      ? findAcceptedAuditEntry(declaration.audit)
      : null

  return {
    organisationId: organisation.id,
    organisationName: reportOrganisationName(organisation),
    organisationReference: reportReferenceNumber(organisation.referenceNumber),
    status,
    regulation43: regulation43Text(declaration.isRegulation43Compliant),
    recyclingObligations: declarationRecyclingObligations(
      declaration.obligationStatus
    ),
    percentageMet: declarationCoveragePercentage(declaration),
    totalObligationTonnes: totalObligatedTonnes(declaration.obligations),
    dateSubmitted: toLondonCalendarDate(declaration.created),
    dateAccepted: toLondonCalendarDate(accepted?.timestamp),
    acceptedBy: accepted?.user?.name ?? null,
    cancellations: cancellationCount(
      cancellationsByOrganisation,
      organisation.id
    )
  }
}

// The unsubmitted endpoint does not return a total obligation yet.
export function unsubmittedToReportRow(
  row,
  cancellationsByOrganisation = new Map()
) {
  return {
    organisationId: row.organisationId,
    organisationName: row.name ?? UNKNOWN_ORGANISATION,
    organisationReference: reportReferenceNumber(row.referenceNumber),
    status: REPORT_STATUS.notSubmitted,
    regulation43: null,
    recyclingObligations: metOrNotMet(row.recyclingObligationsMet),
    percentageMet: row.obligationCoveragePercentage ?? null,
    totalObligationTonnes: null,
    dateSubmitted: null,
    dateAccepted: null,
    acceptedBy: null,
    cancellations: cancellationCount(
      cancellationsByOrganisation,
      row.organisationId
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
  cancellationsByOrganisation = new Map()
}) {
  const declarationRows = currentDeclarationPerOrganisation(declarations).map(
    (declaration) =>
      declarationToReportRow(declaration, cancellationsByOrganisation)
  )
  const declaredOrganisationIds = new Set(
    declarationRows.map((row) => row.organisationId)
  )
  const unsubmittedRows = unsubmittedOrganisations
    .filter((row) => !declaredOrganisationIds.has(row.organisationId))
    .map((row) => unsubmittedToReportRow(row, cancellationsByOrganisation))

  return [...declarationRows, ...unsubmittedRows].sort(byOrganisationName)
}
