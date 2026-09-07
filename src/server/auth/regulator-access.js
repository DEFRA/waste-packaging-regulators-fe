const REGULATOR_ADMIN_SERVICE_ROLE_ID = 4
const REGULATOR_BASIC_SERVICE_ROLE_ID = 5

export function isRegulator(accountDetails) {
  const serviceRoleId = accountDetails?.serviceRoleId
  return (
    serviceRoleId === REGULATOR_ADMIN_SERVICE_ROLE_ID ||
    serviceRoleId === REGULATOR_BASIC_SERVICE_ROLE_ID
  )
}
