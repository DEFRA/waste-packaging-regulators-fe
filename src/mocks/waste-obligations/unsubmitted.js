// Pure projection of a compliance record to the GET /compliance-declarations/unsubmitted
// row shape. No state — the store composes this over its record set.

import { OBLIGATION_YEAR, MOCK_BUSINESS_COUNTRY } from '#mocks/identities.js'
import { listOrganisationName } from './declaration.js'
// The real backend materialises these two metrics from the same calculation the
// detail page runs, so the mock derives them with the very same helpers rather
// than restating the arithmetic. Crossing into the app layer from a mock is
// deliberate: test-helpers/msw/scenario.js already does it, and it is what stops
// the mock's numbers and the scenario factory's expected rows from drifting.
import { deriveRecyclingObligationsMet } from '#server/routes/certificatesOfCompliance/detail/detail-mapping.js'
import { calculateObligationCoveragePercentage } from '#server/routes/certificatesOfCompliance/common/display.js'

// The endpoint serves materialised columns, so a row whose obligations have not
// been calculated yet reports null — "no successful calculation", which is not
// the same as a calculated zero.
function metricsFor(obligations) {
  if (!obligations?.length) {
    return {
      recyclingObligationsMet: null,
      obligationCoveragePercentage: null
    }
  }

  return {
    recyclingObligationsMet: deriveRecyclingObligationsMet(obligations),
    obligationCoveragePercentage:
      calculateObligationCoveragePercentage(obligations)
  }
}

export function toUnsubmittedOrganisation(record) {
  return {
    organisationId: record.organisationId,
    obligationYear: OBLIGATION_YEAR,
    registrationType: record.registrationType,
    businessCountry: MOCK_BUSINESS_COUNTRY,
    name: listOrganisationName(record),
    referenceNumber: record.organisationReferenceNumber,
    ...metricsFor(record.obligations)
  }
}
