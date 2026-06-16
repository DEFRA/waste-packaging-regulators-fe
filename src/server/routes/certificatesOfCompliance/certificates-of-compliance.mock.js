// Mock data for certificates of compliance routes.
// Used when useMockApi=true and exported so tests can assert against the same values.

export const mockSummary = {
  complianceYear: '2026',
  totalPending: 42,
  totalAccepted: 156,
  totalNotSubmitted: 8
}

export const mockPendingItems = [
  {
    id: 'decl-101411',
    organisationId: '497f6eca-6276-4993-bfeb-53cbbbba6f08',
    organisationReferenceNumber: '101411',
    organisationName: 'Howco Group plc',
    recyclingObligationsMet: false,
    percentageMet: 97,
    dateSubmitted: '2027-01-31'
  },
  {
    id: 'decl-204872',
    organisationId: 'b1e2c3d4-e5f6-7890-abcd-ef1234567890',
    organisationReferenceNumber: '204872',
    organisationName: 'Greenfield Packaging Ltd',
    recyclingObligationsMet: false,
    percentageMet: 84,
    dateSubmitted: '2027-01-28'
  }
]

export const mockAcceptedItems = [
  {
    id: 'decl-309145',
    organisationId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    organisationReferenceNumber: '309145',
    organisationName: 'Acme Compliance Co',
    recyclingObligationsMet: true,
    regulation43Met: true,
    percentageMet: 112,
    dateSubmitted: '2027-01-15'
  },
  {
    id: 'decl-412067',
    organisationId: 'c1d2e3f4-a5b6-7890-abcd-ef1234567890',
    organisationReferenceNumber: '412067',
    organisationName: 'BlueSky Materials plc',
    recyclingObligationsMet: true,
    regulation43Met: false,
    percentageMet: 103,
    dateSubmitted: '2027-01-10'
  }
]

export const mockNotSubmittedItems = [
  {
    id: null,
    organisationId: 'd1e2f3a4-b5c6-7890-abcd-ef1234567890',
    organisationReferenceNumber: '518293',
    organisationName: 'Redwood Retail Group',
    recyclingObligationsMet: false,
    percentageMet: 0,
    dateSubmitted: null
  }
]

export const mockCompliancePendingItems = [
  {
    id: 'decl-501822',
    organisationId: '7c2a4f3d-9e8b-4d2a-9a1c-2b3a8e1f5d4a',
    organisationReferenceNumber: '501822',
    organisationName: 'Valpak Limited',
    recyclingObligationsMet: false,
    percentageMet: 91,
    dateSubmitted: '2027-01-29'
  },
  {
    id: 'decl-507314',
    organisationId: '8d3b5e4c-af7c-5e3b-ab2d-3c4b9f2e6d5b',
    organisationReferenceNumber: '507314',
    organisationName: 'Veolia Compliance Scheme',
    recyclingObligationsMet: false,
    percentageMet: 88,
    dateSubmitted: '2027-01-26'
  }
]

export const mockComplianceAcceptedItems = [
  {
    id: 'decl-512908',
    organisationId: '9e4c6f5d-bf8d-6f4c-bc3e-4d5cae3f7e6c',
    organisationReferenceNumber: '512908',
    organisationName: 'Biffpack Compliance Scheme',
    recyclingObligationsMet: true,
    regulation43Met: true,
    percentageMet: 108,
    dateSubmitted: '2027-01-12'
  },
  {
    id: 'decl-516043',
    organisationId: 'bf6e8f7d-d1af-8e6e-de50-6f7ecf509f8e',
    organisationReferenceNumber: '516043',
    organisationName: 'Ecosurety Compliance Scheme',
    recyclingObligationsMet: true,
    regulation43Met: false,
    percentageMet: 101,
    dateSubmitted: '2027-01-08'
  }
]

export const mockComplianceNotSubmittedItems = [
  {
    id: null,
    organisationId: 'af5d7e6c-c09e-7d5d-cd4f-5e6dbe4f8f7d',
    organisationReferenceNumber: '518440',
    organisationName: 'Wastepack Compliance Scheme',
    recyclingObligationsMet: false,
    percentageMet: 0,
    dateSubmitted: null
  }
]

export const mockListByTypeAndTab = {
  'direct-producers': {
    pending: mockPendingItems,
    accepted: mockAcceptedItems,
    'not-submitted': mockNotSubmittedItems
  },
  'compliance-schemes': {
    pending: mockCompliancePendingItems,
    accepted: mockComplianceAcceptedItems,
    'not-submitted': mockComplianceNotSubmittedItems
  }
}

// Matches the raw API response shape from GET /organisations/{organisationId}/compliance-declarations/{id}
export const mockDetailData = {
  id: 'decl-101411',
  created: '2027-01-31T00:00:00Z',
  updated: '2027-01-31T00:00:00Z',
  status: 'Submitted',
  organisation: {
    id: '497f6eca-6276-4993-bfeb-53cbbbba6f08',
    registrationType: 'DirectProducer',
    name: 'Howco Group plc',
    complianceSchemeName: null,
    schemeOperatorName: null,
    referenceNumber: '101411',
    address: {},
    regulator: 'EA',
    regulatorEmail: 'ea@environment-agency.gov.uk',
    // TODO: these will come from a separate organisations API call
    companiesHouseNumber: '12345678',
    nameOnAccount: 'John Smith',
    contactEmailAddress: 'john.smith@howco.co.uk',
    contactPhoneNumber: '01234 567890'
  },
  obligationYear: 2026,
  obligations: [
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
        material: 0,
        awaitingAcceptance: 0,
        accepted: 0,
        outstanding: 0,
        obligated: 0
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
        material: 0,
        awaitingAcceptance: 0,
        accepted: 0,
        outstanding: 0,
        obligated: 0
      },
      status: 'Met'
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
      status: 'Met'
    }
  ],
  obligationStatus: 'Met',
  declarationText: { text: 'I declare...', language: 'en' },
  submitterName: 'Catherine Morris',
  isRegulation43Compliant: true,
  audit: []
}

export const mockComplianceDetailData = {
  ...mockDetailData,
  id: 'decl-501822',
  organisation: {
    ...mockDetailData.organisation,
    id: '7c2a4f3d-9e8b-4d2a-9a1c-2b3a8e1f5d4a',
    registrationType: 'ComplianceScheme',
    name: null,
    complianceSchemeName: 'Valpak Limited',
    schemeOperatorName: 'Valpak Operator Ltd',
    referenceNumber: '501822',
    nameOnAccount: 'Priya Patel',
    contactEmailAddress: 'priya.patel@valpak.co.uk'
  },
  submitterName: 'Priya Patel'
}

const complianceSchemeDeclarationIds = new Set(
  [...mockCompliancePendingItems, ...mockComplianceAcceptedItems]
    .map((item) => item.id)
    .filter(Boolean)
)

export function mockDetailFor(id) {
  return complianceSchemeDeclarationIds.has(id)
    ? mockComplianceDetailData
    : mockDetailData
}
