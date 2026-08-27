// Account API backend mock: serves organisation lookups and nominated contacts
// from a bound account data set, plus the signed-in user and the OAuth
// client-credentials token the bearer-auth Account client needs.

import { http, HttpResponse } from 'msw'

import { config } from '#config/config.js'
import { dataHandler, notFound, trimTrailingSlash } from '#mocks/http.js'
import { mockAccountUser } from './fixtures.js'

export function accountHandlers(data) {
  const base = trimTrailingSlash(config.get('accountApi.baseUrl'))
  const tokenEndpoint = config.get('accountApi.tokenEndpoint')

  return [
    http.post(
      `${base}/api/organisations/organisations-by-externalIds`,
      dataHandler(async ({ request }) => {
        const body = await request.json().catch(() => ({}))
        return HttpResponse.json(
          data.organisationsByExternalIds(body?.externalIds ?? [])
        )
      })
    ),
    http.post(
      `${base}/api/organisations/organisations-by-companies-house-numbers`,
      dataHandler(async ({ request }) => {
        const body = await request.json().catch(() => ({}))
        return HttpResponse.json(
          data.organisationsByCompaniesHouseNumbers(
            body?.companiesHouseNumbers ?? []
          )
        )
      })
    ),
    http.get(
      `${base}/api/organisations/organisation-with-persons/:organisationId`,
      dataHandler(({ params }) => {
        const organisation = data.organisationWithPersons(params.organisationId)
        return organisation
          ? HttpResponse.json(organisation)
          : notFound('Organisation not found')
      })
    ),
    http.get(
      `${base}/api/organisations/person-emails`,
      dataHandler(({ request }) => {
        const organisationId = new URL(request.url).searchParams.get(
          'organisationId'
        )
        return HttpResponse.json(data.personEmails(organisationId))
      })
    ),
    http.get(
      `${base}/api/users/user-organisations`,
      dataHandler(() => HttpResponse.json({ user: mockAccountUser }))
    ),
    http.post(tokenEndpoint, () =>
      HttpResponse.json({
        access_token: 'mock-account-api-access-token',
        token_type: 'Bearer',
        expires_in: 3600
      })
    )
  ]
}
