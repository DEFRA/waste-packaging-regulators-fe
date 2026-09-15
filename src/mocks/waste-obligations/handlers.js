// waste-obligations backend mock: serves the compliance-declarations and
// obligations endpoints from a bound obligations data set.

import { http, HttpResponse } from 'msw'

import { config } from '#config/config.js'
import {
  badRequest,
  dataHandler,
  notFound,
  trimTrailingSlash
} from '#mocks/http.js'
import { UNSUBMITTED_SORT_FIELDS, parseUnsubmittedSort } from './query.js'

// The real request DTO rejects these, and the frontend's design depends on every
// one of them holding. A mock more permissive than production is the drift that
// actually bites: it would let a bad page size or sort field pass here and fail
// for the first time in a deployed environment.
const UNSUBMITTED_RANGES = {
  page: [1, Number.MAX_SAFE_INTEGER],
  pageSize: [1, 100],
  obligationYear: [2023, 2050]
}

function unsubmittedRequestErrors(searchParams) {
  const errors = {}

  for (const [param, [min, max]] of Object.entries(UNSUBMITTED_RANGES)) {
    const raw = searchParams.get(param)
    const value = Number(raw)
    if (
      raw != null &&
      (!Number.isInteger(value) || value < min || value > max)
    ) {
      errors[param] = [`The field ${param} must be between ${min} and ${max}.`]
    }
  }

  if (searchParams.get('search')?.length > 100) {
    errors.search = ['The field search must have a maximum length of 100.']
  }

  const sort = searchParams.get('sort')
  if (
    sort != null &&
    parseUnsubmittedSort(sort).some(
      (term) => !UNSUBMITTED_SORT_FIELDS.includes(term?.field)
    )
  ) {
    errors.sort = ['Invalid unsubmitted compliance declaration sort']
  }

  return Object.keys(errors).length > 0 ? errors : null
}

export function obligationsHandlers(data) {
  const base = trimTrailingSlash(config.get('wasteObligationsApi.baseUrl'))

  return [
    http.get(
      `${base}/compliance-declarations/unsubmitted`,
      dataHandler(({ request }) => {
        const searchParams = new URL(request.url).searchParams
        const errors = unsubmittedRequestErrors(searchParams)
        return errors
          ? badRequest(errors)
          : HttpResponse.json(data.queryUnsubmitted(searchParams))
      })
    ),
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
