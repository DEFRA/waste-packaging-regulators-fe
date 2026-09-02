// Assembles the three backend mocks (obligations, organisations, account) into
// one set and its MSW handlers. The default set is built from the canonical
// fixtures; a per-test scenario builds its own (see test-helpers/msw/scenario.js).
// The organisations listing depends on which organisations the obligations records
// mark as listed, so that set is passed across when the backends are assembled.

import { complianceRecords } from './waste-obligations/fixtures.js'
import { wasteOrganisations } from './waste-organisations/fixtures.js'
import { accountOrganisations } from './account-api/fixtures.js'
import { createObligationsStore } from './waste-obligations/store.js'
import {
  toDeclaration,
  isSubmittedRecord,
  listOrganisationName
} from './waste-obligations/declaration.js'
import { obligationsHandlers } from './waste-obligations/handlers.js'
import { createOrganisationsStore } from './waste-organisations/store.js'
import { organisationsHandlers } from './waste-organisations/handlers.js'
import { createAccountStore } from './account-api/store.js'
import { accountHandlers } from './account-api/handlers.js'

export { toDeclaration, isSubmittedRecord, listOrganisationName }

export function createBackends({
  records = [],
  wasteOrganisations: organisations = [],
  accountOrganisations: accounts = []
} = {}) {
  const obligations = createObligationsStore(records)
  const registry = createOrganisationsStore(organisations, {
    listedOrganisationIds: obligations.listedOrganisationIds
  })
  const account = createAccountStore(accounts)
  return { obligations, organisations: registry, account }
}

// Clears any in-session mutations (the approve/cancel overrides held in the
// obligations store), returning the backends to their base fixture state. The
// store is a process singleton, so a journey test that accepts or cancels a
// declaration leaves it mutated for every later test; the mock-only reset route
// calls this so each test starts from the same pending records.
export function resetBackends(backends) {
  backends.obligations.resetOverrides()
}

export function backendHandlers(backends) {
  return [
    ...obligationsHandlers(backends.obligations),
    ...organisationsHandlers(backends.organisations),
    ...accountHandlers(backends.account)
  ]
}

export const defaultBackends = createBackends({
  records: complianceRecords,
  wasteOrganisations,
  accountOrganisations
})
