import { config } from '#config/config.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { runHealthChecks } from './health.service.js'

export const healthController = {
  handler(_request, h) {
    return h.response({ message: 'success' }).code(statusCodes.ok)
  }
}

export const healthAllController = {
  async handler(_request, h) {
    if (config.get('useMockApi')) {
      return h.response({ message: 'success' }).code(statusCodes.ok)
    }

    const result = await runHealthChecks()
    return h.response(result).code(statusCodes.ok)
  }
}
