import { createServer } from '#server/server.js'
import { statusCodes } from '#server/common/constants/status-codes.js'

// The reset route only exists in mock mode (useMockApi), which is the default
// outside production and therefore active under test. It is deliberately
// unauthenticated and CSRF-exempt so the journey-test harness can call it
// directly, without a session or a form-issued crumb.
describe('#mockResetController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('resets the mock backends without auth or a crumb', async () => {
    const { payload, statusCode } = await server.inject({
      method: 'POST',
      url: '/mock/reset'
    })

    expect(statusCode).toBe(statusCodes.noContent)
    expect(payload).toBe('')
  })
})
