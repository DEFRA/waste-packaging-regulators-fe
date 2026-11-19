# Review checklist — waste-packaging-regulators-fe

Roughly most-severe first. Each item names where the real pattern lives so you
can compare the change against it.

## 1. Access control and request safety

- **Every new route is authenticated.** Routes use
  `auth: SESSION_USER_STRATEGY` (`src/server/auth/session-user.js`). A route
  with `auth: false` or no `auth` needs an obvious reason (health, static,
  sign-in callback).
- **Regulator-only behaviour checks the role.** Access hinges on
  `isRegulator()` (`src/server/auth/regulator-access.js`, service roles 4/5).
  Look for new actions (accept, cancel, query) reachable by a signed-in
  non-regulator, or that act on an organisation outside the regulator's nation
  (`regulator-country-code.js`).
- **POSTs keep CSRF protection.** `@hapi/crumb` is registered globally
  (`src/server/plugins/crumb.js`); flag any `plugins: { crumb: false }` and any
  form template missing the crumb hidden field.
- **Inputs are validated.** Path params (`organisationId`, `documentType`,
  `id`), query (`type`, `tab`, `reason`…) and payloads are checked against an
  allow-list before use, as `isValidCancelReason` does in
  `routes/certificatesOfCompliance/cancel/reasons.js`.
- **No open redirects.** Redirect targets are built from
  `getForwardedPrefix` + `localeUrl` + known paths, never from a raw query or
  payload value.
- **Templates escape output.** Nunjucks autoescapes; flag `| safe` on anything
  derived from backend or user data.
- **No sensitive data in logs.** `request.logger` must not log tokens, session
  contents, email addresses or full backend payloads.
- **CSP/security headers** (`plugins/content-security-policy.js`): any
  loosening (new `unsafe-*`, wildcard hosts) needs justification.

## 2. Domain correctness

- **Declaration status logic** — `pending` / `accepted` / `not-submitted` /
  `cancelled` / `queried`. Check new branches handle every status, especially
  in `certificatesOfCompliance/actions/status.js` style guards
  (`canCancelComplianceDeclaration`). A wrong guard shows a regulator an action
  they must not take, or hides one they need.
- **Not-submitted means no Submitted or Accepted declaration**, not the
  `submissionStatus` marker — a cancelled-only organisation still lists there.
- **Direct producers and compliance schemes** both work; scheme references
  resolve by Companies House number.
- **Session flags** (`actions/session.service.js`) are keyed per declaration
  and cleared after use so a success banner cannot reappear or leak across
  declarations.
- **Dates and numbers** — tests run with `TZ=UTC`; watch for code that only
  passes because of it (BST boundaries, `new Date()` with local-time parsing),
  and for `moment` vs `date-fns` mixing in new code.

## 3. Backend calls and error handling

- New backend calls go through the service clients in `src/services/`, built on
  `apiBaseClient/base-api.service.js` (OAuth token + `ApiError`). No raw
  `fetch`/`undici` calls elsewhere.
- Controllers route backend failures through `handleApiError`
  (`common/helpers/handle-api-error.js`). An upstream 404 must become _service
  unavailable_, never the user-facing not-found page. Flag `catch` blocks that
  swallow errors, or turn `ApiError` into a 404/403 directly.
- Genuine "this record does not exist" for the user's own request is a
  deliberate `Boom.notFound`, not an upstream status passed through.

## 4. Mock API invariants (from AGENTS.md — these are load-bearing)

- **No `MOCK_API` / `useMockApi` branches in production code.** All mock
  behaviour lives in `src/mocks/`. `msw` is only imported dynamically from
  `server.js`, in `src/mocks/` or in `test-helpers/`.
- **One source of truth.** List, detail, search, not-submitted and CSV are all
  projections of one record set. Flag hand-authored per-surface data.
- **Stateless store.** No mutations in `<api>/store.js`; accept/cancel success is
  shown by the session flag, not mutated mock data.
- New handlers wrap in `dataHandler` so `MOCK_ERROR_STATUS` applies.
- New organisations add their identity to `mocks/identities.js` first;
  Companies House numbers stay unique.

## 5. Internationalisation (English and Welsh)

- Every new user-facing string is a key in **both**
  `src/server/locales/en.json` and `cy.json`. A key in `en` without a `cy`
  counterpart is a **Should fix** at minimum. Diff the key sets if locales
  changed.
- No hard-coded English in controllers or `.njk` templates. Use the locale
  helpers (`getLocale`, `translateCoc`, `cocPageI18n`).
- Links and redirects preserve the locale via `localeUrl`.

## 6. GOV.UK Frontend and accessibility

- Use `govuk-frontend` / MOJ Nunjucks macros, not hand-rolled markup.
- Validation errors: an error summary at the top linking to each field, the
  field-level error message, and the page `<title>` prefixed with `Error:`.
- One `h1` per page; page titles follow the existing pattern; back links go
  to the previous step, preserving `type`/`tab` query state.
- Radios, checkboxes and inputs have labels/legends; nothing relies on colour
  alone (e.g. met / not met tags carry text).

## 7. Tests

- New or changed behaviour has a `*.test.js` beside the code. Bug fixes
  include a test that would have failed before.
- Route tests drive the app via `server.inject` and assert on rendered HTML
  and redirects.
- **Tests own their input**: backend-driven tests use `mockScenario` /
  `applyScenario` from `#test-helpers/msw/scenario.js`, with
  `resetScenario()` in `afterEach`. Flag tests asserting against the default
  mock fixtures — they are free to change.
- Error paths (backend 4xx/5xx, network failure) and both locales are covered
  where the change touches them.
- No `.only`, skipped tests without a reason, or real network calls.

## 8. Config and deployment

- New settings go in the convict schema (`src/config/`) with a `format`,
  `default` and `env` binding, read via `config.get(...)`.
- A new required env var or secret needs a matching change in `cdp-app-config`
  — call it out in the summary so the author can raise it.
- `package.json` changes: exact versions (the repo pins), no runtime use of a
  devDependency, `.nvmrc`/`engines` kept in step.

## 9. Conventions

- Import with the `#` aliases (`#server/...`, `#services/...`,
  `#test-helpers/...`), ESM only.
- Comments describe current behaviour, never history ("used to", "replaced").
- Domain language in domain and mock code (`submissionStatus`, not "tab").
- Dead code, leftover `console.log`, commented-out blocks.
