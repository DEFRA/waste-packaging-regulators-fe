import { vi } from 'vitest'
import { statusCodes } from '#server/common/constants/status-codes.js'
import * as getSessionUserModule from '#server/common/helpers/get-session-user.js'
import { setupRegulatorsApp } from '#test-helpers/msw/harness.js'
import * as reportService from './report.service.js'
import { XLSX_CONTENT_TYPE } from './controller.js'
import { ApiError } from '#services/apiBaseClient/api-error.js'

const DOWNLOAD_URL =
  '/certificates-of-compliance/download?organisation_type=direct-producers'

const stubReport = () =>
  vi.spyOn(reportService, 'getComplianceReport').mockResolvedValue({
    filename: '2026-certificates-of-compliance-all-19-10-2026.xlsx',
    buffer: Buffer.from('xlsx')
  })

describe('#certificatesOfComplianceDownloadController', () => {
  const app = setupRegulatorsApp()

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('redirects unauthenticated users to sign-in', async () => {
    const response = await app.get(DOWNLOAD_URL, null)

    expect(response.statusCode).toBe(302)
    expect(response.headers.location).toBe(
      '/certificates-of-compliance/signin-oidc'
    )
  })

  test('keeps Welsh on the sign-in redirect', async () => {
    const response = await app.get(`${DOWNLOAD_URL}&lang=cy`, null)

    expect(response.statusCode).toBe(302)
    expect(response.headers.location).toBe(
      '/certificates-of-compliance/signin-oidc?lang=cy'
    )
  })

  test.each(['invalid', ''])(
    'returns a bad request for organisation_type %p',
    async (organisationType) => {
      const response = await app.get(
        `/certificates-of-compliance/download?organisation_type=${organisationType}`
      )

      expect(response.statusCode).toBe(statusCodes.badRequest)
    }
  )

  test('returns the report as an Excel attachment that is not cached', async () => {
    stubReport()

    const response = await app.get(DOWNLOAD_URL)

    expect(response.statusCode).toBe(statusCodes.ok)
    expect(response.headers['content-type']).toBe(XLSX_CONTENT_TYPE)
    expect(response.headers['content-disposition']).toBe(
      'attachment; filename="2026-certificates-of-compliance-all-19-10-2026.xlsx"'
    )
    expect(response.headers['cache-control']).toBe('no-store')
    expect(response.rawPayload.toString()).toBe('xlsx')
  })

  test('passes the session regulator country to the report service', async () => {
    stubReport()

    const cookie = await app.signIn()
    const response = await app.get(DOWNLOAD_URL, cookie)

    expect(response.statusCode).toBe(statusCodes.ok)
    expect(reportService.getComplianceReport).toHaveBeenCalledWith(
      'direct-producers',
      undefined,
      'GB-ENG'
    )
  })

  test.each([
    [3, 'GB-SCT'],
    [99, null]
  ])(
    'maps session nationId %p to country %p',
    async (nationId, expectedCountry) => {
      vi.spyOn(getSessionUserModule, 'getSessionUser').mockReturnValue({
        nationId
      })
      stubReport()

      const cookie = await app.signIn()
      const response = await app.get(
        '/certificates-of-compliance/download?organisation_type=compliance-schemes',
        cookie
      )

      expect(response.statusCode).toBe(statusCodes.ok)
      expect(reportService.getComplianceReport).toHaveBeenCalledWith(
        'compliance-schemes',
        undefined,
        expectedCountry
      )
    }
  )

  test.each([
    [statusCodes.serviceUnavailable, 'Report unavailable'],
    [statusCodes.internalServerError, 'Report broke']
  ])(
    'propagates a %p ApiError from the report service',
    async (status, message) => {
      vi.spyOn(reportService, 'getComplianceReport').mockRejectedValueOnce(
        new ApiError({ status, message })
      )

      const response = await app.get(DOWNLOAD_URL)

      expect(response.statusCode).toBe(status)
    }
  )
})
