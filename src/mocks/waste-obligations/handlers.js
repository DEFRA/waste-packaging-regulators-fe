// waste-obligations backend mock: serves the compliance-declarations and
// obligations endpoints from a bound obligations data set.

import { http, HttpResponse } from 'msw'

import { config } from '#config/config.js'
import { dataHandler, notFound, trimTrailingSlash } from '#mocks/http.js'

export function obligationsHandlers(data) {
  const base = trimTrailingSlash(config.get('wasteObligationsApi.baseUrl'))

  return [
    http.get(
      `${base}/compliance-declarations`,
      dataHandler(({ request }) =>
        HttpResponse.json(
          data.queryDeclarations(new URL(request.url).searchParams)
        )
      )
    ),
    http.get(
      `${base}/organisations/:organisationId/compliance-declarations/:id`,
      dataHandler(({ params }) => {
        const declaration = data.getDeclarationById(params.id)
        return declaration
          ? HttpResponse.json(declaration)
          : notFound('Declaration not found')
      })
    ),
    http.get(
      `${base}/organisations/:organisationId/compliance-declarations`,
      dataHandler(({ params }) =>
        HttpResponse.json({
          complianceDeclarations: data.declarationsForOrganisation(
            params.organisationId
          )
        })
      )
    ),
    http.patch(
      `${base}/organisations/:organisationId/compliance-declarations/:id`,
      dataHandler(({ params }) => {
        const declaration = data.getDeclarationById(params.id)
        return declaration
          ? HttpResponse.json(declaration)
          : notFound('Declaration not found')
      })
    ),
    http.get(
      `${base}/organisations/:organisationId/obligations`,
      dataHandler(({ params }) =>
        HttpResponse.json(
          data.obligationsForOrganisation(params.organisationId)
        )
      )
    )
  ]
}
