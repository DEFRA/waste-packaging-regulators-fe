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
    id: '101411',
    organisationName: 'Howco Group plc',
    recyclingObligationsMet: false,
    percentageMet: 97,
    dateSubmitted: '2027-01-31'
  },
  {
    id: '204872',
    organisationName: 'Greenfield Packaging Ltd',
    recyclingObligationsMet: false,
    percentageMet: 84,
    dateSubmitted: '2027-01-28'
  }
]

export const mockAcceptedItems = [
  {
    id: '309145',
    organisationName: 'Acme Compliance Co',
    recyclingObligationsMet: true,
    regulation43Met: true,
    percentageMet: 112,
    dateSubmitted: '2027-01-15'
  },
  {
    id: '412067',
    organisationName: 'BlueSky Materials plc',
    recyclingObligationsMet: true,
    regulation43Met: false,
    percentageMet: 103,
    dateSubmitted: '2027-01-10'
  }
]

export const mockNotSubmittedItems = [
  {
    id: '518293',
    organisationName: 'Redwood Retail Group',
    recyclingObligationsMet: false,
    percentageMet: 0,
    dateSubmitted: null
  }
]

export const mockListByTab = {
  pending: mockPendingItems,
  accepted: mockAcceptedItems,
  'not-submitted': mockNotSubmittedItems
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
    { material: 'Aluminium', recyclingTarget: 1, tonnages: { material: 215, awaitingAcceptance: 0, accepted: 215, outstanding: 0, obligated: 215 }, status: 'Met' },
    { material: 'Glass', recyclingTarget: 1, tonnages: { material: 0, awaitingAcceptance: 0, accepted: 0, outstanding: 0, obligated: 0 }, status: 'Met' },
    { material: 'PaperBoardFibre', recyclingTarget: 1, tonnages: { material: 870, awaitingAcceptance: 0, accepted: 870, outstanding: 0, obligated: 870 }, status: 'Met' },
    { material: 'Plastic', recyclingTarget: 1, tonnages: { material: 1740, awaitingAcceptance: 0, accepted: 1740, outstanding: 0, obligated: 1740 }, status: 'Met' },
    { material: 'Steel', recyclingTarget: 1, tonnages: { material: 365, awaitingAcceptance: 0, accepted: 365, outstanding: 0, obligated: 365 }, status: 'Met' },
    { material: 'Wood', recyclingTarget: 1, tonnages: { material: 80, awaitingAcceptance: 0, accepted: 80, outstanding: 0, obligated: 80 }, status: 'Met' },
    { material: 'GlassRemelt', recyclingTarget: 1, tonnages: { material: 0, awaitingAcceptance: 0, accepted: 0, outstanding: 0, obligated: 0 }, status: 'Met' },
    { material: 'RemainingGlass', recyclingTarget: 1, tonnages: { material: 0, awaitingAcceptance: 0, accepted: 0, outstanding: 0, obligated: 0 }, status: 'Met' }
  ],
  obligationStatus: 'Met',
  declarationText: { text: 'I declare...', language: 'en' },
  submitterName: 'Catherine Morris',
  isRegulation43Compliant: true,
  audit: []
}
