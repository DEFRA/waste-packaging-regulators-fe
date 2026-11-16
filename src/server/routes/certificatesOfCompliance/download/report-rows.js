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

// The report names a compliance scheme by its scheme name, never the scheme
// operator, for every status. Not submitted rows already carry the scheme name
// in `name`.
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

// Organisation IDs are written as numbers so they sort numerically. A
// reference that is not a plain whole number (letters, or a leading zero that a
// number would drop) stays as text rather than being altered.
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

// A submitted declaration is only ever Compliant or Not compliant; the column
// is left blank only for organisations that have not submitted. The contract
// types the flag as a boolean, so a missing value is not treated as compliant.
function regulation43Text(isRegulation43Compliant) {
  return isRegulation43Compliant === true ? 'Compliant' : 'Not compliant'
}

// Total obligation across all materials. Glass is reported as remaining glass
// and remelt, so summing every material does not count glass twice.
export function totalObligatedTonnes(obligations) {
  if (!obligations?.length) {
    return null
  }
  return obligations.reduce(
    (total, obligation) => total + (obligation.tonnages?.obligated ?? 0),
    0
  )
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

// Total obligation is blank for Not submitted rows: the unsubmitted endpoint
// does not return it.
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

// One declaration per organisation. The backend allows a single Submitted or
// Accepted declaration per organisation and year; should two ever come back,
// the most recently created one is the organisation's current position.
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

// Every organisation once, under its current status, sorted A to Z by name.
// An organisation with a Submitted or Accepted declaration is never in the
// unsubmitted set; one that is anyway keeps its declaration row.
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
