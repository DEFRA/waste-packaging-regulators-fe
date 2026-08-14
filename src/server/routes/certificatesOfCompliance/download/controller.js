import { config } from '#config/config.js'
import { handleApiError } from '#server/common/helpers/handle-api-error.js'
import { getComplianceDownload } from './download.service.js'
import Boom from '@hapi/boom'

const VALID_ORGANISATION_TYPES = ['direct-producers', 'compliance-schemes']
const VALID_SUBMISSION_STATUSES = ['pending', 'accepted', 'not-submitted']

export const certificatesOfComplianceDownloadController = {
  async handler(request, h) {
    if (!request.yar.get('user')) {
      request.yar.set('returnTo', request.url.pathname + request.url.search)
      return h.redirect('/signin-oidc')
    }

    const {
      organisation_type: organisationType,
      submission_status: submissionStatus
    } = request.query

    if (!VALID_ORGANISATION_TYPES.includes(organisationType)) {
      throw Boom.badRequest(`Invalid organisation_type: ${organisationType}`)
    }

    if (!VALID_SUBMISSION_STATUSES.includes(submissionStatus)) {
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
