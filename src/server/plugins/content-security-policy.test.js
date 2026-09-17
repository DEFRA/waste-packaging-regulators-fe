import { createServer } from '#server/server.js'

describe('#contentSecurityPolicy', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('Should set the CSP policy header', async () => {
    const resp = await server.inject({
      method: 'GET',
      url: '/'
    })

    const csp = resp.headers['content-security-policy']
    expect(csp).toBeDefined()
    expect(csp).toContain('https://www.google-analytics.com')
    expect(csp).toContain('https://www.googletagmanager.com')
    expect(csp).toContain('https://region1.google-analytics.com')
    expect(csp).toContain('https://analytics.google.com')
    expect(csp).toMatch(/'nonce-[a-zA-Z0-9+/=]+'/)
  })
})
