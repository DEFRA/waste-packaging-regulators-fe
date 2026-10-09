import { config } from '#config/config.js'
import { redirectToSignIn } from '#server/routes/certificatesOfCompliance/detail/actions-controller.js'

/**
 * Ensures a regulator session is present and has not exceeded the auth revalidation TTL.
 *
 * @param {import('@hapi/hapi').Request} request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 * @returns {import('@hapi/hapi').ResponseObject|null} redirect response, or null to continue
 */
export function requireRegulatorSession(request, h) {
  const user = request.yar?.get('user')

  if (!user) {
    return redirectToSignIn(request, h)
  }

  if (config.get('useMockAuth')) {
    return null
  }

  const revalidationTtl = config.get('auth.revalidationTtlMs')
  if (revalidationTtl > 0) {
    const validatedAt = request.yar.get('authValidatedAt') ?? 0
    if (Date.now() - validatedAt > revalidationTtl) {
      request.yar.clear('user')
      return redirectToSignIn(request, h)
    }
  }

  return null
}
