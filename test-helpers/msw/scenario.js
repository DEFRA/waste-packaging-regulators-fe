// Scenario factory for integration tests.
//
// A test declares the compliance data it needs inline and gets back the MSW
// handlers to register AND the derived expectations, so the input and the asserted
// output live together in the test rather than in a shared fixture. The scenario
// is served through the very same dataset and handlers the default mock uses, so
// it exercises the real backend behaviour.
//
// Usage:
//   const scenario = mockScenario({
//     organisations: [
//       { name: 'Test Producer Ltd', status: 'pending', obligations: obligationPresets.mixed }
//     ]
//   })
//   applyScenario(scenario)                 // register handlers on the running server
//   ...drive the app...
//   const org = scenario.byName('Test Producer Ltd')
//   expect(...).toBe(org.expectedRow.recyclingObligationsMet)  // input & output, together

import { getMockServer } from '#mocks/server.js'
import {
  createBackends,
  backendHandlers,
  toDeclaration,
  listOrganisationName
} from '#mocks/backends.js'
import { OBLIGATION_YEAR } from '#mocks/identities.js'
import { mapDeclarationToItem } from '#server/routes/certificatesOfCompliance/list/list.service.js'
import { calculateObligationCoveragePercentage } from '#server/routes/certificatesOfCompliance/common/display.js'
import { deriveRecyclingObligationsMet } from '#server/routes/certificatesOfCompliance/detail/detail-mapping.js'
import { obligationPresets } from './obligations.js'

const DIRECT_PRODUCER = 'DirectProducer'
const COMPLIANCE_SCHEME = 'ComplianceScheme'

const STATUS_TO_DECLARATION = {
  pending: 'Submitted',
  accepted: 'Accepted',
  cancelled: 'Cancelled',
  queried: 'Queried'
}

// An organisation defaults to fully-met obligations. A spec that sets `obligations`
// explicitly — including null or [] — keeps that value, so the not-submitted
// "no obligations" states can be exercised.
function resolveObligations(spec) {
  return 'obligations' in spec ? spec.obligations : obligationPresets.allMet
}

// The record's submitted recycling status mirrors its obligations, so the list
// tag and the detail table cannot disagree.
function recyclingStatusString(obligations) {
  const met = deriveRecyclingObligationsMet(obligations ?? [])
  if (met === true) {
    return 'Met'
  }
  if (met === false) {
    return 'NotMet'
  }
  return null
}

function defaultPerson(name) {
  const [firstName, ...rest] = name.split(' ')
  const lastName = rest.join(' ') || 'Contact'
  const handle = name.toLowerCase().replace(/[^a-z0-9]+/g, '.')
  return {
    firstName,
    lastName,
    jobTitle: 'Compliance Manager',
    email: `${handle}@scenario.test`,
    telephoneNumber: '020 7946 0000',
    serviceRole: 'Approved Person'
  }
}

function regulatorUser(name) {
  return { id: 'scenario-regulator', name, email: 'regulator@scenario.test' }
}

// Build the audit trail for a declaration from its declarative outcome fields.
function buildAudit(status, spec, submitter, index, dateSubmitted) {
  const audit = []
  if (status !== 'not-submitted' && spec.submitted !== false) {
    audit.push({
      action: 'Submitted',
      timestamp: `${dateSubmitted}T09:00:00Z`,
      user: {
        id: `scenario-user-${index}`,
        email: `${submitter.toLowerCase().replace(/\s+/g, '.')}@scenario.test`,
        name: submitter
      }
    })
  }
  if (status === 'accepted') {
    audit.push({
      action: 'Accepted',
      timestamp: spec.acceptedDate ?? `${dateSubmitted}T12:00:00Z`,
      user: regulatorUser(spec.acceptedBy ?? 'A Regulator')
    })
  }
  if (status === 'cancelled') {
    audit.push({
      action: 'Cancelled',
      timestamp: spec.cancelledDate ?? `${dateSubmitted}T13:00:00Z`,
      user: regulatorUser(spec.cancelledBy ?? 'A Regulator'),
      reason: spec.cancelledReason ?? 'No reason given'
    })
  }
  return audit
}

let historySeq = 0

// A prior-year (or same-year) declaration recorded against the organisation and
// reachable only by id — used to populate the current-year history table.
function buildHistoryRecord(entry, base, index) {
  const status = entry.status // 'accepted' | 'cancelled'
  const timestamp = entry.at ?? `${entry.date ?? '2026-02-01'}T09:42:00Z`
  const audit =
    status === 'accepted'
      ? [
          {
            action: 'Accepted',
            timestamp,
            user: regulatorUser(entry.by ?? 'A Regulator')
          }
        ]
      : [
          {
            action: 'Cancelled',
            timestamp,
            user: regulatorUser(entry.by ?? 'A Regulator'),
            reason: entry.reason ?? 'No reason given'
          }
        ]
  return {
    key: `scenario-history-${index}-${(historySeq += 1)}`,
    registrationType: base.registrationType,
    organisationId: base.organisationId,
    organisationName: base.organisationName,
    complianceSchemeName: base.complianceSchemeName,
    schemeOperatorName: base.schemeOperatorName,
    organisationReferenceNumber: base.organisationReferenceNumber,
    companiesHouseNumber: base.companiesHouseNumber,
    submissionStatus: null,
    declarationId:
      entry.declarationId ?? `scenario-history-decl-${index}-${historySeq}`,
    declarationStatus: STATUS_TO_DECLARATION[status],
    created: timestamp,
    updated: timestamp,
    obligations: obligationPresets.allMet,
    obligationStatus: 'Met',
    isRegulation43Compliant: true,
    submitterName: base.submitterName ?? 'Test Submitter',
    audit
  }
}

function buildOrganisation(spec, index) {
  const isComplianceScheme = spec.type === 'compliance-scheme'
  const registrationType = isComplianceScheme
    ? COMPLIANCE_SCHEME
    : DIRECT_PRODUCER

  const status = spec.status ?? 'pending'
  const submitted = status !== 'not-submitted'
  // Detail-only records (cancelled/queried, or an explicit listed:false) are
  // reachable by id but never appear as a list row.
  const listed = spec.listed ?? (status === 'pending' || status === 'accepted')
  const submissionStatus =
    status === 'not-submitted'
      ? 'not-submitted'
      : listed
        ? status === 'accepted'
          ? 'accepted'
          : 'pending'
        : null

  const displayName = spec.name
  const organisationId = spec.organisationId ?? `scenario-org-${index}`
  const reference = spec.reference ?? `SCN${String(index + 1).padStart(4, '0')}`
  const companiesHouseNumber =
    'companiesHouseNumber' in spec
      ? spec.companiesHouseNumber
      : isComplianceScheme
        ? `CS_SCENARIO_${String(index + 1).padStart(4, '0')}`
        : `SCN${String(index + 1).padStart(5, '0')}`
  const obligations = resolveObligations(spec)
  const dateSubmitted = spec.dateSubmitted ?? '2027-01-15'
  const submitter = spec.submitter ?? 'Test Submitter'
  const persons = spec.persons ?? [defaultPerson(displayName)]

  const record = {
    key: `scenario-${index}`,
    registrationType,
    organisationId,
    organisationName: isComplianceScheme ? null : displayName,
    complianceSchemeName: isComplianceScheme
      ? (spec.schemeName ?? displayName)
      : null,
    schemeOperatorName: isComplianceScheme ? displayName : null,
    organisationReferenceNumber: reference,
    companiesHouseNumber,
    submissionStatus
  }

  if (submitted) {
    const audit = buildAudit(status, spec, submitter, index, dateSubmitted)
    const updated = audit.at(-1)?.timestamp ?? `${dateSubmitted}T00:00:00Z`
    Object.assign(record, {
      declarationId: spec.declarationId ?? `scenario-decl-${index}`,
      declarationStatus: STATUS_TO_DECLARATION[status],
      created: `${dateSubmitted}T00:00:00Z`,
      updated,
      dateSubmitted,
      obligations,
      obligationStatus: recyclingStatusString(obligations),
      obligationCoveragePercentage: calculateObligationCoveragePercentage(
        obligations ?? []
      ),
      isRegulation43Compliant: spec.regulation43 ?? null,
      submitterName: submitter,
      audit
    })
    if (spec.query) {
      record.queryDetails = {
        queriedMaterials: spec.query.materials ?? null,
        reason: spec.query.reason ?? null,
        dateQueried: spec.query.date ?? null
      }
    }
  } else {
    Object.assign(record, { declarationId: null, obligations })
  }

  const historyRecords = (spec.history ?? []).map((entry) =>
    buildHistoryRecord(entry, record, index)
  )

  const wasteOrganisation = {
    id: organisationId,
    name: displayName,
    tradingName: isComplianceScheme ? (spec.schemeName ?? displayName) : null,
    businessCountry: 'GB-ENG',
    companiesHouseNumber,
    address: {
      addressLine1: '1 Test Street',
      postcode: 'TE1 1ST',
      country: 'EN'
    },
    registrations: [
      {
        created: '2026-03-31T00:00:00Z',
        updated: '2026-03-31T00:00:00Z',
        status: 'REGISTERED',
        type: isComplianceScheme ? 'COMPLIANCE_SCHEME' : 'LARGE_PRODUCER',
        registrationYear: OBLIGATION_YEAR
      }
    ]
  }

  const account = {
    externalId: organisationId,
    name: displayName,
    referenceNumber: reference,
    companiesHouseNumber: isComplianceScheme ? companiesHouseNumber : null,
    isComplianceScheme,
    persons
  }

  const expectedRow =
    listed && submitted
      ? mapDeclarationToItem(toDeclaration(record))
      : submissionStatus === 'not-submitted'
        ? {
            id: null,
            organisationId,
            organisationReferenceNumber: reference,
            organisationName: listOrganisationName(record),
            recyclingObligationsMet: deriveRecyclingObligationsMet(
              obligations ?? []
            ),
            regulation43Met: null,
            obligationCoveragePercentage: calculateObligationCoveragePercentage(
              obligations ?? []
            ),
            dateSubmitted: null
          }
        : null

  const detailPath = submitted
    ? `/${organisationId}/certificates-of-compliance/${record.declarationId}`
    : `/${organisationId}/certificates-of-compliance?obligationYear=${OBLIGATION_YEAR}`

  const historyPathFor = (declarationId) =>
    `/${organisationId}/certificates-of-compliance/${declarationId}`

  return {
    name: displayName,
    type: registrationType,
    status,
    submissionStatus,
    organisationId,
    declarationId: record.declarationId ?? null,
    reference,
    companiesHouseNumber,
    obligations,
    record,
    historyRecords,
    history: historyRecords.map((h) => ({
      declarationId: h.declarationId,
      action: h.declarationStatus,
      url: historyPathFor(h.declarationId)
    })),
    wasteOrganisation,
    account,
    expectedRow,
    detailPath,
    historyPathFor
  }
}

export function mockScenario({ organisations = [] } = {}) {
  const built = organisations.map((spec, index) =>
    buildOrganisation(spec, index)
  )

  const backends = createBackends({
    records: built.flatMap((o) => [o.record, ...o.historyRecords]),
    wasteOrganisations: built.map((o) => o.wasteOrganisation),
    accountOrganisations: built.map((o) => o.account)
  })

  const handlers = backendHandlers(backends)

  const byName = (name) => {
    const found = built.find((o) => o.name === name)
    if (!found) {
      throw new Error(`No scenario organisation named "${name}"`)
    }
    return found
  }

  const rowsFor = (type, submissionStatus) =>
    built
      .filter((o) => o.type === type && o.submissionStatus === submissionStatus)
      .map((o) => o.expectedRow)

  return { organisations: built, handlers, backends, byName, rowsFor }
}

// Register a scenario's handlers on the running mock server; they take precedence
// over the default fixtures. Pair with resetScenario() in afterEach.
export function applyScenario(scenario) {
  const server = getMockServer()
  if (!server) {
    throw new Error(
      'applyScenario: the mock server is not running — build a server (createServer) in MOCK_API mode first.'
    )
  }
  server.use(...scenario.handlers)
}

// Restore the default fixture handlers.
export function resetScenario() {
  getMockServer()?.resetHandlers()
}
