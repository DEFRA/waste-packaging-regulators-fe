import {
  signinOidcController,
  signInFailedController,
  signOutController,
  signedOutController
} from './controller.js'

export const auth = {
  plugin: {
    name: 'auth',
    register(server) {
      server.route([
        {
          method: ['GET', 'POST'],
          path: '/signin-oidc',
          options: {
            // `try`, not the default `required`: when Bell cannot complete
            // the callback it hands the handler `request.auth.error` instead
            // of answering with a 500 of its own.
            auth: { strategy: 'azure-ad-b2c', mode: 'try' },
            ...signinOidcController
          }
        },
        {
          method: 'GET',
          path: '/sign-in-failed',
          options: {
            auth: false,
            ...signInFailedController
          }
        },
        {
          method: 'GET',
          path: '/logout',
          options: {
            auth: false,
            ...signOutController
          }
        },
        {
          method: 'GET',
          path: '/signed-out',
          options: {
            auth: false,
            ...signedOutController
          }
        }
      ])
    }
  }
}
