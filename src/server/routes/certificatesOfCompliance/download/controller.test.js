import { vi } from 'vitest'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { setupRegulatorsApp } from '#test-helpers/msw/harness.js'
import * as downloadService from './download.service.js'

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
})
