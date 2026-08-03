import { config } from '#config/config.js'
import { ApiError } from '#services/apiBaseClient/api-error.js'

/**
 * Lets a mock-mode journey fail the way a live one would. When MOCK_ERROR_STATUS
 * is set, the mocked service calls raise an ApiError with that status instead of
 * returning fixtures, so the request travels the real path — service → boomify →
 * onPreResponse — and lands on the matching error page.
 *
 * Only called from branches that have already established mock mode is on.
 */
export function throwIfMockErrorConfigured(serviceName) {
  const status = config.get('mockErrorStatus')

  // Anything that isn't a real status code (unset, or a non-numeric value)
  // leaves the mocked journey working normally.
  if (!Number.isFinite(status)) {
    return
  }

  throw new ApiError({
    status,
    message: `Mock ${serviceName} failure (MOCK_ERROR_STATUS=${status})`,
    serviceName
  })
}
