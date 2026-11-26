import { casesListController } from './controller.js'
import { SESSION_USER_STRATEGY } from '#server/auth/session-user.js'

export const casesList = {
  plugin: {
    name: 'casesList',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/cases',
          options: {
            auth: SESSION_USER_STRATEGY,
            ...casesListController
          }
        }
      ])
    }
  }
}
