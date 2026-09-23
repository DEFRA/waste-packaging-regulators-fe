import { vi } from 'vitest'

import { handleApiError, userFacingStatus } from './handle-api-error.js'
import { ApiError } from '#services/apiBaseClient/api-error.js'
import { statusCodes } from '../constants/status-codes.js'

const mockRequest = () => ({ logger: { error: vi.fn() } })

const apiError = (status) =>
  ApiError.from({
    message: `waste-obligations API request failed with status ${status}`,
    status,
    serviceName: 'waste-obligations',
    method: 'GET',
    url: 'https://waste-obligations.example/compliance-declarations'
  })

const caught = (request, error) => {
  try {
    handleApiError(request, error)
  } catch (thrown) {
    return thrown
  }

  return null
}

describe('#userFacingStatus', () => {
  test.each([
    ['a shuttered or undeployed route', statusCodes.notFound],
    ['rate limiting', statusCodes.tooManyRequests],
    ['a bad gateway', statusCodes.badGateway],
    ['an unavailable backend', statusCodes.serviceUnavailable],
    ['a gateway timeout', statusCodes.gatewayTimeout],
    ['a call that never landed', null]
  ])('Should treat %s as the service being unavailable', (_reason, status) => {
    expect(userFacingStatus(status)).toBe(statusCodes.serviceUnavailable)
  })

  test.each([
    ['a request we built wrongly', statusCodes.badRequest],
    ['our credentials being rejected', statusCodes.unauthorized],
    ['our access being refused', statusCodes.forbidden],
    ['a backend that is up but broken', statusCodes.internalServerError]
  ])('Should treat %s as a problem with the service', (_reason, status) => {
    expect(userFacingStatus(status)).toBe(statusCodes.internalServerError)
  })

  // The invariant the AMCR-485 fix exists to hold: whatever a backend answers,
  // the user is never handed a page that talks about their own request.
  test('Should never show the user a page about their own request', () => {
    const everyErrorStatus = Array.from(
      { length: 200 },
      (_, index) => 400 + index
    )

    const leaked = everyErrorStatus.filter(
      (status) =>
        ![
          statusCodes.serviceUnavailable,
          statusCodes.internalServerError
        ].includes(userFacingStatus(status))
    )

    expect(leaked).toEqual([])
  })
})

describe('#handleApiError', () => {
  test('Should surface an upstream 404 as a service unavailable response', () => {
    const request = mockRequest()

    const thrown = caught(request, apiError(statusCodes.notFound))

    expect(thrown.isBoom).toBe(true)
    expect(thrown.output.statusCode).toBe(statusCodes.serviceUnavailable)
    // The upstream detail has to survive for the boom error logger to report it.
    expect(thrown).toMatchObject({
      status: statusCodes.notFound,
      serviceName: 'waste-obligations'
    })
  })

  test('Should surface an upstream 403 as a problem with the service', () => {
    const request = mockRequest()

    const thrown = caught(request, apiError(statusCodes.forbidden))

    expect(thrown.isBoom).toBe(true)
    expect(thrown.output.statusCode).toBe(statusCodes.internalServerError)
  })

  test('Should surface an unreachable service as service unavailable', () => {
    const request = mockRequest()
    const networkFailure = ApiError.networkFailure({
      serviceName: 'waste-obligations',
      method: 'GET',
      url: 'https://waste-obligations.example/compliance-declarations',
      cause: new Error('ECONNREFUSED')
    })

    const thrown = caught(request, networkFailure)

    expect(thrown.isBoom).toBe(true)
    expect(thrown.output.statusCode).toBe(statusCodes.serviceUnavailable)
  })

  test('Should log the api error once', () => {
    const request = mockRequest()
    const error = apiError(statusCodes.notFound)

    caught(request, error)

    expect(request.logger.error).toHaveBeenCalledTimes(1)
    expect(request.logger.error).toHaveBeenCalledWith(error)
  })

  test('Should rethrow a non api error untouched', () => {
    const request = mockRequest()
    const error = new Error('something else went wrong')

    const thrown = caught(request, error)

    expect(thrown).toBe(error)
    expect(thrown.isBoom).toBeUndefined()
    expect(request.logger.error).not.toHaveBeenCalled()
  })
})
