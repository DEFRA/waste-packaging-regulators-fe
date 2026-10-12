export const tenSecondsMs = 10000
export const fourHoursMs = 14400000

export function defaultSessionCookieTtlMs(env = process.env) {
  const isProduction = env.NODE_ENV === 'production'
  const mockAuthEnv = env.MOCK_AUTH
  const usesMockAuth =
    mockAuthEnv === 'true' ||
    mockAuthEnv === '1' ||
    (mockAuthEnv !== 'false' && !isProduction)

  if (usesMockAuth) {
    return fourHoursMs
  }

  return tenSecondsMs
}
