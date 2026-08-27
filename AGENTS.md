# AGENTS.md

Guidance for agents working in `waste-packaging-regulators-fe`. Read this before
changing code, data or tests.

## What this is

The regulator-facing frontend for DEFRA's Extended Producer Responsibility (EPR)
for packaging. Regulators (EA, SEPA, NRW, NIEA) use it to review and act on
producers' and compliance schemes' certificates of compliance. It is a
server-rendered [hapi](https://hapi.dev/) app using GOV.UK Frontend + MOJ Frontend
via Nunjucks, and runs on DEFRA's Core Delivery Platform (CDP).

It talks to three backends — **waste-obligations**, **waste-organisations** and the
**Account** API — and to Azure AD B2C for sign-in. Node `>=24`, ESM throughout.

## Layout

```
src/
  index.js            process entry
  config/             convict config schema + Nunjucks setup
  server/
    server.js         hapi wiring; registers plugins and starts the MSW mock when MOCK_API is on
    routes/           one folder per feature — certificatesOfCompliance is the main one
    plugins/          hapi plugins (router, views, sessions, security headers…)
    auth/             Azure AD B2C (@hapi/bell) strategy + the MOCK_AUTH stub
    common/           helpers, shared components, constants, templates
  services/           backend clients — apiBaseClient wraps fetch with OAuth tokens + error mapping
  client/             browser assets (javascripts, stylesheets, static), built by vite
  mocks/              in-process MSW mock of the three backends (see "Mock API")
test-helpers/
  msw/                the scenario factory tests use to declare their own backend data
  mock-fixtures.js    a few canonical declaration shapes for the list.service unit tests
```

Path aliases (see `package.json` `imports`): `#*` → `src/*`, `#test-helpers/*` →
`test-helpers/*`. Import with these, e.g. `import { ... } from '#mocks/server.js'`.

## Running locally

```bash
npm install
npm run dev          # MOCK_API + MOCK_AUTH: no backends, no B2C, signed in as mock-user
```

`npm run dev` serves against the in-process mocks with a stub auth strategy, so it
needs nothing else running. To run against real/containerised backends instead use
`npm run dev:docker-backends` or `npm run dev:dev-backends` (see the README for the
docker-compose environment and the secrets those profiles expect). `npm start`
mimics production mode.

## Quality gates

```bash
npm test             # vitest run --coverage (TZ=UTC)
npm run lint         # eslint + stylelint
npm run format       # prettier --write   (format:check to verify)
```

`npm run git:pre-commit-hook` runs the security audit, format check, lint and tests
together — the same gate CI applies. Run tests, lint and format before handing work
back.

## Testing

Vitest, one `*.test.js` beside the code it covers. Route tests drive the app
through hapi `server.inject`, asserting on rendered HTML and redirects.

**Tests own their input.** A test that exercises a backend declares the exact
organisations/declarations it needs through the scenario factory
(`test-helpers/msw/scenario.js`) and gets back both the MSW handlers to register
and the derived expectations, so the input and the asserted output sit together in
the test. Do **not** assert against the default mock fixtures — they are for local
running and are free to change. See "Writing a test" below.

## Mock API

`src/mocks/` mocks the three backends with [Mock Service Worker](https://mswjs.io/).
The seam is the **HTTP boundary**: production code makes ordinary `fetch` calls and
never branches on `MOCK_API`. `msw` is a devDependency loaded behind a dynamic
import in `server.js`, so it never enters the production module graph.

Two properties are load-bearing — keep them true:

1. **One source of truth.** The list, detail, search and CSV surfaces are all
   projections of one canonical set of compliance records. A record is described
   once; the surfaces cannot disagree. Do **not** hand-author per-surface data.
2. **Statefulness.** The obligations store holds in-memory approve/cancel overrides,
   so approving or cancelling a certificate in the local UI moves it between the
   Pending, Accepted and history views for the life of the process (it resets on
   restart) — the same behaviour the deleted session-service mock gave.

The fixtures are JavaScript, not flat JSON, on purpose: coverage %, recycling
status, the tab a record lists under and the audit trail are **derived** from the
one record set at request time, and the store applies transitions live. Static JSON
would mean hand-writing each surface's response and keeping them in sync by hand —
the drift the single source of truth exists to prevent.

### Layout

```
mocks/
  identities.js          shared org identity — orgs.howco.id, names, refs, CHNs
  http.js                shared HTTP helpers (error injection, 404, base-url trim)
  backends.js            assembles the three backends + their combined handlers
  server.js              starts the in-process MSW server (startMockApi)
  <api>/fixtures.js      the raw data for that backend
  <api>/store.js         in-memory store: query/lookup (+ approve/cancel for obligations)
  <api>/handlers.js      the MSW HTTP handlers, thin over the store
```

An organisation appears in all three backends. Its shared identity (id, name,
reference, Companies House number) lives once in `identities.js` as `orgs.<slug>`;
each backend's `fixtures.js` adds its own API-specific fields.

### Changing the default (local-running) data

The default data is only for local running — tests do not depend on it. Edit
`<api>/fixtures.js`. Add a new organisation's identity to `orgs` in `identities.js`
first, then reference it (`orgs.<slug>.id`) from each backend that needs it. Keep
every compliance scheme's Companies House number unique — scheme references resolve
by it. The default set deliberately covers every variation (met / not met / no
data, each submission status, direct producers and compliance schemes) so they can
all be eyeballed locally.

### Writing a test

Use the scenario factory — never assert against the default fixtures.

```js
import {
  mockScenario,
  applyScenario,
  resetScenario
} from '#test-helpers/msw/scenario.js'
import { obligationFeeds } from '#test-helpers/msw/obligations.js'

afterEach(() => resetScenario())

it('renders Not met for a partly-met producer', async () => {
  const scenario = mockScenario({
    organisations: [
      {
        name: 'Marlow Packaging Ltd',
        status: 'pending',
        obligations: obligationFeeds.mixed
      }
    ]
  })
  applyScenario(scenario) // registers the handlers on the running mock server

  const org = scenario.byName('Marlow Packaging Ltd')
  const response = await get(org.detailPath) // org.detailPath, org.declarationId, org.reference, org.history…
  expect(response.payload).toContain('Not met')
})
```

- `applyScenario` prepends the scenario's handlers (they win over the default);
  `resetScenario` in `afterEach` restores the default and clears any approve/cancel
  transitions left on the default backend so they cannot leak between tests.
- Each organisation spec supports `status`
  (`pending`/`accepted`/`not-submitted`/`cancelled`/`queried`),
  `type: 'compliance-scheme'`, `obligations`, `regulation43`, `persons`, `history`,
  and the accepted/cancelled-by fields — see `test-helpers/msw/scenario.js`.
- The scenario runs through the same store and handlers as the default mock, so it
  exercises the real backend behaviour, not a shortcut.
- `test-helpers/mock-fixtures.js` projects the default records for the few unit
  tests that inject them into a fake service; prefer the scenario factory for
  anything that drives the app.

## Conventions

- Never reintroduce `if (config.get('useMockApi'))` (or any `MOCK_API` branch) into
  production code. All mock behaviour lives in `src/mocks/`.
- Comments describe current behaviour only — never what the code replaced or used
  to do.
- Domain language, not UI language, in the domain and mock code (a record's
  `submissionStatus`, not its "tab").
- `MOCK_ERROR_STATUS` (handled in `mocks/http.js`) makes every mocked call return
  that status; new handlers must go through the `dataHandler` wrapper so they honour
  it.
- Config is `convict` (`src/config`); read it through `config.get(...)`, add new
  settings to the schema with sensible env-var bindings.
