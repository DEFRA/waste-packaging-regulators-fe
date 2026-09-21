// Maps Account API nationId (session user) to waste-obligations country filter codes.
// nationId values: 1 England, 2 NI, 3 Scotland, 4 Wales — see .cursor/docs/cancellation-email-fields.md

const NATION_ID_TO_COUNTRY = {
  1: 'GB-ENG',
  2: 'GB-NIR',
  3: 'GB-SCT',
  4: 'GB-WLS'
}

export function getRegulatorCountryCode(sessionUser) {
  return NATION_ID_TO_COUNTRY[sessionUser?.nationId] ?? null
}
