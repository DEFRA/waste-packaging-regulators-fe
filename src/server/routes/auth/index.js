import {
  signinOidcController,
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
            auth: 'azure-ad-b2c',
            ...signinOidcController
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
