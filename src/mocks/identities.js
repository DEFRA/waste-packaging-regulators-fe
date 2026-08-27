// Shared organisation identity — the ids, names, reference numbers and
// Companies House numbers used across all three backend mocks. Kept in one
// place so an organisation is described identically wherever it appears.

export const OBLIGATION_YEAR = 2026

export const DIRECT_PRODUCER = 'DirectProducer'
export const COMPLIANCE_SCHEME = 'ComplianceScheme'

export const MOCK_STATUS_SUBMITTED = 'Submitted'
export const MOCK_STATUS_ACCEPTED = 'Accepted'
export const MOCK_STATUS_CANCELLED = 'Cancelled'
export const MOCK_STATUS_QUERIED = 'Queried'
export const MOCK_REGISTRATION_STATUS = 'REGISTERED'
export const MOCK_BUSINESS_COUNTRY = 'GB-ENG'
export const MOCK_REGISTRATION_TIMESTAMP = '2026-03-31T23:20:34.294+00:00'

export const MOCK_CS_SUBMITTED_TIMESTAMP = '2027-01-20T00:00:00Z'
export const MOCK_CURRENT_YEAR_ACCEPTED_TIMESTAMP = '2026-02-13T09:42:00Z'
export const MOCK_CURRENT_YEAR_CANCELLED_TIMESTAMP = '2026-05-22T14:18:00Z'
export const MOCK_CS_CURRENT_YEAR_ACCEPTED_TIMESTAMP = '2026-03-04T11:05:00Z'
export const MOCK_CS_CURRENT_YEAR_CANCELLED_TIMESTAMP = '2026-05-12T13:30:00Z'
export const MOCK_ACCEPTED_ONLY_TIMESTAMP = '2026-04-15T11:20:00Z'
export const MOCK_CANCELLED_ONLY_TIMESTAMP = '2026-04-08T10:00:00Z'

// Declaration ids. Prior-year history ids use the 24-char hex (MongoDB ObjectId)
// shape so link/detail navigation is exercised realistically.
export const MOCK_DECL_HOWCO_ID = 'decl-101411'
export const MOCK_DECL_HOWCO_PREV_ACCEPTED_ID = '6a3d04ae8c0a98574648b001'
export const MOCK_DECL_HOWCO_PREV_CANCELLED_ID = '6a3d04ae8c0a98574648b002'
export const MOCK_DECL_CS_PREV_ACCEPTED_ID = '7c5e16bf9d2c09785759d001'
export const MOCK_DECL_CS_PREV_CANCELLED_ID = '7c5e16bf9d2c09785759d002'

export const mockRegulatorName = 'EA'
export const mockRegulatorEmail = 'ea@environment-agency.gov.uk'

// One entry per organisation with all of its shared identity — the ids, names,
// reference numbers and Companies House numbers the three backend mocks describe
// an organisation by. Compliance schemes are resolved against the Account API by
// Companies House number, so every scheme carries a unique one.
export const orgs = {
  howco: {
    id: '497f6eca-6276-4993-bfeb-53cbbbba6f08',
    name: 'Howco Group plc',
    reference: '101411'
  },
  greenfield: {
    id: 'b1e2c3d4-e5f6-7890-abcd-ef1234567890',
    name: 'Greenfield Packaging Ltd',
    reference: '204872'
  },
  redwood: {
    id: 'd1e2f3a4-b5c6-7890-abcd-ef1234567890',
    name: 'Redwood Retail Group',
    reference: '518293'
  },
  greencircle: {
    id: 'f3a2b1c0-d9e8-47f6-a5b4-c3d2e1f0a9b8',
    name: 'GreenCircle Schemes',
    operatorName: 'GreenCircle Group',
    reference: '110987',
    companiesHouseNumber: 'CS_GENERATED_1107789'
  },
  futurepack: {
    id: 'a9b8c7d6-e5f4-3210-abcd-ef9876543210',
    name: 'FuturePack Compliance Scheme',
    operatorName: 'FuturePack Operators',
    reference: '183551',
    companiesHouseNumber: 'CS_GENERATED_1835510'
  },
  coastal: {
    id: 'e2f3a4b5-c6d7-8901-bcde-f23456789012',
    name: 'Coastal Bottling Co',
    reference: '627148'
  },
  metroline: {
    id: 'b8c7d6e5-f4a3-2109-abcd-ef8765432109',
    name: 'Metroline Compliance Scheme',
    operatorName: 'Metroline Waste Services',
    reference: '194620',
    companiesHouseNumber: 'CS_GENERATED_1946203'
  },
  southgate: {
    id: 'c7b6a5d4-e3f2-1098-abcd-ed7654321098',
    name: 'Southgate Recycling Alliance',
    operatorName: 'Southgate Environmental Group',
    reference: '210774',
    companiesHouseNumber: 'CS_GENERATED_2107748'
  },
  ecopack: {
    id: '923fa611-571c-4948-ab7d-fbb75e75ed65',
    name: 'EcoPack Compliance Ltd',
    operatorName: 'EcoPack Group',
    reference: '110234',
    companiesHouseNumber: 'CS_GENERATED_0923795'
  },
  sterling: {
    id: 'f3b4c5d6-e7a8-9012-cdef-123456789abc',
    name: 'Sterling Packaging Ltd',
    reference: '734921'
  },
  pinnacle: {
    id: 'a4b5c6d7-e8f9-0123-defa-234567890bcd',
    name: 'Pinnacle Containers Ltd',
    reference: '851036'
  },
  meridian: {
    id: 'b5c6d7e8-f9a0-1234-efab-345678901cde',
    name: 'Meridian Products Ltd',
    reference: '962147'
  },
  thornbury: {
    id: 'd4e5f6a7-b8c9-0123-defa-456789012345',
    name: 'Thornbury Packaging Ltd',
    reference: '318472'
  },
  nationwide: {
    id: 'e1d2c3b4-a596-4878-9abc-def012345678',
    name: 'Nationwide Packaging Scheme',
    operatorName: 'Nationwide Packaging Group',
    reference: '164447',
    companiesHouseNumber: 'CS_GENERATED_1644470'
  },
  riverside: {
    id: '6d9a1e77-1b3f-4c22-8a41-8f5c1e9d2b34',
    name: 'Riverside Compliance Partners',
    operatorName: 'Riverside Group',
    reference: '172908',
    companiesHouseNumber: 'CS_GENERATED_1729085'
  },
  kestrel: {
    id: 'a1b2c3d4-5e6f-7081-92a3-b4c5d6e7f809',
    name: 'Kestrel Compliance Scheme',
    operatorName: 'Kestrel Compliance Group',
    reference: '112263',
    companiesHouseNumber: 'CS_GENERATED_1122634'
  },
  larchwood: {
    id: 'b2c3d4e5-6f70-8192-a3b4-c5d6e7f8091a',
    name: 'Larchwood Compliance Scheme',
    operatorName: 'Larchwood Compliance Group',
    reference: '113374',
    companiesHouseNumber: 'CS_GENERATED_1133745'
  },
  ashcroft: {
    id: 'd41f7a2b-6c58-4e91-9f30-1a2b3c4d5e6f',
    name: 'Ashcroft Compliance Solutions',
    operatorName: 'Ashcroft Environmental Ltd',
    reference: '131882',
    companiesHouseNumber: 'CS_GENERATED_1318824'
  },
  bramble: {
    id: 'e52a8b3c-7d69-4fa2-8041-2b3c4d5e6f70',
    name: 'Bramble Recycling Scheme',
    operatorName: 'Bramble Waste Group',
    reference: '142995',
    companiesHouseNumber: 'CS_GENERATED_1429953'
  },
  caldera: {
    id: 'f63b9c4d-8e7a-40b3-9152-3c4d5e6f7081',
    name: 'Caldera Packaging Scheme',
    operatorName: 'Caldera Holdings Ltd',
    reference: '158043',
    companiesHouseNumber: 'CS_GENERATED_1580437'
  },
  dovetail: {
    id: 'a74c0d5e-9f8b-41c4-a263-4d5e6f708192',
    name: 'Dovetail Compliance Scheme',
    operatorName: 'Dovetail Services Ltd',
    reference: '169226',
    companiesHouseNumber: 'CS_GENERATED_1692268'
  },
  hill: {
    id: 'b0b1b2b3-b4b5-b6b7-b8b9-babbbcbdbebf',
    name: 'Hill Industries Ltd',
    reference: '702402'
  },
  riverdale: {
    id: 'c0c1c2c3-c4c5-c6c7-c8c9-cacbcccdcecf',
    name: 'Riverdale Packaging Ltd',
    reference: '801501'
  },
  acme: {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    name: 'Acme Compliance Co',
    reference: '309145'
  },
  bluesky: {
    id: 'c1d2e3f4-a5b6-7890-abcd-ef1234567890',
    name: 'BlueSky Materials plc',
    reference: '412067'
  },
  ashfield: {
    id: 'a5f1e2d3-c4b5-4697-8899-aabbccddeeff',
    name: 'Ashfield Distribution Ltd'
  },
  beacon: {
    id: 'be4c0091-1122-4334-9556-778899aabbcc',
    name: 'Beacon Compliance Scheme',
    operatorName: 'Beacon Group',
    companiesHouseNumber: 'CS_GENERATED_2244668'
  }
}
