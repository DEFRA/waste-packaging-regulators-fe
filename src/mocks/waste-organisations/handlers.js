// waste-organisations backend mock: serves the organisation registry from a
// bound organisations data set.

import { http, HttpResponse } from 'msw'

import { config } from '#config/config.js'
import { dataHandler, notFound, trimTrailingSlash } from '#mocks/http.js'

export function organisationsHandlers(data) {
  const base = trimTrailingSlash(config.get('wasteOrganisationsApi.baseUrl'))

  return [
    http.get(
      `${base}/organisations`,
      dataHandler(({ request }) => {
        const registrations = new URL(request.url).searchParams.get(
          'registrations'
        )
        return HttpResponse.json({
          organisations: data.listWasteOrganisations(registrations)
        })
      })
    ),
    http.get(
      `${base}/organisations/:organisationId`,
      dataHandler(({ params }) => {
        const organisation = data.getWasteOrganisation(params.organisationId)
        return organisation
          ? HttpResponse.json(organisation)
          : notFound('Organisation not found')
      })
    )
  ]
}
