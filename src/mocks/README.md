# The mock API layer

`src/mocks/` is a dev-only mock of the three backends this frontend talks to —
**waste-obligations**, **waste-organisations** and the **Account** API — built on
[Mock Service Worker](https://mswjs.io/). It exists so the app can run, and be
tested, end-to-end without any live services.

This file explains the thinking, the structure, and how to work with it.

## Why it is built this way

- **Interception at the HTTP boundary.** Production code makes ordinary `fetch`
  calls and never branches on `MOCK_API`. The seam is the network, not the code,
  so the mocks exercise the real request/response paths. `MOCK_API` defaults to
  `false` in production but can be set to `true` to deploy the app with mock data
  (e.g. a demo or smoke-test environment).

- **One canonical source of truth.** Each backend describes its world once. For
  waste-obligations that is a single set of compliance records; the list, detail,
  search and CSV surfaces are all pure _projections_ of it, so they cannot disagree
  with each other. There is no per-surface data to keep in sync.

- **Stateless, not static.** The store is a read-only projection of the fixture
  records — no approve/cancel transitions are persisted. Accept or cancel a
  certificate and the response returns the same fixture data; the session flag
  drives the success banner, but the mock data does not change. This keeps the
  mock deterministic: every request sees the same records, which makes parallel
  test runs safe and eliminates reset-between-test bookkeeping.

- **Excluded from SonarCloud analysis.** The layer's fixtures use "magic" numbers
  and repeated literals by nature, and its branches are covered through integration
  tests rather than unit tests.

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
    store.js           read-only store: lookup, history query, and listing query — no mutations
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
3. `store.js` composes those projections with the `query.js` semantics into
   read-only lookup, history and listing operations.
4. `handlers.js` exposes the store over the backend's HTTP routes.
5. `backends.js` assembles the three backends; `server.js` starts MSW with them.

## Running it locally

- `MOCK_API=true` (the default outside production) turns the mocks on.
- `MOCK_ERROR_STATUS=<http status>` makes every mocked call return that status
  instead of data, to walk a journey into the real error pages without a failing
  backend.

## Country-specific data

The default fixture set includes direct producers for Wales, Scotland, and
Northern Ireland, each with pending and accepted compliance records. England is
covered by the existing default orgs (Howco, Greenfield, etc.), which default to
`GB-ENG` and EA when no country fields are set on the record.

Each nation-specific org is described once in `identities.js` (`orgs.cwmniPacio`,
`orgs.highlandPack`, `orgs.belfastPack`) and referenced from all three backend
fixtures. Records carry `businessCountry`, `environmentalRegulator`, and
`regulatorEmail`; `declaration.js` projects those onto the API declaration shape
instead of hardcoding EA.

| Nation           | Org slug       | `businessCountry` | Regulator |
| ---------------- | -------------- | ----------------- | --------- |
| Wales            | `cwmniPacio`   | `GB-WLS`          | NRW       |
| Scotland         | `highlandPack` | `GB-SCT`          | SEPA      |
| Northern Ireland | `belfastPack`  | `GB-NIR`          | NIEA      |

### Mock auth personas

`mock-auth-users.js` centralises the signed-in regulator and Account API user
profiles. When `MOCK_AUTH=true`, `resolveMockAuthProfile` picks the auth
credentials and `resolveMockAccountUser` returns the matching Account API profile
(by oid).

`MOCK_AUTH_USER` (config: `mockAuthUser`, default `en`) selects the persona:

- `en` — Environment Agency (`nationId` 1)
- `cy` — Natural Resources Wales (`nationId` 4)
- `sct` — SEPA (`nationId` 3)
- `nir` — NIEA (`nationId` 2)

UI locale (`?lang=cy`) does not change the mock auth profile.

Accepted records for Wales, Scotland, and Northern Ireland use the corresponding
audit user from `mock-auth-users.js` so the detail page audit trail matches the
nation regulator.

To add another nation-specific org, add its identity to `identities.js` first,
then add the record to `waste-obligations/fixtures.js` and mirror it in
`waste-organisations/fixtures.js` and `account-api/fixtures.js`. See the root
[README country-specific mock data section](../../README.md#country-specific-mock-data)
for local run examples.

## Cancellation reason strings

Current-year history and cancelled declaration audit entries should use the **canonical English reason strings** from [`canonical-reason-labels.js`](../src/server/routes/certificatesOfCompliance/cancel/canonical-reason-labels.js) (aligned with waste-obligations). Bespoke text (e.g. `Submitted after the deadline.`) is reserved for fixtures that intentionally test non-standard display passthrough.

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
