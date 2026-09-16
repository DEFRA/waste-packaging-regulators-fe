import { getProxyPrefix } from '../common/helpers/proxy/forwarded-prefix.js'

const FIRST_REDIRECT_STATUS_CODE = 300
const FIRST_CLIENT_ERROR_STATUS_CODE = 400

function isRedirectResponse(response) {
  return (
    !response?.isBoom &&
    response.statusCode >= FIRST_REDIRECT_STATUS_CODE &&
    response.statusCode < FIRST_CLIENT_ERROR_STATUS_CODE
  )
}

function isAbsoluteLocalPath(location) {
  return location.startsWith('/') && !location.startsWith('//')
}

function isAlreadyPrefixed(location, prefix) {
  return (
    location === prefix ||
    location.startsWith(`${prefix}/`) ||
    location.startsWith(`${prefix}?`) ||
    location.startsWith(`${prefix}#`)
  )
}

function applyPrefix(location, prefix) {
  if (
    location === '/' ||
    location.startsWith('/?') ||
    location.startsWith('/#')
  ) {
    return prefix + location.slice(1)
  }
  return `${prefix}${location}`
}

export const forwardedPrefixRedirects = {
  plugin: {
    name: 'forwarded-prefix-redirects',
    register(server) {
      server.ext('onPreResponse', (request, h) => {
        const response = request.response
        const location = response?.headers?.location

        if (!location || !isRedirectResponse(response)) {
          return h.continue
        }

        const prefix = getProxyPrefix(request)

        if (
          !prefix ||
          !isAbsoluteLocalPath(location) ||
          isAlreadyPrefixed(location, prefix)
        ) {
          return h.continue
        }

        response.header('location', applyPrefix(location, prefix))
        return h.continue
      })
    }
  }
}
