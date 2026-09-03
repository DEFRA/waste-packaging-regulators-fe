// waste-obligations store: a read-only projection over one set of compliance records.
// It answers the detail lookup, org history and listing query; projections live
// in declaration.js, query semantics in query.js.

import { OBLIGATION_YEAR } from '#mocks/identities.js'
import { defaultObligations } from './obligation-data.js'
import { isSubmittedRecord, toDeclaration } from './declaration.js'
import {
  statusMatcherForQuery,
  recordSearchText,
  sortRecords,
  parsePositiveInt
} from './query.js'

// Binds the query logic to one set of compliance records. `listedOrganisationIds`
// is exposed so the organisations mock can filter its listing to the same organisations.
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

  function getDeclarationById(id) {
    const record = recordByDeclarationId.get(id)
    return record ? toDeclaration(record) : null
  }

  // Every submitted declaration recorded against an organisation, most recent
  // first — the org+year history.
  function declarationsForOrganisation(organisationId) {
    return records
      .filter(
        (record) =>
          isSubmittedRecord(record) && record.organisationId === organisationId
      )
      .map((record) => toDeclaration(record))
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

    let matched = records.filter(
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
    declarationsForOrganisation,
    obligationsForOrganisation,
    queryDeclarations,
    listedOrganisationIds
  }
}
