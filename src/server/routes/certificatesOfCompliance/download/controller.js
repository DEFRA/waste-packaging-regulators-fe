import { config } from '#config/config.js'
import { getSessionUser } from '#server/common/helpers/get-session-user.js'
import { getRegulatorCountryCode } from '#server/common/helpers/regulator-country-code.js'
import { getComplianceReport } from './report.service.js'
import Boom from '@hapi/boom'

const VALID_ORGANISATION_TYPES = new Set([
  'direct-producers',
  'compliance-schemes'
])

export const XLSX_CONTENT_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

export const certificatesOfComplianceDownloadController = {
  async handler(request, h) {
    const { organisation_type: organisationType } = request.query

    if (!VALID_ORGANISATION_TYPES.has(organisationType)) {
      throw Boom.badRequest(`Invalid organisation_type: ${organisationType}`)
    }

    const traceId = request.headers[config.get('tracing.header')]
    const sessionUser = getSessionUser(request)
    const country = getRegulatorCountryCode(sessionUser)

    if (country == null && sessionUser != null) {
      request.logger.warn(
        'Session user has no mapped nationId; compliance report will not be filtered by country'
      )
    }

    const { filename, buffer } = await getComplianceReport(
      organisationType,
      traceId,
      country
    )

    return h
      .response(buffer)
      .type(XLSX_CONTENT_TYPE)
      .header('content-disposition', `attachment; filename="${filename}"`)
      .header('Cache-Control', 'no-store')
  }
}
