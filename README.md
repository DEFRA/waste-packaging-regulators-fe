# waste-packaging-regulators-fe

[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_waste-packaging-regulators-fe&metric=security_rating)](https://sonarcloud.io/summary/new_code?id=DEFRA_waste-packaging-regulators-fe)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_waste-packaging-regulators-fe&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=DEFRA_waste-packaging-regulators-fe)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_waste-packaging-regulators-fe&metric=coverage)](https://sonarcloud.io/summary/new_code?id=DEFRA_waste-packaging-regulators-fe)

Core delivery platform Node.js Frontend Template.

- [Requirements](#requirements)
  - [Node.js](#nodejs)
- [Server-side Caching](#server-side-caching)
- [Redis](#redis)
- [Local Development](#local-development)
  - [Setup](#setup)
    - [Nix dev shell (optional)](#nix-dev-shell-optional)
  - [Development](#development)
  - [Backend API profiles](#backend-api-profiles)
  - [HTTPS for local development](#https-for-local-development)
  - [Production](#production)
  - [Npm scripts](#npm-scripts)
  - [Update dependencies](#update-dependencies)
  - [Formatting](#formatting)
    - [Windows prettier issue](#windows-prettier-issue)
- [Docker](#docker)
  - [Development image](#development-image)
  - [Production image](#production-image)
  - [Docker Compose](#docker-compose)
  - [Dependabot](#dependabot)
  - [SonarCloud](#sonarcloud)
- [Licence](#licence)
  - [About the licence](#about-the-licence)

## Requirements

### Node.js

Please install Node Version Manager [nvm](https://github.com/creationix/nvm)

To use the correct version of Node.js for this application, via nvm:

```bash
cd waste-packaging-regulators-fe
nvm use
```

You can alternatively use [mise-en-place](https://mise.jdx.dev/) with [`idiomatic_version_file_enable_tools`](https://mise.jdx.dev/configuration.html#idiomatic-version-files) enabled which will respect the [`.nvmrc`](.nvmrc).

## Server-side Caching

We use Catbox for server-side caching. By default the service will use CatboxRedis when deployed and CatboxMemory for
local development.
You can override the default behaviour by setting the `SESSION_CACHE_ENGINE` environment variable to either `redis` or
`memory`.

Please note: CatboxMemory (`memory`) is _not_ suitable for production use! The cache will not be shared between each
instance of the service and it will not persist between restarts.

## Redis

Redis is an in-memory key-value store. Every instance of a service has access to the same Redis key-value store similar
to how services might have a database (or MongoDB). All frontend services are given access to a namespaced prefixed that
matches the service name. e.g. `my-service` will have access to everything in Redis that is prefixed with `my-service`.

If your service does not require a session cache to be shared between instances or if you don't require Redis, you can
disable setting `SESSION_CACHE_ENGINE=false` or changing the default value in `src/config/index.js`.

## Proxy

We are using forward-proxy which is set up by default. To make use of this: `import { fetch } from 'undici'` then
because of the `setGlobalDispatcher(new ProxyAgent(proxyUrl))` calls will use the ProxyAgent Dispatcher

If you are not using Wreck, Axios or Undici or a similar http that uses `Request`. Then you may have to provide the
proxy dispatcher:

To add the dispatcher to your own client:

```javascript
import { ProxyAgent } from 'undici'

return await fetch(url, {
  dispatcher: new ProxyAgent({
    uri: proxyUrl,
    keepAliveTimeout: 10,
    keepAliveMaxTimeout: 10
  })
})
```

## Local Development

### Setup

Install application dependencies:

```bash
npm install
```

#### Nix dev shell (optional)

[`flake.nix`](./flake.nix) provides a dev shell with tools used by this repo.

Run `nix develop` or use [direnv](https://direnv.net/) to activate the development tools for this repo

We have not added nodejs to the nix shell, preferring nvm/mise due to more precise version pinning in order to to avoid unexpected behaviour differences across minor node versions.

### Git hooks

Install git hooks (optional)

```bash
npm run git:hooks
```

### Development

To run the application in `development` mode run:

```bash
npm run dev
```

This uses mock API responses and a stub auth strategy (no backends required, no B2C round-trip). Routes that check for a signed-in user see a fixed `mock-user` automatically.

### Welsh / English (i18n)

Locale support follows the same approach as [waste-obligations-frontend](https://github.com/DEFRA/waste-obligations-frontend): translations live in `src/server/locales/en.json` and `cy.json`, resolved via `getLocale(request)` (`?lang=` query param, then OAuth session `authLocale`, then `Accept-Language`, default `en`).

When the active locale is Welsh, internal links append `?lang=cy` (English omits the param). Templates receive a request-scoped `localeUrl(href)` helper from the Nunjucks context; server-side code uses `localeUrl(href, locale)`, `bindLocaleUrl(locale)`, or `redirectWithLocale(h, request, path)` from `src/server/common/helpers/i18n/locale-url.js`.

Add or change strings in `src/server/locales/en.json`. Add Welsh translations only in `cy.json` — omit keys that are not yet translated. Missing or blank `cy` keys fall back to English at runtime via `translate.js`.

Switch language locally with the Cymraeg / English toggle in the service navigation, or append `?lang=cy` to any URL.

### Mock API

With `MOCK_API=true` (the default outside production), the backend calls to the
waste-obligations, waste-organisations and Account APIs are intercepted in-process
by [Mock Service Worker](https://mswjs.io/) and answered from local fixtures. The
production code makes ordinary `fetch` calls and is unaware of the mock — nothing
is branched on `MOCK_API` outside the mock layer.

The default data deliberately covers every variation (met / not met / no data, each
submission status, direct producers and compliance schemes), so you can eyeball them
all locally — visit the certificates-of-compliance pages after `npm run dev`.
Approving or cancelling a certificate persists in-memory for the process, so the UI
reflects the new status on the redirect. The store resets on restart, or on demand
via the mock-only reset endpoint:

```bash
# `npm run dev` serves HTTPS with a self-signed cert, so -k skips verification:
curl -k -X POST https://localhost:3000/mock/reset   # 204 No Content
# (the containerised mock used by the journey tests serves plain HTTP instead)
```

`POST /mock/reset` discards all approve/cancel mutations and restores the base
fixtures, responding `204 No Content` with an empty body. It exists only when
`MOCK_API=true` (never in a deployed environment) and is unauthenticated, so the
journey-test harness can reset between tests.

Set `MOCK_ERROR_STATUS=<http status>` alongside `MOCK_API=true` to make every
mocked call return that status instead of data, so you can walk a journey into the
real error pages without a failing backend.

The mock layer's design, structure and how to work with it: see
[`src/mocks/README.md`](./src/mocks/README.md).

### Alternate backend API profiles

#### Run against dev environment

Real backends, real B2C:

```bash
npm run dev:dev-backends
```

Secrets (`AZURE_AD_B2C_CLIENT_SECRET`, API auth/keys) are not set by the script; inject them separately (e.g. via [gopass](https://github.com/gopasspw/gopass) or `.env`).

#### Run against [docker-compose local environment](https://github.com/DEFRA/epr-local-environment)

Docker backends, mock B2C.

Bring up the docker environment:

```bash
cd epr-local-environment
docker compose --profile regulator up -d
```

The `regulator` profile also brings up the containerised version of this frontend and its nginx proxy, which publishes host `:3000` and will clash with `npm run dev`.

Before running the frontend locally, stop the containers occupying that port:

```bash
docker compose stop waste-packaging-regulators-fe-proxy waste-packaging-regulators-fe
```

Run this frontend against the docker services:

```bash
cd waste-packaging-regulators-fe
npm run dev:docker-backends
```

API auth secrets are not set by the script; inject them separately if the docker backends require them.

#### Mock AzureB2C auth

Config setting `MOCK_AUTH` allows the dependency on AzureB2C for logging in to be toggled on/off.

### HTTPS for local development

Azure AD B2C will only redirect back to an HTTPS URL, so the app needs to serve
HTTPS locally for end-to-end auth flows to work.

The server enables TLS automatically when **both** are true:

1. `NODE_ENV=development` (set by `npm run dev` and `nodemon.json`)
2. `certs/localhost-key.pem` and `certs/localhost-cert.pem` exist at the repo root

In production the app continues to serve plain HTTP behind an edge terminator —
this setup is dev-only.

To generate a trusted local cert pair, install [mkcert] and run:

```bash
npm run setup:certs
```

Then start the app as normal:

```bash
npm run dev
```

The startup log will show `https://localhost:7154` once TLS is active. You will
also want to set `AUTH_COOKIE_SECURE=true` in `run-dev.sh` so the session cookie
is marked secure.

[mkcert]: https://github.com/FiloSottile/mkcert

### Production

To mimic the application running in `production` mode locally run:

```bash
npm start
```

### Npm scripts

All available Npm scripts can be seen in [package.json](./package.json)
To view them in your command line run:

```bash
npm run
```

### Update dependencies

To update dependencies use [npm-check-updates](https://github.com/raineorshine/npm-check-updates):

> The following script is a good start. Check out all the options on
> the [npm-check-updates](https://github.com/raineorshine/npm-check-updates)

```bash
ncu --interactive --format group
```

### Formatting

#### Windows prettier issue

If you are having issues with formatting of line breaks on Windows update your global git config by running:

```bash
git config --global core.autocrlf false
```

## Docker

### Development image

> [!TIP]
> For Apple Silicon users, you may need to add `--platform linux/amd64` to the `docker run` command to ensure
> compatibility fEx: `docker build --platform=linux/arm64 --no-cache --tag waste-packaging-regulators-fe`

Build:

```bash
docker build --target development --no-cache --tag waste-packaging-regulators-fe:development .
```

Run:

```bash
docker run -p 3000:3000 waste-packaging-regulators-fe:development
```

### Production image

Build:

```bash
docker build --no-cache --tag waste-packaging-regulators-fe .
```

Run:

```bash
docker run -p 3000:3000 waste-packaging-regulators-fe
```

### Docker Compose

A local environment with:

- Floci (replacing Localstack) for AWS services (S3, SQS)
- Redis
- MongoDB
- This service.
- A commented out backend example.

```bash
docker compose up --build -d
```

### Dependabot

We have added an example dependabot configuration file to the repository. You can enable it by renaming
the [.github/example.dependabot.yml](.github/example.dependabot.yml) to `.github/dependabot.yml`

### SonarCloud

Instructions for setting up SonarCloud can be found in [sonar-project.properties](./sonar-project.properties).

## Licence

THIS INFORMATION IS LICENSED UNDER THE CONDITIONS OF THE OPEN GOVERNMENT LICENCE found at:

<http://www.nationalarchives.gov.uk/doc/open-government-licence/version/3>

The following attribution statement MUST be cited in your products and applications when using this information.

> Contains public sector information licensed under the Open Government license v3

### About the licence

The Open Government Licence (OGL) was developed by the Controller of Her Majesty's Stationery Office (HMSO) to enable
information providers in the public sector to license the use and re-use of their information under a common open
licence.

It is designed to encourage use and re-use of information freely and flexibly, with only a few conditions.
