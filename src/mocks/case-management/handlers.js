import { http, HttpResponse } from 'msw'

import { config } from '#config/config.js'
import { dataHandler, trimTrailingSlash } from '#mocks/http.js'

export function caseManagementHandlers(store) {
  const base = trimTrailingSlash(config.get('caseManagementApi.baseUrl'))

  return [
    http.get(
      `${base}/cases`,
      dataHandler(({ request }) => {
        const url = new URL(request.url)
        const caseTypes = url.searchParams.getAll('caseType')
        const unassigned = url.searchParams.get('unassigned') === 'true'
        const isTerminal = url.searchParams.get('isTerminal')
        const producerTypes = url.searchParams.getAll('producerType')
        const page = Number.parseInt(url.searchParams.get('page') ?? '1', 10)
        const pageSize = Number.parseInt(
          url.searchParams.get('pageSize') ?? '20',
          10
        )
        const nation = request.headers.get('x-cdp-user-nation')

        const body = store.listCases({
          nation: nation || null,
          caseTypes,
          unassignedOnly: unassigned,
          isTerminal: isTerminal == null ? null : isTerminal === 'true',
          producerTypes,
          page,
          pageSize
        })

        return HttpResponse.json(body)
      })
    )
  ]
}
