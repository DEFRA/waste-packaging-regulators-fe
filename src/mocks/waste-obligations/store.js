// waste-obligations store: a read-only projection over one set of compliance records.
// It answers the detail lookup, org history and listing query; projections live
// in declaration.js, query semantics in query.js.

import {
  OBLIGATION_YEAR,
  MOCK_BUSINESS_COUNTRY,
  MOCK_STATUS_SUBMITTED,
  MOCK_STATUS_ACCEPTED
} from '#mocks/identities.js'
import { defaultObligations } from './obligation-data.js'
import { isSubmittedRecord, toDeclaration } from './declaration.js'
import { toUnsubmittedOrganisation } from './unsubmitted.js'
import {
  statusMatcherForQuery,
  recordSearchText,
  sortRecords,
  parsePositiveInt,
  parseUnsubmittedSort,
  sortUnsubmitted
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
    const country = searchParams.get('country')
    const matchesStatus = statusMatcherForQuery(searchParams.get('status'))
    const search = searchParams.get('search')?.trim().toLowerCase()

    let matched = records.filter(
      (record) =>
        matchesStatus(record) &&
        (registrationType == null ||
          record.registrationType === registrationType)
    )

    if (country != null) {
      matched = matched.filter(
        (record) =>
          (record.businessCountry ?? MOCK_BUSINESS_COUNTRY) === country
      )
    }

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

  // GET /compliance-declarations/unsubmitted — the organisations eligible for the
  // year that hold no Submitted or Accepted declaration.
  //
  // The set is derived the way the real backend derives it, rather than read off
  // `record.submissionStatus`. That marker says which tab a record lists under,
  // and a cancelled-only organisation carries no marker at all — so keying off it
  // would drop exactly the organisation the not-submitted tab must still show.
  function queryUnsubmitted(searchParams) {
    const obligationYear = searchParams.get('obligationYear')
    if (obligationYear != null && Number(obligationYear) !== OBLIGATION_YEAR) {
      return { unsubmittedOrganisations: [], total: 0, page: 1, pageSize: 20 }
    }

    const submittedOrganisationIds = new Set(
      records
        .filter(
          (record) =>
            record.declarationStatus === MOCK_STATUS_SUBMITTED ||
            record.declarationStatus === MOCK_STATUS_ACCEPTED
        )
        .map((record) => record.organisationId)
    )

    const requestedTypes = (searchParams.get('registrationType') ?? '')
      .split(',')
      .map((type) => type.trim())
      .filter(Boolean)

    const country = searchParams.get('country')
    const search = searchParams.get('search')?.trim().toLowerCase()

    // One row per organisation: an organisation holding several records (a
    // cancelled declaration plus its history, say) is still one unsubmitted row.
    const seen = new Set()
    let rows = []
    for (const record of records) {
      if (
        submittedOrganisationIds.has(record.organisationId) ||
        seen.has(record.organisationId)
      ) {
        continue
      }
      if (
        requestedTypes.length > 0 &&
        !requestedTypes.includes(record.registrationType)
      ) {
        continue
      }
      seen.add(record.organisationId)
      rows.push(toUnsubmittedOrganisation(record))
    }

    if (country != null) {
      rows = rows.filter((row) => row.businessCountry === country)
    }

    // Narrower than the declaration search: this projection holds only a name
    // and a reference number to match against.
    if (search) {
      rows = rows.filter((row) =>
        [row.name, row.referenceNumber]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(search)
      )
    }

    rows = sortUnsubmitted(rows, parseUnsubmittedSort(searchParams.get('sort')))

    const total = rows.length
    const page = parsePositiveInt(searchParams.get('page'), 1)
    const pageSize = parsePositiveInt(searchParams.get('pageSize'), 20)
    const start = (page - 1) * pageSize

    return {
      unsubmittedOrganisations: rows.slice(start, start + pageSize),
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
    queryUnsubmitted,
    listedOrganisationIds
  }
}
