import { config } from '#config/config.js'

export const MOCK_AUTH_USER_OIDS = {
  en: '00000000-0000-4000-8000-000000000001',
  cy: '00000000-0000-4000-8000-000000000002',
  sct: '00000000-0000-4000-8000-000000000003',
  nir: '00000000-0000-4000-8000-000000000004'
}

export const MOCK_AUTH_USER_KEYS = ['en', 'cy', 'sct', 'nir']

export const mockEnglishRegulatorAuditUser = {
  id: MOCK_AUTH_USER_OIDS.en,
  name: 'James Walker',
  email: 'mock-user@test.local',
  locale: 'en'
}

export const mockWelshRegulatorAuditUser = {
  id: MOCK_AUTH_USER_OIDS.cy,
  name: 'Elin Evans',
  email: 'elin.evans@cyfoethnaturiolcymru.gov.uk',
  locale: 'cy'
}

export const mockScottishRegulatorAuditUser = {
  id: MOCK_AUTH_USER_OIDS.sct,
  name: 'Fiona MacLeod',
  email: 'fiona.macleod@sepa.org.uk',
  locale: 'en'
}

export const mockNorthernIrelandRegulatorAuditUser = {
  id: MOCK_AUTH_USER_OIDS.nir,
  name: "Patrick O'Neill",
  email: 'patrick.oneill@daera-ni.gov.uk',
  locale: 'en'
}

export const mockAccountUser = {
  firstName: 'James',
  lastName: 'Walker',
  email: 'mock-user@test.local',
  telephone: '01234 567890',
  serviceRole: 'Regulator Admin',
  serviceRoleId: 4,
  organisations: [{ name: 'Environment Agency', nationId: 1 }]
}

export const mockWelshAccountUser = {
  firstName: 'Elin',
  lastName: 'Evans',
  email: 'elin.evans@cyfoethnaturiolcymru.gov.uk',
  telephone: '0300 065 3000',
  serviceRole: 'Regulator Admin',
  serviceRoleId: 4,
  organisations: [{ name: 'Natural Resources Wales', nationId: 4 }]
}

export const mockScottishAccountUser = {
  firstName: 'Fiona',
  lastName: 'MacLeod',
  email: 'fiona.macleod@sepa.org.uk',
  telephone: '01786 457700',
  serviceRole: 'Regulator Admin',
  serviceRoleId: 4,
  organisations: [
    { name: 'Scottish Environment Protection Agency', nationId: 3 }
  ]
}

export const mockNorthernIrelandAccountUser = {
  firstName: 'Patrick',
  lastName: "O'Neill",
  email: 'patrick.oneill@daera-ni.gov.uk',
  telephone: '028 9056 9600',
  serviceRole: 'Regulator Admin',
  serviceRoleId: 4,
  organisations: [{ name: 'Northern Ireland Environment Agency', nationId: 2 }]
}

const mockAuthProfilesByKey = {
  en: {
    oid: MOCK_AUTH_USER_OIDS.en,
    email: mockAccountUser.email,
    accountUser: mockAccountUser
  },
  cy: {
    oid: MOCK_AUTH_USER_OIDS.cy,
    email: mockWelshAccountUser.email,
    accountUser: mockWelshAccountUser
  },
  sct: {
    oid: MOCK_AUTH_USER_OIDS.sct,
    email: mockScottishAccountUser.email,
    accountUser: mockScottishAccountUser
  },
  nir: {
    oid: MOCK_AUTH_USER_OIDS.nir,
    email: mockNorthernIrelandAccountUser.email,
    accountUser: mockNorthernIrelandAccountUser
  }
}

const mockAccountUsersByOid = Object.fromEntries(
  Object.values(mockAuthProfilesByKey).map(({ oid, accountUser }) => [
    oid,
    accountUser
  ])
)

function mockAuthProfileForKey(key) {
  const profile = mockAuthProfilesByKey[key] ?? mockAuthProfilesByKey.en

  return {
    oid: profile.oid,
    email: profile.email
  }
}

function resolveMockAuthUserKey() {
  const key = process.env.MOCK_AUTH_USER ?? config.get('mockAuthUser')
  return MOCK_AUTH_USER_KEYS.includes(key) ? key : 'en'
}

export function resolveMockAuthProfile(_request) {
  return mockAuthProfileForKey(resolveMockAuthUserKey())
}

export function resolveMockAccountUser(userId) {
  return mockAccountUsersByOid[userId] ?? mockAccountUser
}
