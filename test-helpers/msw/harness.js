// Integration harness for the regulators app under test — the Node analog
// of an xUnit integration test base class. Call it once at the top of a describe:
// it owns the hapi server and the MSW mock lifecycle (start once, reset between
// tests, stop at the end) and hands back the handful of operations a test needs,
// so a test only declares the organisations it exercises and asserts on the
// result — no per-file server bootstrap, cookie plumbing or reset hook.
//
//   describe('#thing', () => {
//     const app = setupRegulatorsApp()
//     it('...', async () => {
//       const scenario = app.given([{ name: 'Marlow Ltd' }])
//       const res = await app.get(scenario.byName('Marlow Ltd').detailPath)
//       expect(res.payload).toContain('Marlow Ltd')
//     })
//   })

import { createServer } from '#server/server.js'
import {
  authCookiesFromResponse,
  csrfTokenCookieFromResponse,
  crumbTokenFromCookie,
  mergeCookiesFromResponse
} from '#test-helpers/cookies.js'
import { mockScenario, applyScenario, resetScenario } from './scenario.js'

export function setupRegulatorsApp() {
  const state = { server: null, authCookie: null }

  beforeAll(async () => {
    state.server = await createServer()
    await state.server.initialize()
    // Sign in once: a stub auth strategy mints a fixed mock-user session, and
    // the same request yields the crumb, so `authCookie` carries both for
    // authenticated GETs and POSTs.
    const response = await state.server.inject({
      method: 'GET',
      url: '/signin-oidc'
    })
    state.authCookie = authCookiesFromResponse(response)
  })

  afterAll(async () => {
    await state.server.stop({ timeout: 0 })
  })

  afterEach(() => {
    resetScenario()
  })

  // Build the organisations and register them on the running mock in one step —
  // the equivalent of the reference's SetupFacadeMock…([...]). Returns the
  // scenario so a test can read back derived expectations (byName, rowsFor).
  const given = (organisations) => {
    const scenario = mockScenario({ organisations })
    applyScenario(scenario)
    return scenario
  }

  // Strip the /certificates-of-compliance prefix before hitting the backend
  // directly — the backend routes don't carry the prefix (the proxy strips it).
  // This mirrors what the YARP proxy does in production/development.
  const ROUTE_PREFIX = '/certificates-of-compliance'
  const stripPrefix = (url) => {
    if (url.startsWith(ROUTE_PREFIX)) {
      const rest = url.slice(ROUTE_PREFIX.length)
      if (rest === '' || rest.startsWith('/') || rest.startsWith('?')) {
        return rest.startsWith('?') ? `/${rest}` : rest || '/'
      }
    }
    return url
  }

  const prefixHeaders = (url, extra = {}) => {
    const stripped = stripPrefix(url)
    return stripped !== url
      ? { ...extra, 'x-forwarded-prefix': ROUTE_PREFIX }
      : extra
  }

  const get = (url, cookie = state.authCookie) =>
    state.server.inject({
      method: 'GET',
      url: stripPrefix(url),
      headers: prefixHeaders(url, cookie ? { cookie } : {})
    })

  // POST a form-encoded body, echoing the crumb from the cookie so CSRF passes.
  const post = (url, payload, cookie = state.authCookie) => {
    const crumb = crumbTokenFromCookie(cookie)
    const body = [payload, crumb && `CSRFToken=${crumb}`]
      .filter(Boolean)
      .join('&')
    return state.server.inject({
      method: 'POST',
      url: stripPrefix(url),
      payload: body,
      headers: prefixHeaders(url, {
        cookie,
        'content-type': 'application/x-www-form-urlencoded'
      })
    })
  }

  // Like server.inject but strips the route prefix from the URL first.
  // Use this for raw requests that must bypass CSRF (e.g. no-token tests).
  const rawInject = (options) =>
    state.server.inject({ ...options, url: stripPrefix(options.url) })

  // A fresh signed-in session + crumb, for a test that needs a session distinct
  // from the shared one.
  const signIn = async () => {
    const response = await state.server.inject({
      method: 'GET',
      url: '/signin-oidc'
    })
    return authCookiesFromResponse(response)
  }

  // A crumb cookie minted without signing in — a browser that still holds a
  // form's crumb after its session has lapsed.
  const anonCrumb = async () => {
    const response = await state.server.inject({
      method: 'GET',
      url: '/'
    })
    return csrfTokenCookieFromResponse(response)
  }

  // Carry cookies from a response into the next request. hapi/yar keeps the
  // session in the cookie, so each response rotates it; the response's value
  // wins over the fallback held from before.
  const nextCookie = (response, fallback) =>
    mergeCookiesFromResponse(fallback, response)

  return {
    given,
    get,
    post,
    rawInject,
    signIn,
    anonCrumb,
    nextCookie,
    get server() {
      return state.server
    },
    get authCookie() {
      return state.authCookie
    }
  }
}
