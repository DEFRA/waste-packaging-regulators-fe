import { config } from '#config/config.js'
import { statusCodes } from '../common/constants/status-codes.js'
import { renderErrorPage } from '../common/helpers/errors.js'

// The platform health check must keep answering while the service is shuttered,
// and the 503 page needs its own stylesheet and assets to render.
const alwaysAvailablePaths = ['/health', '/public']

function isAlwaysAvailable(path) {
  return alwaysAvailablePaths.some(
    (allowed) => path === allowed || path.startsWith(`${allowed}/`)
  )
}

/**
 * Shutters the service when MAINTENANCE_MODE is on: every other request is
 * answered with the 503 service unavailable page, before routing or auth run.
 */
export const maintenance = {
  plugin: {
    name: 'maintenance',
    register(server) {
      server.ext('onRequest', (request, h) => {
        if (
          !config.get('maintenance.enabled') ||
          isAlwaysAvailable(request.path)
        ) {
          return h.continue
        }

        return renderErrorPage(h, statusCodes.serviceUnavailable).takeover()
      })
    }
  }
}
