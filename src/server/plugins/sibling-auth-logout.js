import { clearConfiguredSiblingAuthCookies } from '#server/common/helpers/clear-sibling-auth-cookies.js'

export const siblingAuthLogout = {
  plugin: {
    name: 'sibling-auth-logout',
    register(server) {
      server.ext({
        type: 'onPreResponse',
        method(request, h) {
          if (request.route.path !== '/logout' || request.response?.isBoom) {
            return h.continue
          }

          clearConfiguredSiblingAuthCookies(request)
          return h.continue
        },
        options: {
          after: 'yar'
        }
      })
    }
  }
}
