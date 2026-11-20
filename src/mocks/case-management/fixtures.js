const submittedAt = '2026-11-10T10:30:00.000Z'

export const caseManagementRecords = [
  {
    id: '01JBR0UNASSIGNEDDP01',
    caseType: 'CSoC',
    stateId: 'SUBMITTED',
    isTerminal: false,
    submittedAt,
    lastModifiedAt: submittedAt,
    nation: 'ENGLAND',
    orgId: '100010',
    producerType: 'DIRECT_PRODUCER',
    assignedToId: null,
    displayData: {
      organisationName: { value: 'Acme Bottles Ltd', type: 'string' },
      organisationId: { value: '100010', type: 'string' }
    }
  },
  {
    id: '01JBR0UNASSIGNEDDP02',
    caseType: 'CSoC',
    stateId: 'SUBMITTED',
    isTerminal: false,
    submittedAt,
    lastModifiedAt: submittedAt,
    nation: 'ENGLAND',
    orgId: '100011',
    producerType: 'DIRECT_PRODUCER',
    assignedToId: null,
    displayData: {
      organisationName: { value: 'Beta Packaging plc', type: 'string' },
      organisationId: { value: '100011', type: 'string' }
    }
  },
  {
    id: '01JBR0ASSIGNEDSCHEME01',
    caseType: 'CSoC',
    stateId: 'SUBMITTED',
    isTerminal: false,
    submittedAt,
    lastModifiedAt: submittedAt,
    nation: 'ENGLAND',
    orgId: '200001',
    producerType: 'COMPLIANCE_SCHEME',
    assignedToId: null,
    displayData: {
      organisationName: { value: 'Green Scheme Operators Ltd', type: 'string' },
      organisationId: { value: '200001', type: 'string' }
    }
  },
  {
    id: '01JBR0WALESDP01',
    caseType: 'CSoC',
    stateId: 'SUBMITTED',
    isTerminal: false,
    submittedAt,
    lastModifiedAt: submittedAt,
    nation: 'WALES',
    orgId: '300001',
    producerType: 'DIRECT_PRODUCER',
    assignedToId: null,
    displayData: {
      organisationName: { value: 'Cymru Containers Ltd', type: 'string' },
      organisationId: { value: '300001', type: 'string' }
    }
  },
  {
    id: '01JBR0ASSIGNEDDP01',
    caseType: 'CSoC',
    stateId: 'SUBMITTED',
    isTerminal: false,
    submittedAt,
    lastModifiedAt: submittedAt,
    nation: 'ENGLAND',
    orgId: '100012',
    producerType: 'DIRECT_PRODUCER',
    assignedToId: 'caseworker-1',
    assignedToName: 'Case Worker One',
    displayData: {
      organisationName: { value: 'Assigned Producer Ltd', type: 'string' },
      organisationId: { value: '100012', type: 'string' }
    }
  }
]
