import { vi } from 'vitest'

import { catchAll, errorPageFor } from './errors.js'
import { createServer } from '../../server.js'
import { statusCodes } from '../constants/status-codes.js'

const helpDeskEmail = 'eprcustomerservice@defra.gov.uk'

describe('#errors', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('Should provide expected Not Found page', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/non-existent-path'
    })

    expect(result).toEqual(
      expect.stringContaining('Page not found | waste-packaging-regulators-fe')
    )
    expect(result).toEqual(expect.stringContaining('Page not found'))
    expect(result).toEqual(
      expect.stringContaining(
        'If you typed the web address, check it is correct.'
      )
    )
    expect(result).toEqual(
      expect.stringContaining(
        'If the web address is correct or you selected a link or a button, email'
      )
    )
    expect(result).toEqual(expect.stringContaining(`mailto:${helpDeskEmail}`))
    expect(statusCode).toBe(statusCodes.notFound)
  })
})

describe('#errorPageFor', () => {
  test.each([
    [statusCodes.notFound, 'error/not-found', 'Page not found'],
    [
      statusCodes.forbidden,
      'error/access-denied',
      'You do not have permission to access this page'
    ],
    [
      statusCodes.serviceUnavailable,
      'error/service-unavailable',
      'Sorry, the service is unavailable'
    ]
  ])('Should map %i to its own page', (statusCode, view, pageTitle) => {
    expect(errorPageFor(statusCode)).toEqual({ view, pageTitle })
  })

  test.each([
    statusCodes.internalServerError,
    statusCodes.unauthorized,
    statusCodes.badRequest,
    statusCodes.imATeapot
  ])('Should map %i to the problem with the service page', (statusCode) => {
    expect(errorPageFor(statusCode)).toEqual({
      view: 'error/problem-with-service',
      pageTitle: 'Sorry, there is a problem with the service'
    })
  })
})

describe('#catchAll', () => {
  const mockRequest = (statusCode) => ({
    response: {
      isBoom: true,
      output: { statusCode }
    }
  })
  const mockToolkitView = vi.fn()
  const mockToolkitCode = vi.fn()
  const mockToolkitContinue = Symbol('continue')
  const mockToolkit = {
    view: mockToolkitView.mockReturnThis(),
    code: mockToolkitCode.mockReturnThis(),
    continue: mockToolkitContinue
  }

  beforeEach(() => {
    mockToolkitView.mockClear()
    mockToolkitCode.mockClear()
  })

  test('Should provide expected "Page not found" page', () => {
    catchAll(mockRequest(statusCodes.notFound), mockToolkit)

    expect(mockToolkitView).toHaveBeenCalledWith('error/not-found', {
      pageTitle: 'Page not found',
      availableFrom: ''
    })
    expect(mockToolkitCode).toHaveBeenCalledWith(statusCodes.notFound)
  })

  test('Should provide expected "Access denied" page', () => {
    catchAll(mockRequest(statusCodes.forbidden), mockToolkit)

    expect(mockToolkitView).toHaveBeenCalledWith('error/access-denied', {
      pageTitle: 'You do not have permission to access this page',
      availableFrom: ''
    })
    expect(mockToolkitCode).toHaveBeenCalledWith(statusCodes.forbidden)
  })

  test('Should provide expected "Service unavailable" page', () => {
    catchAll(mockRequest(statusCodes.serviceUnavailable), mockToolkit)

    expect(mockToolkitView).toHaveBeenCalledWith('error/service-unavailable', {
      pageTitle: 'Sorry, the service is unavailable',
      availableFrom: ''
    })
    expect(mockToolkitCode).toHaveBeenCalledWith(statusCodes.serviceUnavailable)
  })

  test.each([
    statusCodes.internalServerError,
    statusCodes.unauthorized,
    statusCodes.badRequest,
    statusCodes.imATeapot
  ])(
    'Should provide the "problem with the service" page for %i',
    (statusCode) => {
      catchAll(mockRequest(statusCode), mockToolkit)

      expect(mockToolkitView).toHaveBeenCalledWith(
        'error/problem-with-service',
        {
          pageTitle: 'Sorry, there is a problem with the service',
          availableFrom: ''
        }
      )
      expect(mockToolkitCode).toHaveBeenCalledWith(statusCode)
    }
  )

  test('Should continue when the response is not a Boom error', () => {
    const result = catchAll({ response: {} }, mockToolkit)

    expect(result).toBe(mockToolkitContinue)
    expect(mockToolkitView).not.toHaveBeenCalled()
  })
})
