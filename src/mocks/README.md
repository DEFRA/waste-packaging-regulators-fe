# The mock API layer

`src/mocks/` is a dev-only mock of the three backends this frontend talks to —
**waste-obligations**, **waste-organisations** and the **Account** API — built on
[Mock Service Worker](https://mswjs.io/). It exists so the app can run, and be
tested, end-to-end without any live services.

This file explains the thinking, the structure, and how to work with it.

## Why it is built this way

- **Interception at the HTTP boundary.** Production code makes ordinary `fetch`
  calls and never branches on `MOCK_API`. `msw` is a devDependency, imported behind
  a dynamic `import()` in `server.js`, so it never enters the production module
  graph — no deployed environment runs with `MOCK_API=true`. The seam is the
  network, not the code, so the mocks exercise the real request/response paths.

- **One canonical source of truth.** Each backend describes its world once. For
  waste-obligations that is a single set of compliance records; the list, detail,
  search and CSV surfaces are all pure _projections_ of it, so they cannot disagree
  with each other. There is no per-surface data to keep in sync.

- **Stateful, not static.** The store keeps approve/cancel transitions in memory,
  so running the app locally is _interactive_: accept or cancel a certificate and
  watch it move between states — Pending, Accepted, current-year history — within
  the session, exactly as a live backend would. That cross-state local testing is
  the whole reason the mock is a store rather than flat JSON fixtures. (State
  resets on restart.)

- **Dev-only, and scoped as such.** The layer is excluded from the production build
  and from SonarCloud analysis — its fixtures use "magic" numbers and repeated
  literals by nature, and its branches are covered through the integration tests.

## Structure

An organisation appears in all three backends, tied together by one shared identity.

```
mocks/
  identities.js        shared org identity — orgs.<slug> (id, name, reference, CHN) + scalars
  http.js              shared MSW helpers (error injection, 404s, base-url trim)
  backends.js          assembles the three backends and their combined handlers
  server.js            starts the in-process MSW server (startMockApi)
  <api>/
    fixtures.js        the canonical records/data for that backend
    store.js           in-memory store: lookup, history, listing query + approve/cancel state
    handlers.js        the MSW HTTP handlers, thin over the store

  waste-obligations/   additionally splits the store's supporting concerns into
                       single-purpose files:
    obligation-data.js   the per-material recycling tonnage datasets records point at
    declaration.js       pure record → API-shape projections (no state)
    query.js             the listing query semantics (status/type filter, search, sort, page)
```

## How a request flows

1. `fixtures.js` holds one record per organisation-declaration.
2. `declaration.js` projects a record into the raw API declaration shape.
3. `store.js` composes those projections with the `query.js` semantics and its
   in-memory approve/cancel state.
4. `handlers.js` exposes the store over the backend's HTTP routes.
5. `backends.js` assembles the three backends; `server.js` starts MSW with them.

## Running it locally

- `MOCK_API=true` (the default outside production) turns the mocks on.
- `MOCK_ERROR_STATUS=<http status>` makes every mocked call return that status
  instead of data, to walk a journey into the real error pages without a failing
  backend.

## Changing the data and writing tests

- **Default (local) data** lives in `<api>/fixtures.js`. To add an organisation,
  give it an identity in `identities.js` first (`orgs.<slug>`), then reference it
  from each backend that needs it. This default set is only for eyeballing locally —
  tests do not depend on it.
- **Tests** declare the exact organisations and declarations they need through the
  scenario factory in
  [`test-helpers/msw/scenario.js`](../../test-helpers/msw/scenario.js), which hands
  back both the MSW handlers to register and the derived expectations — so the input
  and the asserted output sit together in the test. Assert against the scenario,
  never the shared default fixtures.
