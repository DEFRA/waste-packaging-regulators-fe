/**
 * Object Mother for certificates-of-compliance tests.
 *
 * Each named export is a plain object derived from the mock data and provides
 * the URL, display name, IDs, and any other fields used across multiple tests.
 * Tests should import from here rather than hardcoding IDs or names directly.
 */

// --- Direct producer pending (all Met) ---
const howcoOrganisationId = '497f6eca-6276-4993-bfeb-53cbbbba6f08'
const howcoId = 'decl-101411'
export const HOWCO = {
  url: `/${howcoOrganisationId}/certificates-of-compliance/${howcoId}`,
  name: 'Howco Group plc',
  id: howcoId,
  organisationId: howcoOrganisationId,
  referenceNumber: '101411',
  companiesHouseNumber: '12345678',
  submitterName: 'Catherine Morris',
  obligationYear: 2026
}

// --- Direct producer pending (Not Met) ---
const greenfieldOrganisationId = 'b1e2c3d4-e5f6-7890-abcd-ef1234567890'
const greenfieldId = 'decl-204872'
export const GREENFIELD = {
  url: `/${greenfieldOrganisationId}/certificates-of-compliance/${greenfieldId}`,
  name: 'Greenfield Packaging Ltd',
  id: greenfieldId,
  organisationId: greenfieldOrganisationId
}

// --- Compliance scheme pending (all Met) ---
const ecopackOrganisationId = '923fa611-571c-4948-ab7d-fbb75e75ed65'
const ecopackId = 'decl-cs-001'
export const ECOPACK = {
  url: `/${ecopackOrganisationId}/certificates-of-compliance/${ecopackId}`,
  name: 'EcoPack Compliance Ltd',
  id: ecopackId,
  organisationId: ecopackOrganisationId,
  obligationYear: 2026
}

// --- Compliance scheme pending (Not Met) ---
const greenCircleOrganisationId = 'f3a2b1c0-d9e8-47f6-a5b4-c3d2e1f0a9b8'
const greenCircleId = 'decl-cs-002'
export const GREENCIRCLE = {
  url: `/${greenCircleOrganisationId}/certificates-of-compliance/${greenCircleId}`,
  complianceSchemeName: 'GreenCircle Schemes',
  id: greenCircleId,
  organisationId: greenCircleOrganisationId
}

// --- Compliance scheme accepted ---
const nationwideOrganisationId = 'e1d2c3b4-a596-4878-9abc-def012345678'
const nationwideId = 'decl-cs-101'
export const NATIONWIDE = {
  url: `/${nationwideOrganisationId}/certificates-of-compliance/${nationwideId}`,
  name: 'Nationwide Packaging Scheme',
  id: nationwideId,
  organisationId: nationwideOrganisationId,
  acceptedDate: '12 January 2027 at 12:05'
}

// --- Direct producer accepted ---
const acmeOrganisationId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
const acmeId = 'decl-309145'
export const ACME = {
  url: `/${acmeOrganisationId}/certificates-of-compliance/${acmeId}`,
  name: 'Acme Compliance Co',
  id: acmeId,
  organisationId: acmeOrganisationId,
  acceptedDate: '15 January 2027 at 14:30'
}

// --- Direct producer cancelled ---
const greenfieldCancelledId = 'decl-dp-cancelled'
export const GREENFIELD_CANCELLED = {
  url: `/${greenfieldOrganisationId}/certificates-of-compliance/${greenfieldCancelledId}`,
  name: 'Greenfield Packaging Ltd',
  id: greenfieldCancelledId,
  organisationId: greenfieldOrganisationId
}

// --- Compliance scheme cancelled ---
const greenCircleCancelledId = 'decl-cs-cancelled'
export const GREENCIRCLE_CANCELLED = {
  url: `/${greenCircleOrganisationId}/certificates-of-compliance/${greenCircleCancelledId}`,
  name: 'GreenCircle Schemes',
  id: greenCircleCancelledId,
  organisationId: greenCircleOrganisationId
}

// --- Accepted-only history declaration ---
const hillIndustriesOrganisationId = 'b0b1b2b3-b4b5-b6b7-b8b9-babbbcbdbebf'
const hillIndustriesId = 'decl-accepted-only'
export const HILL_INDUSTRIES = {
  url: `/${hillIndustriesOrganisationId}/certificates-of-compliance/${hillIndustriesId}`,
  name: 'Hill Industries Ltd',
  id: hillIndustriesId,
  organisationId: hillIndustriesOrganisationId,
  acceptedDate: '15 April 2026 at 11:20'
}

// --- Cancelled-only history declaration ---
const riverdaleOrganisationId = 'c0c1c2c3-c4c5-c6c7-c8c9-cacbcccdcecf'
const riverdaleId = 'decl-cancelled-only'
export const RIVERDALE = {
  url: `/${riverdaleOrganisationId}/certificates-of-compliance/${riverdaleId}`,
  name: 'Riverdale Packaging Ltd',
  id: riverdaleId,
  organisationId: riverdaleOrganisationId,
  cancelledDate: '8 April 2026 at 10:00'
}

// --- Not-submitted direct producers ---
const redwoodOrganisationId = 'd1e2f3a4-b5c6-7890-abcd-ef1234567890'
export const REDWOOD = {
  url: `/${redwoodOrganisationId}/certificates-of-compliance?obligationYear=2026`,
  name: 'Redwood Retail Group',
  organisationId: redwoodOrganisationId,
  referenceNumber: '518293'
}

const coastalBottlingOrganisationId = 'e2f3a4b5-c6d7-8901-bcde-f23456789012'
export const COASTAL_BOTTLING = {
  url: `/${coastalBottlingOrganisationId}/certificates-of-compliance?obligationYear=2026`,
  name: 'Coastal Bottling Co',
  organisationId: coastalBottlingOrganisationId,
  referenceNumber: '627148'
}

const sterlingOrganisationId = 'f3b4c5d6-e7a8-9012-cdef-123456789abc'
export const STERLING = {
  url: `/${sterlingOrganisationId}/certificates-of-compliance?obligationYear=2026`,
  name: 'Sterling Packaging Ltd',
  organisationId: sterlingOrganisationId,
  referenceNumber: '734921'
}

const pinnacleOrganisationId = 'a4b5c6d7-e8f9-0123-defa-234567890bcd'
export const PINNACLE = {
  url: `/${pinnacleOrganisationId}/certificates-of-compliance?obligationYear=2026`,
  name: 'Pinnacle Containers Ltd',
  organisationId: pinnacleOrganisationId,
  referenceNumber: '851036'
}

// --- Not-submitted compliance schemes ---
const futurepackOrganisationId = 'a9b8c7d6-e5f4-3210-abcd-ef9876543210'
export const FUTUREPACK = {
  url: `/${futurepackOrganisationId}/certificates-of-compliance?obligationYear=2026`,
  name: 'FuturePack Operators',
  organisationId: futurepackOrganisationId,
  referenceNumber: 'CS-3001'
}
