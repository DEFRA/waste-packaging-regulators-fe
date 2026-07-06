// Mock data for certificates of compliance routes.
// Used when useMockApi=true and exported so tests can assert against the same values.

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
    id: 'decl-101411',
    organisationId: '497f6eca-6276-4993-bfeb-53cbbbba6f08',
    organisationReferenceNumber: '101411',
    organisationName: 'Howco Group plc',
    recyclingObligationsMet: true,
    percentageMet: 100,
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
    recyclingObligationsMet: false,
    regulation43Met: false,
    percentageMet: 89,
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
  },
  {
    id: null,
    organisationId: 'e2f3a4b5-c6d7-8901-bcde-f23456789012',
    organisationReferenceNumber: '627148',
    organisationName: 'Coastal Bottling Co',
    recyclingObligationsMet: false,
    percentageMet: 0,
    dateSubmitted: null
  }
]

export const mockComplianceSchemePendingItems = [
  {
    id: 'decl-cs-001',
    organisationId: '923fa611-571c-4948-ab7d-fbb75e75ed65',
    organisationReferenceNumber: 'CS-1001',
    organisationName: 'EcoPack Compliance Ltd',
    recyclingObligationsMet: true,
    regulation43Met: false,
    percentageMet: 100,
    dateSubmitted: '2027-01-20'
  },
  {
    id: 'decl-cs-002',
    organisationId: 'f3a2b1c0-d9e8-47f6-a5b4-c3d2e1f0a9b8',
    organisationReferenceNumber: 'CS-1002',
    organisationName: 'GreenCircle Schemes',
    recyclingObligationsMet: false,
    regulation43Met: true,
    percentageMet: 88,
    dateSubmitted: '2027-01-18'
  }
]

export const mockComplianceSchemeAcceptedItems = [
  {
    id: 'decl-cs-101',
    organisationId: 'e1d2c3b4-a596-4878-9abc-def012345678',
    organisationReferenceNumber: 'CS-2001',
    organisationName: 'Nationwide Packaging Scheme',
    recyclingObligationsMet: true,
    regulation43Met: true,
    percentageMet: 105,
    dateSubmitted: '2027-01-12'
  },
  {
    id: 'decl-cs-102',
    organisationId: '6d9a1e77-1b3f-4c22-8a41-8f5c1e9d2b34',
    organisationReferenceNumber: 'CS-2002',
    organisationName: 'Riverside Compliance Partners',
    recyclingObligationsMet: false,
    regulation43Met: false,
    percentageMet: 92,
    dateSubmitted: '2027-01-08'
  }
]

export const mockComplianceSchemeNotSubmittedItems = [
  {
    id: null,
    organisationId: 'a9b8c7d6-e5f4-3210-abcd-ef9876543210',
    organisationReferenceNumber: 'CS-3001',
    organisationName: 'FuturePack Operators',
    recyclingObligationsMet: false,
    regulation43Met: false,
    percentageMet: 0,
    dateSubmitted: null
  },
  {
    id: null,
    organisationId: 'b8c7d6e5-f4a3-2109-abcd-ef8765432109',
    organisationReferenceNumber: 'CS-3002',
    organisationName: 'Metroline Waste Services',
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
    // Mock fixture contact fields for local UI testing
    companiesHouseNumber: '12345678',
    nameOnAccount: 'John Smith',
    contactEmailAddress: 'john.smith@howco.co.uk',
    contactPhoneNumber: '01234 567890'
  },
  obligationYear: 2026,
  obligations: mockObligationsAllMet,
  obligationStatus: 'Met',
  declarationText: { text: 'I declare...', language: 'en' },
  submitterName: 'Catherine Morris',
  isRegulation43Compliant: true,
  audit: []
}

export const mockComplianceSchemeDetailData = {
  id: 'decl-cs-001',
  created: '2027-01-20T00:00:00Z',
  updated: '2027-01-20T00:00:00Z',
  status: 'Submitted',
  organisation: {
    id: '923fa611-571c-4948-ab7d-fbb75e75ed65',
    registrationType: 'ComplianceScheme',
    name: null,
    complianceSchemeName: 'EcoPack Compliance Ltd',
    schemeOperatorName: 'EcoPack Group',
    referenceNumber: 'CS-1001',
    address: {},
    regulator: 'EA',
    regulatorEmail: 'ea@environment-agency.gov.uk',
    companiesHouseNumber: '87654321',
    nameOnAccount: 'Jane Doe',
    contactEmailAddress: 'jane.doe@ecopack.co.uk',
    contactPhoneNumber: '01987 654321'
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
  audit: []
}

export const mockComplianceSchemeAcceptedDetailData = {
  ...mockComplianceSchemeDetailData,
  obligationStatus: 'Met',
  id: 'decl-cs-101',
  created: '2027-01-12T00:00:00Z',
  updated: '2027-01-12T00:00:00Z',
  status: 'Accepted',
  organisation: {
    ...mockComplianceSchemeDetailData.organisation,
    id: 'e1d2c3b4-a596-4878-9abc-def012345678',
    complianceSchemeName: 'Nationwide Packaging Scheme',
    schemeOperatorName: 'Nationwide Packaging Group',
    referenceNumber: 'CS-2001'
  },
  isRegulation43Compliant: true
}

export const mockDirectProducerAcceptedDetailData = {
  ...mockDetailData,
  obligationStatus: 'Met',
  id: 'decl-309145',
  created: '2027-01-15T00:00:00Z',
  updated: '2027-01-15T00:00:00Z',
  status: 'Accepted',
  organisation: {
    ...mockDetailData.organisation,
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    name: 'Acme Compliance Co',
    referenceNumber: '309145'
  }
}

export const mockDirectProducerAcceptedDetailDataSecondary = {
  ...mockDirectProducerAcceptedDetailData,
  id: 'decl-412067',
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
  id: 'decl-204872',
  created: '2027-01-28T00:00:00Z',
  updated: '2027-01-28T00:00:00Z',
  status: 'Submitted',
  organisation: {
    ...mockDetailData.organisation,
    id: 'b1e2c3d4-e5f6-7890-abcd-ef1234567890',
    name: 'Greenfield Packaging Ltd',
    referenceNumber: '204872',
    companiesHouseNumber: '23456789',
    nameOnAccount: 'Priya Rao',
    contactEmailAddress: 'priya.rao@greenfield.co.uk',
    contactPhoneNumber: '01234 111222'
  },
  obligations: mockObligationsMixed,
  obligationStatus: 'NotMet',
  submitterName: 'Priya Rao',
  isRegulation43Compliant: false
}

export const mockComplianceSchemePendingNotMetDetailData = {
  ...mockComplianceSchemeDetailData,
  id: 'decl-cs-002',
  created: '2027-01-18T00:00:00Z',
  updated: '2027-01-18T00:00:00Z',
  status: 'Submitted',
  organisation: {
    ...mockComplianceSchemeDetailData.organisation,
    id: 'f3a2b1c0-d9e8-47f6-a5b4-c3d2e1f0a9b8',
    complianceSchemeName: 'GreenCircle Schemes',
    schemeOperatorName: 'GreenCircle Group',
    referenceNumber: 'CS-1002',
    companiesHouseNumber: '77889900',
    nameOnAccount: 'Aled Bevan',
    contactEmailAddress: 'aled.bevan@greencircle.co.uk',
    contactPhoneNumber: '01987 333444'
  },
  obligations: mockObligationsMixed,
  obligationStatus: 'NotMet',
  submitterName: 'Aled Bevan',
  isRegulation43Compliant: true
}

export const mockComplianceSchemeAcceptedNotMetDetailData = {
  ...mockComplianceSchemeDetailData,
  id: 'decl-cs-102',
  created: '2027-01-08T00:00:00Z',
  updated: '2027-01-08T00:00:00Z',
  status: 'Accepted',
  organisation: {
    ...mockComplianceSchemeDetailData.organisation,
    id: '6d9a1e77-1b3f-4c22-8a41-8f5c1e9d2b34',
    complianceSchemeName: 'Riverside Compliance Partners',
    schemeOperatorName: 'Riverside Group',
    referenceNumber: 'CS-2002',
    companiesHouseNumber: '55221199',
    nameOnAccount: 'Hana Okonkwo',
    contactEmailAddress: 'hana.okonkwo@riverside.co.uk',
    contactPhoneNumber: '02011 445566'
  },
  obligations: mockObligationsMixed,
  obligationStatus: 'NotMet',
  submitterName: 'Hana Okonkwo',
  isRegulation43Compliant: false
}

export const mockQueriedDetailData = {
  ...mockDetailData,
  id: 'decl-queried',
  status: 'Queried',
  queryDetails: {
    queriedMaterials: 'Plastic, Steel',
    reason: 'Tonnage figures do not match submitted evidence.',
    dateQueried: '2026-03-17T00:00:00Z'
  }
}

export const mockComplianceSchemeQueriedDetailData = {
  ...mockComplianceSchemeDetailData,
  id: 'decl-cs-queried',
  status: 'Queried',
  queryDetails: {
    queriedMaterials: 'Plastic',
    reason: 'Scheme member totals require clarification.',
    dateQueried: '2026-03-15T00:00:00Z'
  }
}

export const mockDirectProducerCancelledDetailData = {
  ...mockDetailData,
  id: 'decl-dp-cancelled',
  status: 'Cancelled',
  organisation: {
    ...mockDetailData.organisation,
    id: 'b1e2c3d4-e5f6-7890-abcd-ef1234567890',
    name: 'Greenfield Packaging Ltd',
    referenceNumber: '204872'
  },
  cancellationDetails: {
    reason: 'Submitted after the deadline.',
    resubmissionRequested: true,
    dateCancelled: '2026-03-10T00:00:00Z'
  }
}

export const mockCancelledDetailData = mockDirectProducerCancelledDetailData

export const mockComplianceSchemeCancelledDetailData = {
  ...mockComplianceSchemeDetailData,
  id: 'decl-cs-cancelled',
  status: 'Cancelled',
  organisation: {
    ...mockComplianceSchemeDetailData.organisation,
    id: 'f3a2b1c0-d9e8-47f6-a5b4-c3d2e1f0a9b8',
    complianceSchemeName: 'GreenCircle Schemes',
    schemeOperatorName: 'GreenCircle Group',
    referenceNumber: 'CS-1002'
  },
  cancellationDetails: {
    reason: 'Incomplete member data submitted.',
    resubmissionRequested: false,
    dateCancelled: '2026-03-08T00:00:00Z'
  }
}

const mockRegulator = {
  id: 'mock-regulator-1',
  email: 'mock-regulator-1@example.test'
}

const mockCurrentYearAcceptedDeclaration = {
  ...mockDetailData,
  id: 'decl-101411-prev-accepted',
  created: '2026-02-13T09:42:00Z',
  updated: '2026-02-13T09:42:00Z',
  status: 'Accepted',
  submitterName: 'Test Submitter A',
  audit: [
    {
      action: 'Accepted',
      timestamp: '2026-02-13T09:42:00Z',
      user: mockRegulator
    }
  ]
}

const mockCurrentYearCancelledDeclaration = {
  ...mockDetailData,
  id: 'decl-101411-prev-cancelled',
  created: '2026-05-22T14:18:00Z',
  updated: '2026-05-22T14:18:00Z',
  status: 'Cancelled',
  submitterName: 'Test Submitter A',
  audit: [
    {
      action: 'Cancelled',
      timestamp: '2026-05-22T14:18:00Z',
      user: mockRegulator,
      reason: 'Test cancellation reason'
    }
  ]
}

const mockComplianceSchemeCurrentYearAcceptedDeclaration = {
  ...mockComplianceSchemeDetailData,
  id: 'decl-cs-001-prev-accepted',
  created: '2026-03-04T11:05:00Z',
  updated: '2026-03-04T11:05:00Z',
  status: 'Accepted',
  submitterName: 'Test Submitter B',
  audit: [
    {
      action: 'Accepted',
      timestamp: '2026-03-04T11:05:00Z',
      user: { id: 'mock-regulator-2', email: 'mock-regulator-2@example.test' }
    }
  ]
}

const mockComplianceSchemeCurrentYearCancelledDeclaration = {
  ...mockComplianceSchemeDetailData,
  id: 'decl-cs-001-prev-cancelled',
  created: '2026-05-12T13:30:00Z',
  updated: '2026-05-12T13:30:00Z',
  status: 'Cancelled',
  submitterName: 'Test Submitter B',
  audit: [
    {
      action: 'Cancelled',
      timestamp: '2026-05-12T13:30:00Z',
      user: { id: 'mock-regulator-2', email: 'mock-regulator-2@example.test' },
      reason: 'Tonnage discrepancy identified'
    }
  ]
}

const mockAcceptedOnlyDeclaration = {
  ...mockDetailData,
  id: 'decl-accepted-only',
  created: '2026-04-15T11:20:00Z',
  updated: '2026-04-15T11:20:00Z',
  status: 'Accepted',
  submitterName: 'Test Submitter D',
  organisation: {
    ...mockDetailData.organisation,
    id: 'b0b1b2b3-b4b5-b6b7-b8b9-babbbcbdbebf',
    name: 'Hill Industries Ltd',
    referenceNumber: '702402'
  },
  audit: [
    {
      action: 'Accepted',
      timestamp: '2026-04-15T11:20:00Z',
      user: mockRegulator
    }
  ]
}

const mockCancelledOnlyDeclaration = {
  ...mockDetailData,
  id: 'decl-cancelled-only',
  created: '2026-04-08T10:00:00Z',
  updated: '2026-04-08T10:00:00Z',
  status: 'Cancelled',
  submitterName: 'Test Submitter C',
  organisation: {
    ...mockDetailData.organisation,
    id: 'c0c1c2c3-c4c5-c6c7-c8c9-cacbcccdcecf',
    name: 'Riverdale Packaging Ltd',
    referenceNumber: '801501'
  },
  audit: [
    {
      action: 'Cancelled',
      timestamp: '2026-04-08T10:00:00Z',
      user: mockRegulator,
      reason: 'Information could not be verified'
    }
  ]
}

const mockDeclarationsByOrgYear = {
  '497f6eca-6276-4993-bfeb-53cbbbba6f08:2026': [
    mockCurrentYearCancelledDeclaration,
    mockCurrentYearAcceptedDeclaration,
    mockDetailData
  ],
  '923fa611-571c-4948-ab7d-fbb75e75ed65:2026': [
    mockComplianceSchemeCurrentYearCancelledDeclaration,
    mockComplianceSchemeCurrentYearAcceptedDeclaration,
    mockComplianceSchemeDetailData
  ],
  'b0b1b2b3-b4b5-b6b7-b8b9-babbbcbdbebf:2026': [mockAcceptedOnlyDeclaration],
  'c0c1c2c3-c4c5-c6c7-c8c9-cacbcccdcecf:2026': [mockCancelledOnlyDeclaration]
}

export function getMockDeclarationsByOrgYear(organisationId, obligationYear) {
  if (organisationId == null || obligationYear == null) return []
  return mockDeclarationsByOrgYear[`${organisationId}:${obligationYear}`] ?? []
}

const mockDetailById = {
  'decl-101411': mockDetailData,
  'decl-204872': mockDirectProducerPendingNotMetDetailData,
  'decl-309145': mockDirectProducerAcceptedDetailData,
  'decl-412067': mockDirectProducerAcceptedDetailDataSecondary,
  'decl-dp-cancelled': mockDirectProducerCancelledDetailData,
  'decl-queried': mockQueriedDetailData,
  'decl-cancelled': mockDirectProducerCancelledDetailData,
  'decl-cs-001': mockComplianceSchemeDetailData,
  'decl-cs-002': mockComplianceSchemePendingNotMetDetailData,
  'decl-cs-101': mockComplianceSchemeAcceptedDetailData,
  'decl-cs-102': mockComplianceSchemeAcceptedNotMetDetailData,
  'decl-cs-queried': mockComplianceSchemeQueriedDetailData,
  'decl-cs-cancelled': mockComplianceSchemeCancelledDetailData,
  'decl-accepted-only': mockAcceptedOnlyDeclaration,
  'decl-cancelled-only': mockCancelledOnlyDeclaration
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
