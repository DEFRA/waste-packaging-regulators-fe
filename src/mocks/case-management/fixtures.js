import { orgs } from '#mocks/identities.js'

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
    orgId: orgs.howco.reference,
    producerType: 'DIRECT_PRODUCER',
    assignedToId: null,
    displayData: {
      organisationName: { value: orgs.howco.name, type: 'string' },
      organisationId: { value: orgs.howco.reference, type: 'string' }
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
    orgId: orgs.sterling.reference,
    producerType: 'DIRECT_PRODUCER',
    assignedToId: null,
    displayData: {
      organisationName: { value: orgs.sterling.name, type: 'string' },
      organisationId: { value: orgs.sterling.reference, type: 'string' }
    }
  },
  {
    id: '01JBR0UNASSIGNEDSCHEME01',
    caseType: 'CSoC',
    stateId: 'SUBMITTED',
    isTerminal: false,
    submittedAt,
    lastModifiedAt: submittedAt,
    nation: 'ENGLAND',
    orgId: orgs.greencircle.reference,
    producerType: 'COMPLIANCE_SCHEME',
    assignedToId: null,
    displayData: {
      organisationName: { value: orgs.greencircle.name, type: 'string' },
      organisationId: { value: orgs.greencircle.reference, type: 'string' }
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
    orgId: orgs.cwmniPacio.reference,
    producerType: 'DIRECT_PRODUCER',
    assignedToId: null,
    displayData: {
      organisationName: { value: orgs.cwmniPacio.name, type: 'string' },
      organisationId: { value: orgs.cwmniPacio.reference, type: 'string' }
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
    orgId: orgs.pinnacle.reference,
    producerType: 'DIRECT_PRODUCER',
    assignedToId: 'caseworker-1',
    assignedToName: 'Case Worker One',
    displayData: {
      organisationName: { value: orgs.pinnacle.name, type: 'string' },
      organisationId: { value: orgs.pinnacle.reference, type: 'string' }
    }
  }
]
