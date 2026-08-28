// waste-obligations store: an in-memory store over one set of compliance records.
// It exists so the local mock stays stateful — approve/cancel transitions are held
// in memory, so someone running the app against the mocks can accept or cancel a
// certificate and watch it move between states (Pending, Accepted, history) within
// the session, exactly as a live backend would. That interactive, cross-state local
// testing is the whole reason the mock is a store rather than static fixtures. It
// also answers the detail lookup, org history and listing query; projections live
// in declaration.js, query semantics in query.js.

import { OBLIGATION_YEAR } from '#mocks/identities.js'
import { defaultObligations } from './obligation-data.js'
import { isSubmittedRecord, toDeclaration } from './declaration.js'
import {
  SUBMISSION_STATUS_BY_DECLARATION_STATUS,
  statusMatcherForQuery,
  recordSearchText,
  sortRecords,
  parsePositiveInt
} from './query.js'

// Binds the query logic (and the approve/cancel persistence) to one set of
// compliance records. `listedOrganisationIds` is exposed so the organisations
// mock can filter its listing to the same organisations.
export function createObligationsStore(records = []) {
  const recordByDeclarationId = new Map(
    records
      .filter(isSubmittedRecord)
      .map((record) => [record.declarationId, record])
  )
  const notSubmittedByOrgId = new Map(
    records
      .filter((record) => record.submissionStatus === 'not-submitted')
      .map((record) => [record.organisationId, record])
  )
  const listedOrganisationIds = new Set(
    records
      .filter((record) => record.submissionStatus != null)
      .map((record) => record.organisationId)
  )

  // In-memory persistence for approve/cancel, keyed by declaration id. Without a
  // live backend a PATCH must be recorded here, or the detail page would still
  // show the pre-action status on the redirect.
  const declarationOverrides = new Map()

  function effectiveRecord(record) {
    const override = declarationOverrides.get(record.declarationId)
    if (!override) {
      return record
    }
    return {
      ...record,
      declarationStatus: override.status,
      // The listing filters by this, so an approved declaration moves to the
      // Accepted tab and a cancelled one drops off — matching the detail page.
      submissionStatus:
        SUBMISSION_STATUS_BY_DECLARATION_STATUS[override.status] ?? null,
      updated: override.updated,
      audit: [...(record.audit ?? []), ...override.audit]
    }
  }

  function getDeclarationById(id) {
    const record = recordByDeclarationId.get(id)
    return record ? toDeclaration(effectiveRecord(record)) : null
  }

  // Applies an approve/cancel transition. `timestamp` is injected so callers (and
  // tests) stay deterministic. Returns the updated declaration, or null for an
  // unknown id. Transitions accumulate, so an accept-then-cancel leaves both audit
  // entries (and both current-year history rows), as a real backend would.
  function updateDeclaration(id, { status, user, reason, timestamp }) {
    const base = recordByDeclarationId.get(id)
    if (!base) {
      return null
    }
    const auditEntry = { action: status, timestamp, user }
    if (reason != null) {
      auditEntry.reason = reason
    }
    const existing = declarationOverrides.get(id)
    declarationOverrides.set(id, {
      status,
      updated: timestamp,
      audit: [...(existing?.audit ?? []), auditEntry]
    })
    return toDeclaration(effectiveRecord(base))
  }

  function resetOverrides() {
    declarationOverrides.clear()
  }

  // Every submitted declaration recorded against an organisation, most recent
  // first — the org+year history.
  function declarationsForOrganisation(organisationId) {
    return records
      .filter(
        (record) =>
          isSubmittedRecord(record) && record.organisationId === organisationId
      )
      .map((record) => toDeclaration(effectiveRecord(record)))
      .toSorted((a, b) => new Date(b.updated) - new Date(a.updated))
  }

  function obligationsForOrganisation(organisationId) {
    const record = notSubmittedByOrgId.get(organisationId)
    return {
      organisationId,
      obligationYear: OBLIGATION_YEAR,
      obligations: record ? record.obligations : defaultObligations
    }
  }

  // GET /compliance-declarations — filters, sorts and pages the declarations by the
  // status, registrationType, search, sort and page query-string parameters, the
  // same way the real backend the frontend talks to does.
  function queryDeclarations(searchParams) {
    const registrationType = searchParams.get('registrationType')
    const matchesStatus = statusMatcherForQuery(searchParams.get('status'))
    const search = searchParams.get('search')?.trim().toLowerCase()

    let matched = records
      .map(effectiveRecord)
      .filter(
        (record) =>
          matchesStatus(record) &&
          (registrationType == null ||
            record.registrationType === registrationType)
      )

    if (search) {
      matched = matched.filter((record) =>
        recordSearchText(record).includes(search)
      )
    }

    matched = sortRecords(matched, searchParams.get('sort'))

    const total = matched.length
    const page = parsePositiveInt(searchParams.get('page'), 1)
    const pageSize = parsePositiveInt(searchParams.get('pageSize'), total || 1)
    const start = (page - 1) * pageSize

    return {
      complianceDeclarations: matched
        .slice(start, start + pageSize)
        .map(toDeclaration),
      total,
      page,
      pageSize
    }
  }

  return {
    getDeclarationById,
    updateDeclaration,
    resetOverrides,
    declarationsForOrganisation,
    obligationsForOrganisation,
    queryDeclarations,
    listedOrganisationIds
  }
}
