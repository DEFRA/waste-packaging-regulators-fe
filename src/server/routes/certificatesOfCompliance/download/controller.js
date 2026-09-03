import { config } from '#config/config.js'
import { handleApiError } from '#server/common/helpers/handle-api-error.js'
import { getLocale } from '#server/common/helpers/i18n/get-locale.js'
import { persistAuthLocale } from '#server/common/helpers/i18n/locale-url.js'
import { getComplianceDownload } from './download.service.js'
import Boom from '@hapi/boom'

const VALID_ORGANISATION_TYPES = new Set([
  'direct-producers',
  'compliance-schemes'
])
const VALID_SUBMISSION_STATUSES = new Set([
  'pending',
  'accepted',
  'not-submitted'
])

export const certificatesOfComplianceDownloadController = {
  async handler(request, h) {
    if (!request.yar.get('user')) {
      const locale = getLocale(request)
      persistAuthLocale(request, locale)
      request.yar.set('returnTo', request.url.pathname + request.url.search)
      return h.redirect('/signin-oidc')
    }

    const {
      organisation_type: organisationType,
      submission_status: submissionStatus
    } = request.query

    if (!VALID_ORGANISATION_TYPES.has(organisationType)) {
      throw Boom.badRequest(`Invalid organisation_type: ${organisationType}`)
    }

    if (!VALID_SUBMISSION_STATUSES.has(submissionStatus)) {
      throw Boom.badRequest(`Invalid submission_status: ${submissionStatus}`)
    }

    const traceId = request.headers[config.get('tracing.header')]

    const { filename, csv } = await getComplianceDownload(
      organisationType,
      submissionStatus,
      traceId
    ).catch((error) => {
      handleApiError(request, error)
      throw error
    })

    return h
      .response(csv)
      .type('text/csv; charset=utf-8')
      .header('content-disposition', `attachment; filename="${filename}"`)
  }
}
