// Mock data for certificates of compliance routes.
// Used when useMockApi=true and exported so tests can assert against the same values.

const MOCK_ORG_HOWCO_ID = '497f6eca-6276-4993-bfeb-53cbbbba6f08'
const MOCK_ORG_HOWCO_NAME = 'Howco Group plc'
const MOCK_ORG_GREENFIELD_ID = 'b1e2c3d4-e5f6-7890-abcd-ef1234567890'
const MOCK_ORG_GREENFIELD_NAME = 'Greenfield Packaging Ltd'
const MOCK_ORG_REDWOOD_ID = 'd1e2f3a4-b5c6-7890-abcd-ef1234567890'
const MOCK_ORG_REDWOOD_NAME = 'Redwood Retail Group'
const MOCK_ORG_GREENCIRCLE_ID = 'f3a2b1c0-d9e8-47f6-a5b4-c3d2e1f0a9b8'
const MOCK_ORG_GREENCIRCLE_NAME = 'GreenCircle Schemes'
const MOCK_ORG_FUTUREPACK_ID = 'a9b8c7d6-e5f4-3210-abcd-ef9876543210'
const MOCK_ORG_FUTUREPACK_NAME = 'FuturePack Operators'
const MOCK_ORG_COASTAL_ID = 'e2f3a4b5-c6d7-8901-bcde-f23456789012'
const MOCK_ORG_COASTAL_NAME = 'Coastal Bottling Co'
const MOCK_ORG_METROLINE_ID = 'b8c7d6e5-f4a3-2109-abcd-ef8765432109'
const MOCK_ORG_METROLINE_NAME = 'Metroline Waste Services'
const MOCK_ORG_ECOPACK_ID = '923fa611-571c-4948-ab7d-fbb75e75ed65'
const MOCK_ORG_ECOPACK_NAME = 'EcoPack Compliance Ltd'
const MOCK_ORG_ECOPACK_OPERATOR_NAME = 'EcoPack Group'
const MOCK_ORG_STERLING_ID = 'f3b4c5d6-e7a8-9012-cdef-123456789abc'
const MOCK_ORG_STERLING_NAME = 'Sterling Packaging Ltd'
const MOCK_ORG_PINNACLE_ID = 'a4b5c6d7-e8f9-0123-defa-234567890bcd'
const MOCK_ORG_PINNACLE_NAME = 'Pinnacle Containers Ltd'
const MOCK_ORG_MERIDIAN_ID = 'b5c6d7e8-f9a0-1234-efab-345678901cde'
const MOCK_ORG_MERIDIAN_NAME = 'Meridian Products Ltd'
const MOCK_ORG_NATIONWIDE_ID = 'e1d2c3b4-a596-4878-9abc-def012345678'
const MOCK_ORG_NATIONWIDE_NAME = 'Nationwide Packaging Scheme'
const MOCK_ORG_NATIONWIDE_OPERATOR_NAME = 'Nationwide Packaging Group'
const MOCK_ORG_RIVERSIDE_ID = '6d9a1e77-1b3f-4c22-8a41-8f5c1e9d2b34'
const MOCK_ORG_RIVERSIDE_NAME = 'Riverside Compliance Partners'
const MOCK_ORG_RIVERSIDE_OPERATOR_NAME = 'Riverside Group'
const MOCK_ORG_GREENCIRCLE_OPERATOR_NAME = 'GreenCircle Group'
const MOCK_STATUS_SUBMITTED = 'Submitted'
const MOCK_STATUS_ACCEPTED = 'Accepted'
const MOCK_STATUS_CANCELLED = 'Cancelled'
const MOCK_STATUS_QUERIED = 'Queried'
const MOCK_REGISTRATION_STATUS = 'REGISTERED'
const MOCK_BUSINESS_COUNTRY = 'GB-ENG'
const MOCK_REGISTRATION_TIMESTAMP = '2026-03-31T23:20:34.294+00:00'
const MOCK_CURRENT_YEAR_ACCEPTED_TIMESTAMP = '2026-02-13T09:42:00Z'
const MOCK_CURRENT_YEAR_CANCELLED_TIMESTAMP = '2026-05-22T14:18:00Z'
const MOCK_CS_CURRENT_YEAR_ACCEPTED_TIMESTAMP = '2026-03-04T11:05:00Z'
const MOCK_CS_CURRENT_YEAR_CANCELLED_TIMESTAMP = '2026-05-12T13:30:00Z'
const MOCK_ACCEPTED_ONLY_TIMESTAMP = '2026-04-15T11:20:00Z'
const MOCK_CANCELLED_ONLY_TIMESTAMP = '2026-04-08T10:00:00Z'
const MOCK_CS_SUBMITTED_TIMESTAMP = '2027-01-20T00:00:00Z'
const MOCK_DECL_HOWCO_ID = 'decl-101411'
const MOCK_DECL_GREENFIELD_ID = 'decl-204872'
const MOCK_DECL_ACME_ID = 'decl-309145'
const MOCK_DECL_BLUESKY_ID = 'decl-412067'
const MOCK_DECL_CS_PENDING_ID = 'decl-cs-001'
const MOCK_DECL_CS_PENDING_SECONDARY_ID = 'decl-cs-002'
const MOCK_DECL_CS_ACCEPTED_ID = 'decl-cs-101'
const MOCK_DECL_CS_ACCEPTED_SECONDARY_ID = 'decl-cs-102'
const MOCK_REF_GREENFIELD = '204872'
const MOCK_REF_CS_GREENCIRCLE = '110987'
const MOCK_REF_CS_NATIONWIDE = '164447'
const MOCK_REF_CS_RIVERSIDE = '172908'
const MOCK_REF_STERLING = '734921'
const MOCK_REF_PINNACLE = '851036'
const MOCK_REF_MERIDIAN = '962147'

export const mockSummaryByOrganisationType = {
  'direct-producers': {
    complianceYear: '2026',
    totalPending: 42,
    totalAccepted: 156,
    totalNotSubmitted: 8
  },
  'compliance-schemes': {
    complianceYear: '2026',
    totalPending: 18,
    totalAccepted: 64,
    totalNotSubmitted: 3
  }
}

export const mockSummary = mockSummaryByOrganisationType['direct-producers']

export const mockPendingItems = [
  {
    id: MOCK_DECL_HOWCO_ID,
    organisationId: MOCK_ORG_HOWCO_ID,
    organisationReferenceNumber: '101411',
    organisationName: MOCK_ORG_HOWCO_NAME,
    recyclingObligationsMet: false,
    percentageMet: 97,
    dateSubmitted: '2027-01-31'
  },
  {
    id: MOCK_DECL_GREENFIELD_ID,
    organisationId: MOCK_ORG_GREENFIELD_ID,
    organisationReferenceNumber: MOCK_REF_GREENFIELD,
    organisationName: MOCK_ORG_GREENFIELD_NAME,
    recyclingObligationsMet: false,
    percentageMet: 84,
    dateSubmitted: '2027-01-28'
  }
]

export const mockAcceptedItems = [
  {
    id: MOCK_DECL_ACME_ID,
    organisationId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    organisationReferenceNumber: '309145',
    organisationName: 'Acme Compliance Co',
    recyclingObligationsMet: true,
    regulation43Met: true,
    percentageMet: 112,
    dateSubmitted: '2027-01-15'
  },
  {
    id: MOCK_DECL_BLUESKY_ID,
    organisationId: 'c1d2e3f4-a5b6-7890-abcd-ef1234567890',
    organisationReferenceNumber: '412067',
    organisationName: 'BlueSky Materials plc',
    recyclingObligationsMet: false,
    regulation43Met: false,
    percentageMet: 89,
    dateSubmitted: '2027-01-10'
  }
]

export const mockNotSubmittedItems = [
  {
    id: null,
    organisationId: MOCK_ORG_REDWOOD_ID,
    organisationReferenceNumber: '518293',
    organisationName: MOCK_ORG_REDWOOD_NAME,
    recyclingObligationsMet: false,
    percentageMet: 0,
    dateSubmitted: null
  },
  {
    id: null,
    organisationId: MOCK_ORG_COASTAL_ID,
    organisationReferenceNumber: '627148',
    organisationName: MOCK_ORG_COASTAL_NAME,
    recyclingObligationsMet: false,
    percentageMet: 0,
    dateSubmitted: null
  },
  {
    id: null,
    organisationId: MOCK_ORG_STERLING_ID,
    organisationReferenceNumber: MOCK_REF_STERLING,
    organisationName: MOCK_ORG_STERLING_NAME,
    recyclingObligationsMet: null,
    percentageMet: null,
    dateSubmitted: null
  },
  {
    id: null,
    organisationId: MOCK_ORG_PINNACLE_ID,
    organisationReferenceNumber: MOCK_REF_PINNACLE,
    organisationName: MOCK_ORG_PINNACLE_NAME,
    recyclingObligationsMet: false,
    percentageMet: 0,
    dateSubmitted: null
  },
  {
    id: null,
    organisationId: MOCK_ORG_MERIDIAN_ID,
    organisationReferenceNumber: MOCK_REF_MERIDIAN,
    organisationName: MOCK_ORG_MERIDIAN_NAME,
    recyclingObligationsMet: false,
    percentageMet: 0,
    dateSubmitted: null
  }
]

export const mockComplianceSchemePendingItems = [
  {
    id: MOCK_DECL_CS_PENDING_ID,
    organisationId: MOCK_ORG_ECOPACK_ID,
    organisationReferenceNumber: '110234',
    organisationName: MOCK_ORG_ECOPACK_OPERATOR_NAME,
    recyclingObligationsMet: true,
    regulation43Met: false,
    percentageMet: 100,
    dateSubmitted: '2027-01-20'
  },
  {
    id: MOCK_DECL_CS_PENDING_SECONDARY_ID,
    organisationId: MOCK_ORG_GREENCIRCLE_ID,
    organisationReferenceNumber: MOCK_REF_CS_GREENCIRCLE,
    organisationName: MOCK_ORG_GREENCIRCLE_OPERATOR_NAME,
    recyclingObligationsMet: true,
    regulation43Met: true,
    percentageMet: 100,
    dateSubmitted: '2027-01-18'
  }
]

export const mockComplianceSchemeAcceptedItems = [
  {
    id: MOCK_DECL_CS_ACCEPTED_ID,
    organisationId: MOCK_ORG_NATIONWIDE_ID,
    organisationReferenceNumber: MOCK_REF_CS_NATIONWIDE,
    organisationName: MOCK_ORG_NATIONWIDE_OPERATOR_NAME,
    recyclingObligationsMet: true,
    regulation43Met: true,
    percentageMet: 105,
    dateSubmitted: '2027-01-12'
  },
  {
    id: MOCK_DECL_CS_ACCEPTED_SECONDARY_ID,
    organisationId: MOCK_ORG_RIVERSIDE_ID,
    organisationReferenceNumber: MOCK_REF_CS_RIVERSIDE,
    organisationName: MOCK_ORG_RIVERSIDE_OPERATOR_NAME,
    recyclingObligationsMet: false,
    regulation43Met: false,
    percentageMet: 92,
    dateSubmitted: '2027-01-08'
  }
]

export const mockComplianceSchemeNotSubmittedItems = [
  {
    id: null,
    organisationId: MOCK_ORG_FUTUREPACK_ID,
    organisationReferenceNumber: '183551',
    organisationName: MOCK_ORG_FUTUREPACK_NAME,
    recyclingObligationsMet: false,
    regulation43Met: false,
    percentageMet: 0,
    dateSubmitted: null
  },
  {
    id: null,
    organisationId: MOCK_ORG_METROLINE_ID,
    organisationReferenceNumber: '194620',
    organisationName: MOCK_ORG_METROLINE_NAME,
    recyclingObligationsMet: false,
    regulation43Met: false,
    percentageMet: 0,
    dateSubmitted: null
  },
  {
    id: null,
    organisationId: 'c7b6a5d4-e3f2-1098-abcd-ed7654321098',
    organisationReferenceNumber: 'No data',
    organisationName: 'No data',
    recyclingObligationsMet: false,
    regulation43Met: false,
    percentageMet: 0,
    dateSubmitted: null
  }
]

export const mockListByTab = {
  pending: mockPendingItems,
  accepted: mockAcceptedItems,
  'not-submitted': mockNotSubmittedItems
}

export const mockListByOrganisationType = {
  'direct-producers': mockListByTab,
  'compliance-schemes': {
    pending: mockComplianceSchemePendingItems,
    accepted: mockComplianceSchemeAcceptedItems,
    'not-submitted': mockComplianceSchemeNotSubmittedItems
  }
}

const mockObligationsAllMet = [
  {
    material: 'Aluminium',
    recyclingTarget: 1,
    tonnages: {
      material: 215,
      awaitingAcceptance: 0,
      accepted: 215,
      outstanding: 0,
      obligated: 215
    },
    status: 'Met'
  },
  {
    material: 'Glass',
    recyclingTarget: 1,
    tonnages: {
      material: 640,
      awaitingAcceptance: 0,
      accepted: 640,
      outstanding: 0,
      obligated: 640
    },
    status: 'Met'
  },
  {
    material: 'PaperBoardFibre',
    recyclingTarget: 1,
    tonnages: {
      material: 870,
      awaitingAcceptance: 0,
      accepted: 870,
      outstanding: 0,
      obligated: 870
    },
    status: 'Met'
  },
  {
    material: 'Plastic',
    recyclingTarget: 1,
    tonnages: {
      material: 1740,
      awaitingAcceptance: 0,
      accepted: 1740,
      outstanding: 0,
      obligated: 1740
    },
    status: 'Met'
  },
  {
    material: 'Steel',
    recyclingTarget: 1,
    tonnages: {
      material: 365,
      awaitingAcceptance: 0,
      accepted: 365,
      outstanding: 0,
      obligated: 365
    },
    status: 'Met'
  },
  {
    material: 'Wood',
    recyclingTarget: 1,
    tonnages: {
      material: 80,
      awaitingAcceptance: 0,
      accepted: 80,
      outstanding: 0,
      obligated: 80
    },
    status: 'Met'
  },
  {
    material: 'GlassRemelt',
    recyclingTarget: 1,
    tonnages: {
      material: 420,
      awaitingAcceptance: 0,
      accepted: 420,
      outstanding: 0,
      obligated: 420
    },
    status: 'Met'
  },
  {
    material: 'RemainingGlass',
    recyclingTarget: 1,
    tonnages: {
      material: 220,
      awaitingAcceptance: 0,
      accepted: 220,
      outstanding: 0,
      obligated: 220
    },
    status: 'Met'
  }
]

const mockObligationsMixed = [
  {
    material: 'Aluminium',
    recyclingTarget: 1,
    tonnages: {
      material: 215,
      awaitingAcceptance: 0,
      accepted: 215,
      outstanding: 0,
      obligated: 215
    },
    status: 'Met'
  },
  {
    material: 'Glass',
    recyclingTarget: 1,
    tonnages: {
      material: 640,
      awaitingAcceptance: 40,
      accepted: 500,
      outstanding: 100,
      obligated: 640
    },
    status: 'NotMet'
  },
  {
    material: 'PaperBoardFibre',
    recyclingTarget: 1,
    tonnages: {
      material: 870,
      awaitingAcceptance: 0,
      accepted: 870,
      outstanding: 0,
      obligated: 870
    },
    status: 'Met'
  },
  {
    material: 'Plastic',
    recyclingTarget: 1,
    tonnages: {
      material: 1740,
      awaitingAcceptance: 120,
      accepted: 1500,
      outstanding: 120,
      obligated: 1740
    },
    status: 'NotMet'
  },
  {
    material: 'Steel',
    recyclingTarget: 1,
    tonnages: {
      material: 365,
      awaitingAcceptance: 0,
      accepted: 365,
      outstanding: 0,
      obligated: 365
    },
    status: 'Met'
  },
  {
    material: 'Wood',
    recyclingTarget: 1,
    tonnages: {
      material: null,
      awaitingAcceptance: null,
      accepted: null,
      outstanding: null,
      obligated: 80
    },
    status: 'NoDataYet'
  },
  {
    material: 'GlassRemelt',
    recyclingTarget: 1,
    tonnages: {
      material: 420,
      awaitingAcceptance: 20,
      accepted: 380,
      outstanding: 20,
      obligated: 420
    },
    status: 'NotMet'
  },
  {
    material: 'RemainingGlass',
    recyclingTarget: 1,
    tonnages: {
      material: null,
      awaitingAcceptance: null,
      accepted: null,
      outstanding: null,
      obligated: 220
    },
    status: 'NoDataYet'
  }
]

export const mockSubmittedAuditEntry = {
  user: {
    id: 'fa6d3a77-be37-4530-bf7f-7d552ef94170',
    email: 'user@example.com',
    name: 'Test User'
  },
  timestamp: '2026-07-02T16:12:48.816+00:00',
  action: MOCK_STATUS_SUBMITTED
}

export const mockComplianceSchemeSubmittedAuditEntry = {
  user: {
    id: 'b1c2d3e4-f5a6-7890-abcd-ef1234567890',
    email: 'jane.doe@ecopack.co.uk',
    name: 'Jane Doe'
  },
  timestamp: MOCK_CS_SUBMITTED_TIMESTAMP,
  action: MOCK_STATUS_SUBMITTED
}

const mockRegulator = {
  id: 'mock-regulator-1',
  name: 'James Walker',
  email: 'mock-regulator-1@example.test'
}

const mockOrganisationsById = {
  [MOCK_ORG_HOWCO_ID]: {
    id: MOCK_ORG_HOWCO_ID,
    name: MOCK_ORG_HOWCO_NAME,
    tradingName: null,
    businessCountry: MOCK_BUSINESS_COUNTRY,
    companiesHouseNumber: '12345678',
    address: {
      addressLine1: 'Registered Add Line 1',
      postcode: 'CB113DG',
      country: 'EN'
    },
    registrations: [
      {
        created: MOCK_REGISTRATION_TIMESTAMP,
        updated: MOCK_REGISTRATION_TIMESTAMP,
        status: MOCK_REGISTRATION_STATUS,
        type: 'LARGE_PRODUCER',
        registrationYear: 2026
      }
    ]
  },
  [MOCK_ORG_REDWOOD_ID]: {
    id: MOCK_ORG_REDWOOD_ID,
    name: MOCK_ORG_REDWOOD_NAME,
    tradingName: null,
    businessCountry: MOCK_BUSINESS_COUNTRY,
    companiesHouseNumber: '17121895',
    address: {
      addressLine1: 'Registered Add Line 1',
      postcode: 'CB113DG',
      country: 'EN'
    },
    registrations: [
      {
        created: MOCK_REGISTRATION_TIMESTAMP,
        updated: MOCK_REGISTRATION_TIMESTAMP,
        status: MOCK_REGISTRATION_STATUS,
        type: 'LARGE_PRODUCER',
        registrationYear: 2026
      }
    ]
  },
  [MOCK_ORG_FUTUREPACK_ID]: {
    id: MOCK_ORG_FUTUREPACK_ID,
    name: 'FuturePack Operators Ltd',
    tradingName: 'FuturePack Operators',
    businessCountry: MOCK_BUSINESS_COUNTRY,
    companiesHouseNumber: '87654321',
    address: {
      addressLine1: 'Scheme House',
      postcode: 'SW1A 1AA',
      country: 'EN'
    },
    registrations: [
      {
        created: MOCK_REGISTRATION_TIMESTAMP,
        updated: MOCK_REGISTRATION_TIMESTAMP,
        status: MOCK_REGISTRATION_STATUS,
        type: 'COMPLIANCE_SCHEME',
        registrationYear: 2026
      }
    ]
  },
  [MOCK_ORG_STERLING_ID]: {
    id: MOCK_ORG_STERLING_ID,
    name: MOCK_ORG_STERLING_NAME,
    tradingName: null,
    businessCountry: MOCK_BUSINESS_COUNTRY,
    companiesHouseNumber: '34921001',
    address: {
      addressLine1: '14 Mill Lane',
      postcode: 'LS1 4PL',
      country: 'EN'
    },
    registrations: [
      {
        created: MOCK_REGISTRATION_TIMESTAMP,
        updated: MOCK_REGISTRATION_TIMESTAMP,
        status: MOCK_REGISTRATION_STATUS,
        type: 'LARGE_PRODUCER',
        registrationYear: 2026
      }
    ]
  },
  [MOCK_ORG_PINNACLE_ID]: {
    id: MOCK_ORG_PINNACLE_ID,
    name: MOCK_ORG_PINNACLE_NAME,
    tradingName: null,
    businessCountry: MOCK_BUSINESS_COUNTRY,
    companiesHouseNumber: '51036002',
    address: {
      addressLine1: '7 Industrial Park',
      postcode: 'M1 2AB',
      country: 'EN'
    },
    registrations: [
      {
        created: MOCK_REGISTRATION_TIMESTAMP,
        updated: MOCK_REGISTRATION_TIMESTAMP,
        status: MOCK_REGISTRATION_STATUS,
        type: 'LARGE_PRODUCER',
        registrationYear: 2026
      }
    ]
  },
  [MOCK_ORG_MERIDIAN_ID]: {
    id: MOCK_ORG_MERIDIAN_ID,
    name: MOCK_ORG_MERIDIAN_NAME,
    tradingName: null,
    businessCountry: MOCK_BUSINESS_COUNTRY,
    companiesHouseNumber: '62147003',
    address: {
      addressLine1: '22 Commerce Road',
      postcode: 'B1 1BB',
      country: 'EN'
    },
    registrations: [
      {
        created: MOCK_REGISTRATION_TIMESTAMP,
        updated: MOCK_REGISTRATION_TIMESTAMP,
        status: MOCK_REGISTRATION_STATUS,
        type: 'LARGE_PRODUCER',
        registrationYear: 2026
      }
    ]
  },
  [MOCK_ORG_ECOPACK_ID]: {
    id: MOCK_ORG_ECOPACK_ID,
    name: MOCK_ORG_ECOPACK_NAME,
    tradingName: 'EcoPack Group',
    businessCountry: MOCK_BUSINESS_COUNTRY,
    companiesHouseNumber: '87654321',
    address: {
      addressLine1: 'EcoPack House',
      postcode: 'SW1A 1AA',
      country: 'EN'
    },
    registrations: [
      {
        created: MOCK_REGISTRATION_TIMESTAMP,
        updated: MOCK_REGISTRATION_TIMESTAMP,
        status: MOCK_REGISTRATION_STATUS,
        type: 'COMPLIANCE_SCHEME',
        registrationYear: 2026
      }
    ]
  },
  [MOCK_ORG_GREENCIRCLE_ID]: {
    id: MOCK_ORG_GREENCIRCLE_ID,
    name: MOCK_ORG_GREENCIRCLE_NAME,
    tradingName: MOCK_ORG_GREENCIRCLE_OPERATOR_NAME,
    businessCountry: MOCK_BUSINESS_COUNTRY,
    companiesHouseNumber: '77889900',
    address: {
      addressLine1: 'GreenCircle House',
      postcode: 'SW1A 1AA',
      country: 'EN'
    },
    registrations: [
      {
        created: MOCK_REGISTRATION_TIMESTAMP,
        updated: MOCK_REGISTRATION_TIMESTAMP,
        status: MOCK_REGISTRATION_STATUS,
        type: 'COMPLIANCE_SCHEME',
        registrationYear: 2026
      }
    ]
  },
  [MOCK_ORG_NATIONWIDE_ID]: {
    id: MOCK_ORG_NATIONWIDE_ID,
    name: MOCK_ORG_NATIONWIDE_NAME,
    tradingName: MOCK_ORG_NATIONWIDE_OPERATOR_NAME,
    businessCountry: MOCK_BUSINESS_COUNTRY,
    companiesHouseNumber: '87654321',
    address: {
      addressLine1: 'Nationwide House',
      postcode: 'SW1A 1AA',
      country: 'EN'
    },
    registrations: [
      {
        created: MOCK_REGISTRATION_TIMESTAMP,
        updated: MOCK_REGISTRATION_TIMESTAMP,
        status: MOCK_REGISTRATION_STATUS,
        type: 'COMPLIANCE_SCHEME',
        registrationYear: 2026
      }
    ]
  },
  [MOCK_ORG_RIVERSIDE_ID]: {
    id: MOCK_ORG_RIVERSIDE_ID,
    name: MOCK_ORG_RIVERSIDE_NAME,
    tradingName: MOCK_ORG_RIVERSIDE_OPERATOR_NAME,
    businessCountry: MOCK_BUSINESS_COUNTRY,
    companiesHouseNumber: '55221199',
    address: {
      addressLine1: 'Riverside House',
      postcode: 'SW1A 1AA',
      country: 'EN'
    },
    registrations: [
      {
        created: MOCK_REGISTRATION_TIMESTAMP,
        updated: MOCK_REGISTRATION_TIMESTAMP,
        status: MOCK_REGISTRATION_STATUS,
        type: 'COMPLIANCE_SCHEME',
        registrationYear: 2026
      }
    ]
  }
}

export const mockAccountOrganisationsByExternalId = {
  [MOCK_ORG_REDWOOD_ID]: {
    externalId: MOCK_ORG_REDWOOD_ID,
    name: MOCK_ORG_REDWOOD_NAME,
    referenceNumber: '518293'
  },
  [MOCK_ORG_COASTAL_ID]: {
    externalId: MOCK_ORG_COASTAL_ID,
    name: MOCK_ORG_COASTAL_NAME,
    referenceNumber: '627148'
  },
  [MOCK_ORG_FUTUREPACK_ID]: {
    externalId: MOCK_ORG_FUTUREPACK_ID,
    name: MOCK_ORG_FUTUREPACK_NAME,
    referenceNumber: '183551'
  },
  [MOCK_ORG_METROLINE_ID]: {
    externalId: MOCK_ORG_METROLINE_ID,
    name: MOCK_ORG_METROLINE_NAME,
    referenceNumber: '194620'
  },
  [MOCK_ORG_STERLING_ID]: {
    externalId: MOCK_ORG_STERLING_ID,
    name: MOCK_ORG_STERLING_NAME,
    referenceNumber: MOCK_REF_STERLING
  },
  [MOCK_ORG_PINNACLE_ID]: {
    externalId: MOCK_ORG_PINNACLE_ID,
    name: MOCK_ORG_PINNACLE_NAME,
    referenceNumber: MOCK_REF_PINNACLE
  },
  [MOCK_ORG_MERIDIAN_ID]: {
    externalId: MOCK_ORG_MERIDIAN_ID,
    name: MOCK_ORG_MERIDIAN_NAME,
    referenceNumber: MOCK_REF_MERIDIAN
  }
}

export function getMockAccountOrganisationByExternalId(organisationId) {
  return mockAccountOrganisationsByExternalId[organisationId] ?? null
}

export function getMockOrganisationById(organisationId) {
  return mockOrganisationsById[organisationId] ?? null
}

// Matches the raw API response shape from GET /organisations/{organisationId}/compliance-declarations/{id}
export const mockDetailData = {
  id: MOCK_DECL_HOWCO_ID,
  created: '2027-01-31T00:00:00Z',
  updated: '2027-01-31T00:00:00Z',
  status: MOCK_STATUS_SUBMITTED,
  organisation: {
    id: MOCK_ORG_HOWCO_ID,
    registrationType: 'DirectProducer',
    name: MOCK_ORG_HOWCO_NAME,
    complianceSchemeName: null,
    schemeOperatorName: null,
    referenceNumber: '101411',
    address: {},
    regulator: 'EA',
    regulatorEmail: 'ea@environment-agency.gov.uk',
    companiesHouseNumber: '12345678'
  },
  obligationYear: 2026,
  obligations: mockObligationsAllMet,
  obligationStatus: 'Met',
  declarationText: { text: 'I declare...', language: 'en' },
  submitterName: 'Catherine Morris',
  isRegulation43Compliant: true,
  audit: [mockSubmittedAuditEntry]
}

export const mockComplianceSchemeDetailData = {
  id: MOCK_DECL_CS_PENDING_ID,
  created: MOCK_CS_SUBMITTED_TIMESTAMP,
  updated: MOCK_CS_SUBMITTED_TIMESTAMP,
  status: MOCK_STATUS_SUBMITTED,
  organisation: {
    id: MOCK_ORG_ECOPACK_ID,
    registrationType: 'ComplianceScheme',
    name: null,
    complianceSchemeName: MOCK_ORG_ECOPACK_NAME,
    schemeOperatorName: MOCK_ORG_ECOPACK_OPERATOR_NAME,
    referenceNumber: '110234',
    address: {},
    regulator: 'EA',
    regulatorEmail: 'ea@environment-agency.gov.uk',
    companiesHouseNumber: '87654321'
  },
  obligationYear: 2026,
  obligations: mockObligationsAllMet,
  obligationStatus: 'Met',
  declarationText: {
    text: 'I declare on behalf of the scheme...',
    language: 'en'
  },
  submitterName: 'Jane Doe',
  isRegulation43Compliant: false,
  audit: [mockComplianceSchemeSubmittedAuditEntry]
}

export const mockComplianceSchemeAcceptedDetailData = {
  ...mockComplianceSchemeDetailData,
  obligationStatus: 'Met',
  id: MOCK_DECL_CS_ACCEPTED_ID,
  created: '2027-01-12T00:00:00Z',
  updated: '2027-01-12T12:05:00Z',
  status: MOCK_STATUS_ACCEPTED,
  organisation: {
    ...mockComplianceSchemeDetailData.organisation,
    id: MOCK_ORG_NATIONWIDE_ID,
    complianceSchemeName: MOCK_ORG_NATIONWIDE_NAME,
    schemeOperatorName: MOCK_ORG_NATIONWIDE_OPERATOR_NAME,
    referenceNumber: MOCK_REF_CS_NATIONWIDE
  },
  isRegulation43Compliant: true,
  audit: [
    mockComplianceSchemeSubmittedAuditEntry,
    {
      action: MOCK_STATUS_ACCEPTED,
      timestamp: '2027-01-12T12:05:00Z',
      user: mockRegulator
    }
  ]
}

export const mockDirectProducerAcceptedDetailData = {
  ...mockDetailData,
  obligationStatus: 'Met',
  id: MOCK_DECL_ACME_ID,
  created: '2027-01-15T00:00:00Z',
  updated: '2027-01-15T14:30:00Z',
  status: MOCK_STATUS_ACCEPTED,
  organisation: {
    ...mockDetailData.organisation,
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    name: 'Acme Compliance Co',
    referenceNumber: '309145'
  },
  audit: [
    mockSubmittedAuditEntry,
    {
      action: MOCK_STATUS_ACCEPTED,
      timestamp: '2027-01-15T14:30:00Z',
      user: mockRegulator
    }
  ]
}

export const mockDirectProducerAcceptedDetailDataSecondary = {
  ...mockDirectProducerAcceptedDetailData,
  id: MOCK_DECL_BLUESKY_ID,
  created: '2027-01-10T00:00:00Z',
  updated: '2027-01-10T00:00:00Z',
  organisation: {
    ...mockDirectProducerAcceptedDetailData.organisation,
    id: 'c1d2e3f4-a5b6-7890-abcd-ef1234567890',
    name: 'BlueSky Materials plc',
    referenceNumber: '412067'
  },
  obligations: mockObligationsMixed,
  obligationStatus: 'NotMet',
  isRegulation43Compliant: false
}

export const mockDirectProducerPendingNotMetDetailData = {
  ...mockDetailData,
  id: MOCK_DECL_GREENFIELD_ID,
  created: '2027-01-28T00:00:00Z',
  updated: '2027-01-28T00:00:00Z',
  status: MOCK_STATUS_SUBMITTED,
  organisation: {
    ...mockDetailData.organisation,
    id: MOCK_ORG_GREENFIELD_ID,
    name: MOCK_ORG_GREENFIELD_NAME,
    referenceNumber: MOCK_REF_GREENFIELD,
    companiesHouseNumber: '23456789'
  },
  obligations: mockObligationsMixed,
  obligationStatus: 'NotMet',
  submitterName: 'Priya Rao',
  isRegulation43Compliant: false
}

export const mockComplianceSchemePendingCompliantDetailData = {
  ...mockComplianceSchemeDetailData,
  id: MOCK_DECL_CS_PENDING_SECONDARY_ID,
  created: '2027-01-18T00:00:00Z',
  updated: '2027-01-18T00:00:00Z',
  status: MOCK_STATUS_SUBMITTED,
  organisation: {
    ...mockComplianceSchemeDetailData.organisation,
    id: MOCK_ORG_GREENCIRCLE_ID,
    complianceSchemeName: MOCK_ORG_GREENCIRCLE_NAME,
    schemeOperatorName: MOCK_ORG_GREENCIRCLE_OPERATOR_NAME,
    referenceNumber: MOCK_REF_CS_GREENCIRCLE,
    companiesHouseNumber: '77889900'
  },
  obligations: mockObligationsAllMet,
  obligationStatus: 'Met',
  submitterName: 'Aled Bevan',
  isRegulation43Compliant: true
}

export const mockComplianceSchemeAcceptedNotMetDetailData = {
  ...mockComplianceSchemeDetailData,
  id: MOCK_DECL_CS_ACCEPTED_SECONDARY_ID,
  created: '2027-01-08T00:00:00Z',
  updated: '2027-01-08T00:00:00Z',
  status: MOCK_STATUS_ACCEPTED,
  organisation: {
    ...mockComplianceSchemeDetailData.organisation,
    id: MOCK_ORG_RIVERSIDE_ID,
    complianceSchemeName: MOCK_ORG_RIVERSIDE_NAME,
    schemeOperatorName: MOCK_ORG_RIVERSIDE_OPERATOR_NAME,
    referenceNumber: MOCK_REF_CS_RIVERSIDE,
    companiesHouseNumber: '55221199'
  },
  obligations: mockObligationsMixed,
  obligationStatus: 'NotMet',
  submitterName: 'Hana Okonkwo',
  isRegulation43Compliant: false
}

export const mockQueriedDetailData = {
  ...mockDetailData,
  id: 'decl-queried',
  status: MOCK_STATUS_QUERIED,
  queryDetails: {
    queriedMaterials: 'Plastic, Steel',
    reason: 'Tonnage figures do not match submitted evidence.',
    dateQueried: '2026-03-17T00:00:00Z'
  }
}

export const mockComplianceSchemeQueriedDetailData = {
  ...mockComplianceSchemeDetailData,
  id: 'decl-cs-queried',
  status: MOCK_STATUS_QUERIED,
  queryDetails: {
    queriedMaterials: 'Plastic',
    reason: 'Scheme member totals require clarification.',
    dateQueried: '2026-03-15T00:00:00Z'
  }
}

export const mockDirectProducerCancelledDetailData = {
  ...mockDetailData,
  id: 'decl-dp-cancelled',
  status: MOCK_STATUS_CANCELLED,
  updated: '2026-03-10T09:15:00Z',
  organisation: {
    ...mockDetailData.organisation,
    id: MOCK_ORG_GREENFIELD_ID,
    name: MOCK_ORG_GREENFIELD_NAME,
    referenceNumber: MOCK_REF_GREENFIELD
  },
  audit: [
    mockSubmittedAuditEntry,
    {
      action: MOCK_STATUS_CANCELLED,
      timestamp: '2026-03-10T09:15:00Z',
      user: mockRegulator,
      reason: 'Submitted after the deadline.'
    }
  ]
}

export const mockCancelledDetailData = mockDirectProducerCancelledDetailData

export const mockNoObligationsDetailData = {
  ...mockDetailData,
  id: 'decl-no-obligations',
  organisation: {
    ...mockDetailData.organisation,
    id: MOCK_ORG_STERLING_ID,
    name: MOCK_ORG_STERLING_NAME,
    referenceNumber: MOCK_REF_STERLING
  },
  obligations: null,
  obligationStatus: null
}

export const mockEmptyObligationsDetailData = {
  ...mockDetailData,
  id: 'decl-empty-obligations',
  organisation: {
    ...mockDetailData.organisation,
    id: MOCK_ORG_PINNACLE_ID,
    name: MOCK_ORG_PINNACLE_NAME,
    referenceNumber: MOCK_REF_PINNACLE
  },
  obligations: [],
  obligationStatus: null
}

export const mockComplianceSchemeCancelledDetailData = {
  ...mockComplianceSchemeDetailData,
  id: 'decl-cs-cancelled',
  status: MOCK_STATUS_CANCELLED,
  updated: '2026-03-08T11:30:00Z',
  organisation: {
    ...mockComplianceSchemeDetailData.organisation,
    id: MOCK_ORG_GREENCIRCLE_ID,
    complianceSchemeName: MOCK_ORG_GREENCIRCLE_NAME,
    schemeOperatorName: MOCK_ORG_GREENCIRCLE_OPERATOR_NAME,
    referenceNumber: MOCK_REF_CS_GREENCIRCLE
  },
  audit: [
    mockComplianceSchemeSubmittedAuditEntry,
    {
      action: MOCK_STATUS_CANCELLED,
      timestamp: '2026-03-08T11:30:00Z',
      user: mockRegulator,
      reason: 'Incomplete member data submitted.'
    }
  ]
}

const mockCurrentYearAcceptedDeclaration = {
  ...mockDetailData,
  id: 'decl-101411-prev-accepted',
  created: MOCK_CURRENT_YEAR_ACCEPTED_TIMESTAMP,
  updated: MOCK_CURRENT_YEAR_ACCEPTED_TIMESTAMP,
  status: MOCK_STATUS_ACCEPTED,
  submitterName: 'Test Submitter A',
  audit: [
    {
      action: MOCK_STATUS_ACCEPTED,
      timestamp: MOCK_CURRENT_YEAR_ACCEPTED_TIMESTAMP,
      user: mockRegulator
    }
  ]
}

const mockCurrentYearCancelledDeclaration = {
  ...mockDetailData,
  id: 'decl-101411-prev-cancelled',
  created: MOCK_CURRENT_YEAR_CANCELLED_TIMESTAMP,
  updated: MOCK_CURRENT_YEAR_CANCELLED_TIMESTAMP,
  status: MOCK_STATUS_CANCELLED,
  submitterName: 'Test Submitter A',
  audit: [
    {
      action: MOCK_STATUS_CANCELLED,
      timestamp: MOCK_CURRENT_YEAR_CANCELLED_TIMESTAMP,
      user: mockRegulator,
      reason: 'Test cancellation reason'
    }
  ]
}

const mockComplianceSchemeCurrentYearAcceptedDeclaration = {
  ...mockComplianceSchemeDetailData,
  id: 'decl-cs-001-prev-accepted',
  created: MOCK_CS_CURRENT_YEAR_ACCEPTED_TIMESTAMP,
  updated: MOCK_CS_CURRENT_YEAR_ACCEPTED_TIMESTAMP,
  status: MOCK_STATUS_ACCEPTED,
  submitterName: 'Test Submitter B',
  audit: [
    {
      action: MOCK_STATUS_ACCEPTED,
      timestamp: MOCK_CS_CURRENT_YEAR_ACCEPTED_TIMESTAMP,
      user: { id: 'mock-regulator-2', email: 'mock-regulator-2@example.test' }
    }
  ]
}

const mockComplianceSchemeCurrentYearCancelledDeclaration = {
  ...mockComplianceSchemeDetailData,
  id: 'decl-cs-001-prev-cancelled',
  created: MOCK_CS_CURRENT_YEAR_CANCELLED_TIMESTAMP,
  updated: MOCK_CS_CURRENT_YEAR_CANCELLED_TIMESTAMP,
  status: MOCK_STATUS_CANCELLED,
  submitterName: 'Test Submitter B',
  audit: [
    {
      action: MOCK_STATUS_CANCELLED,
      timestamp: MOCK_CS_CURRENT_YEAR_CANCELLED_TIMESTAMP,
      user: { id: 'mock-regulator-2', email: 'mock-regulator-2@example.test' },
      reason: 'Tonnage discrepancy identified'
    }
  ]
}

const mockAcceptedOnlyDeclaration = {
  ...mockDetailData,
  id: 'decl-accepted-only',
  created: MOCK_ACCEPTED_ONLY_TIMESTAMP,
  updated: MOCK_ACCEPTED_ONLY_TIMESTAMP,
  status: MOCK_STATUS_ACCEPTED,
  submitterName: 'Test Submitter D',
  organisation: {
    ...mockDetailData.organisation,
    id: 'b0b1b2b3-b4b5-b6b7-b8b9-babbbcbdbebf',
    name: 'Hill Industries Ltd',
    referenceNumber: '702402'
  },
  audit: [
    {
      action: MOCK_STATUS_ACCEPTED,
      timestamp: MOCK_ACCEPTED_ONLY_TIMESTAMP,
      user: mockRegulator
    }
  ]
}

const mockCancelledOnlyDeclaration = {
  ...mockDetailData,
  id: 'decl-cancelled-only',
  created: MOCK_CANCELLED_ONLY_TIMESTAMP,
  updated: MOCK_CANCELLED_ONLY_TIMESTAMP,
  status: MOCK_STATUS_CANCELLED,
  submitterName: 'Test Submitter C',
  organisation: {
    ...mockDetailData.organisation,
    id: 'c0c1c2c3-c4c5-c6c7-c8c9-cacbcccdcecf',
    name: 'Riverdale Packaging Ltd',
    referenceNumber: '801501'
  },
  audit: [
    {
      action: MOCK_STATUS_CANCELLED,
      timestamp: MOCK_CANCELLED_ONLY_TIMESTAMP,
      user: mockRegulator,
      reason: 'Information could not be verified'
    }
  ]
}

const mockDeclarationsByOrgYear = {
  [`${MOCK_ORG_HOWCO_ID}:2026`]: [
    mockCurrentYearCancelledDeclaration,
    mockCurrentYearAcceptedDeclaration,
    mockDetailData
  ],
  [`${MOCK_ORG_ECOPACK_ID}:2026`]: [
    mockComplianceSchemeCurrentYearCancelledDeclaration,
    mockComplianceSchemeCurrentYearAcceptedDeclaration,
    mockComplianceSchemeDetailData
  ],
  'b0b1b2b3-b4b5-b6b7-b8b9-babbbcbdbebf:2026': [mockAcceptedOnlyDeclaration],
  'c0c1c2c3-c4c5-c6c7-c8c9-cacbcccdcecf:2026': [mockCancelledOnlyDeclaration]
}

export function getMockDeclarationsByOrgYear(organisationId, obligationYear) {
  if (organisationId == null || obligationYear == null) {
    return []
  }
  return mockDeclarationsByOrgYear[`${organisationId}:${obligationYear}`] ?? []
}

const mockDetailById = {
  [MOCK_DECL_HOWCO_ID]: mockDetailData,
  [MOCK_DECL_GREENFIELD_ID]: mockDirectProducerPendingNotMetDetailData,
  [MOCK_DECL_ACME_ID]: mockDirectProducerAcceptedDetailData,
  [MOCK_DECL_BLUESKY_ID]: mockDirectProducerAcceptedDetailDataSecondary,
  'decl-dp-cancelled': mockDirectProducerCancelledDetailData,
  'decl-queried': mockQueriedDetailData,
  'decl-cancelled': mockDirectProducerCancelledDetailData,
  [MOCK_DECL_CS_PENDING_ID]: mockComplianceSchemeDetailData,
  [MOCK_DECL_CS_PENDING_SECONDARY_ID]:
    mockComplianceSchemePendingCompliantDetailData,
  [MOCK_DECL_CS_ACCEPTED_ID]: mockComplianceSchemeAcceptedDetailData,
  [MOCK_DECL_CS_ACCEPTED_SECONDARY_ID]:
    mockComplianceSchemeAcceptedNotMetDetailData,
  'decl-cs-queried': mockComplianceSchemeQueriedDetailData,
  'decl-cs-cancelled': mockComplianceSchemeCancelledDetailData,
  'decl-accepted-only': mockAcceptedOnlyDeclaration,
  'decl-cancelled-only': mockCancelledOnlyDeclaration,
  'decl-no-obligations': mockNoObligationsDetailData,
  'decl-empty-obligations': mockEmptyObligationsDetailData
}

export function getMockDetailDataById(id) {
  if (mockDetailById[id]) {
    return mockDetailById[id]
  }

  const isComplianceScheme = [
    ...mockComplianceSchemePendingItems,
    ...mockComplianceSchemeAcceptedItems
  ].some((item) => item.id === id)
  const base = isComplianceScheme
    ? mockComplianceSchemeDetailData
    : mockDetailData
  return { ...base, id }
}

const mockObligationsAllZero = [
  'Aluminium',
  'Glass',
  'PaperBoardFibre',
  'Plastic',
  'Steel',
  'Wood',
  'GlassRemelt',
  'RemainingGlass'
].map((material) => ({
  material,
  recyclingTarget: 0,
  tonnages: {
    material: 0,
    awaitingAcceptance: 0,
    accepted: 0,
    outstanding: 0,
    obligated: 0
  },
  status: 'NoDataYet'
}))

const mockObligationDataByOrgId = {
  // Sterling Packaging Ltd — no obligations at all
  [MOCK_ORG_STERLING_ID]: { obligations: null },
  // Pinnacle Containers Ltd — empty obligations array
  [MOCK_ORG_PINNACLE_ID]: { obligations: [] },
  // Meridian Products Ltd — all obligation values are zero
  [MOCK_ORG_MERIDIAN_ID]: {
    obligations: mockObligationsAllZero
  }
}

export function getMockObligationData(organisationId) {
  return mockObligationDataByOrgId[organisationId] ?? mockObligationData
}

export const mockObligationData = {
  obligations: [
    {
      material: 'Aluminium',
      recyclingTarget: 1,
      tonnages: {
        material: 0,
        awaitingAcceptance: 0,
        accepted: 0,
        outstanding: 0,
        obligated: 215
      },
      status: 'NoDataYet'
    },
    {
      material: 'Glass',
      recyclingTarget: 1,
      tonnages: {
        material: 0,
        awaitingAcceptance: 0,
        accepted: 0,
        outstanding: 0,
        obligated: 0
      },
      status: 'NoDataYet'
    },
    {
      material: 'PaperBoardFibre',
      recyclingTarget: 1,
      tonnages: {
        material: 0,
        awaitingAcceptance: 0,
        accepted: 0,
        outstanding: 0,
        obligated: 870
      },
      status: 'NoDataYet'
    },
    {
      material: 'Plastic',
      recyclingTarget: 1,
      tonnages: {
        material: 0,
        awaitingAcceptance: 0,
        accepted: 0,
        outstanding: 0,
        obligated: 1740
      },
      status: 'NoDataYet'
    },
    {
      material: 'Steel',
      recyclingTarget: 1,
      tonnages: {
        material: 0,
        awaitingAcceptance: 0,
        accepted: 0,
        outstanding: 0,
        obligated: 365
      },
      status: 'NoDataYet'
    },
    {
      material: 'Wood',
      recyclingTarget: 1,
      tonnages: {
        material: 0,
        awaitingAcceptance: 0,
        accepted: 0,
        outstanding: 0,
        obligated: 80
      },
      status: 'NoDataYet'
    },
    {
      material: 'GlassRemelt',
      recyclingTarget: 1,
      tonnages: {
        material: 0,
        awaitingAcceptance: 0,
        accepted: 0,
        outstanding: 0,
        obligated: 0
      },
      status: 'NoDataYet'
    },
    {
      material: 'RemainingGlass',
      recyclingTarget: 1,
      tonnages: {
        material: 0,
        awaitingAcceptance: 0,
        accepted: 0,
        outstanding: 0,
        obligated: 0
      },
      status: 'NoDataYet'
    }
  ]
}
