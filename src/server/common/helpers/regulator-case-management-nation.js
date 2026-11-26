// Maps Account API nationId (session user) to Case Management nation codes.
// nationId values: 1 England, 2 NI, 3 Scotland, 4 Wales

const NATION_ID_TO_CASE_MANAGEMENT_NATION = {
  1: 'ENGLAND',
  2: 'N_IRELAND',
  3: 'SCOTLAND',
  4: 'WALES'
}

export function getRegulatorCaseManagementNation(sessionUser) {
  return NATION_ID_TO_CASE_MANAGEMENT_NATION[sessionUser?.nationId] ?? null
}
