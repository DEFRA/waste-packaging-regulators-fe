import { config } from '#config/config.js'
import { statusCodes } from '../constants/status-codes.js'

// Status codes without an entry here (500, 401, 400 and anything unmapped) fall
// back to the generic "problem with the service" page.
const errorPages = {
  [statusCodes.notFound]: {
    view: 'error/not-found',
    pageTitle: 'Page not found'
  },
  [statusCodes.forbidden]: {
    view: 'error/access-denied',
    pageTitle: 'You do not have permission to access this page'
  },
  [statusCodes.serviceUnavailable]: {
    view: 'error/service-unavailable',
    pageTitle: 'Sorry, the service is unavailable'
  }
}

const problemWithServicePage = {
  view: 'error/problem-with-service',
  pageTitle: 'Sorry, there is a problem with the service'
}

export function errorPageFor(statusCode) {
  return errorPages[statusCode] ?? problemWithServicePage
}

/**
 * Renders the error page for a status code. Shared with the maintenance plugin
 * so a shuttered service and a Boom 503 produce the same page.
 */
export function renderErrorPage(h, statusCode) {
  const { view, pageTitle } = errorPageFor(statusCode)

  return h
    .view(view, {
      pageTitle,
      availableFrom: config.get('maintenance.availableFrom')
    })
    .code(statusCode)
}

export function catchAll(request, h) {
  const { response } = request

  if (!('isBoom' in response)) {
    return h.continue
  }

  return renderErrorPage(h, response.output.statusCode)
}
