import { vi } from 'vitest'

import { catchAll, errorPageFor } from './errors.js'
import { createServer } from '../../server.js'
import { statusCodes } from '../constants/status-codes.js'

const helpDeskEmail = 'eprcustomerservice@defra.gov.uk'

// The single place the user-facing headings are written down outside errors.js.
// Deliberately literal: asserting against the mapping's own constants would
// make these tests tautological. Other suites read the titles from the mapping.
const pageTitles = {
  notFound: 'Page not found',
  accessDenied: 'You do not have permission to access this page',
  serviceUnavailable: 'Sorry, the service is unavailable',
  problemWithService: 'Sorry, there is a problem with the service'
}

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
    expect(result).toEqual(expect.stringContaining(pageTitles.notFound))
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
    [statusCodes.notFound, 'error/not-found', pageTitles.notFound],
    [statusCodes.forbidden, 'error/access-denied', pageTitles.accessDenied],
    [
      statusCodes.serviceUnavailable,
      'error/service-unavailable',
      pageTitles.serviceUnavailable
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
      pageTitle: pageTitles.problemWithService
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
      pageTitle: pageTitles.notFound,
      availableFrom: ''
    })
    expect(mockToolkitCode).toHaveBeenCalledWith(statusCodes.notFound)
  })

  test('Should provide expected "Access denied" page', () => {
    catchAll(mockRequest(statusCodes.forbidden), mockToolkit)

    expect(mockToolkitView).toHaveBeenCalledWith('error/access-denied', {
      pageTitle: pageTitles.accessDenied,
      availableFrom: ''
    })
    expect(mockToolkitCode).toHaveBeenCalledWith(statusCodes.forbidden)
  })

  test('Should provide expected "Service unavailable" page', () => {
    catchAll(mockRequest(statusCodes.serviceUnavailable), mockToolkit)

    expect(mockToolkitView).toHaveBeenCalledWith('error/service-unavailable', {
      pageTitle: pageTitles.serviceUnavailable,
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
          pageTitle: pageTitles.problemWithService,
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
