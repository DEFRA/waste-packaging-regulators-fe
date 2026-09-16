import { getProxyPrefix } from '../common/helpers/proxy/forwarded-prefix.js'

const FIRST_REDIRECT_STATUS_CODE = 300
const FIRST_CLIENT_ERROR_STATUS_CODE = 400

export const forwardedPrefixRedirects = {
  plugin: {
    name: 'forwarded-prefix-redirects',
    register(server) {
      server.ext('onPreResponse', (request, h) => {
        const response = request.response
        const location = response?.headers?.location

        if (
          response?.isBoom ||
          !location ||
          response.statusCode < FIRST_REDIRECT_STATUS_CODE ||
          response.statusCode >= FIRST_CLIENT_ERROR_STATUS_CODE
        ) {
          return h.continue
        }

        const prefix = getProxyPrefix(request)

        if (!prefix || !location.startsWith('/') || location.startsWith('//')) {
          return h.continue
        }

        if (
          location === prefix ||
          location.startsWith(`${prefix}/`) ||
          location.startsWith(`${prefix}?`) ||
          location.startsWith(`${prefix}#`)
        ) {
          return h.continue
        }

        const prefixed =
          location === '/' ||
          location.startsWith('/?') ||
          location.startsWith('/#')
            ? prefix + location.slice(1)
            : `${prefix}${location}`

        response.header('location', prefixed)
        return h.continue
      })
    }
  }
}
