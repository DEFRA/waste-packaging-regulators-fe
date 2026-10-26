import { vi } from 'vitest'
import { statusCodes } from '#server/common/constants/status-codes.js'
import * as getSessionUserModule from '#server/common/helpers/get-session-user.js'
import { setupRegulatorsApp } from '#test-helpers/msw/harness.js'
import * as downloadService from './download.service.js'
import { ApiError } from '#services/apiBaseClient/api-error.js'

const DOWNLOAD_URL =
  '/certificates-of-compliance/download?organisation_type=direct-producers&submission_status=pending'

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

  test('passes session regulator country to the download service', async () => {
    vi.spyOn(downloadService, 'getComplianceDownload').mockResolvedValue({
      filename: 'test.csv',
      csv: 'Organisation name\n'
    })

    const cookie = await app.signIn()
    const response = await app.get(DOWNLOAD_URL, cookie)

    expect(response.statusCode).toBe(statusCodes.ok)
    expect(downloadService.getComplianceDownload).toHaveBeenCalledWith(
      'direct-producers',
      'pending',
      undefined,
      'GB-ENG'
    )
  })

  test('passes null country when session user has unmapped nationId', async () => {
    vi.spyOn(getSessionUserModule, 'getSessionUser').mockReturnValue({
      nationId: 99
    })
    vi.spyOn(downloadService, 'getComplianceDownload').mockResolvedValue({
      filename: 'test.csv',
      csv: 'Organisation name\n'
    })

    const cookie = await app.signIn()
    const response = await app.get(DOWNLOAD_URL, cookie)

    expect(response.statusCode).toBe(statusCodes.ok)
    expect(downloadService.getComplianceDownload).toHaveBeenCalledWith(
      'direct-producers',
      'pending',
      undefined,
      null
    )
  })

  test('propagates service unavailable when download service fails with an unavailable ApiError', async () => {
    vi.spyOn(downloadService, 'getComplianceDownload').mockRejectedValueOnce(
      new ApiError({
        status: statusCodes.serviceUnavailable,
        message: 'Download unavailable'
      })
    )

    const cookie = await app.signIn()
    const response = await app.get(DOWNLOAD_URL, cookie)

    expect(response.statusCode).toBe(statusCodes.serviceUnavailable)
  })

  test('propagates internal server error when download service fails with a 500 ApiError', async () => {
    vi.spyOn(downloadService, 'getComplianceDownload').mockRejectedValueOnce(
      new ApiError({
        status: statusCodes.internalServerError,
        message: 'Download broke'
      })
    )

    const cookie = await app.signIn()
    const response = await app.get(DOWNLOAD_URL, cookie)

    expect(response.statusCode).toBe(statusCodes.internalServerError)
  })
})
