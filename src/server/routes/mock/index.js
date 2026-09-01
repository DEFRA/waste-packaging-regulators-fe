import { mockResetController } from './controller.js'

// Dev/mock-only routes. Registered by the router only when useMockApi is true,
// so this surface never exists in a deployed environment. auth is disabled so
// the test harness can reset before establishing a session, and crumb (CSRF) is
// skipped because the harness calls this directly, without a form-issued token.
export const mockRoutes = {
  plugin: {
    name: 'mock',
    register(server) {
      server.route([
        {
          method: 'POST',
          path: '/mock/reset',
          options: {
            auth: false,
            plugins: { crumb: false },
            ...mockResetController
          }
        }
      ])
    }
  }
}
