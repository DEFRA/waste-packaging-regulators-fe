import { UNKNOWN_ORGANISATION } from './constants.js'
import { isComplianceSchemeRegistrationType } from './display.js'

export function mapOrganisationName(organisation) {
  if (isComplianceSchemeRegistrationType(organisation.registrationType)) {
    return (
      organisation.tradingName ??
      organisation.name ??
      organisation.schemeOperatorName ??
      UNKNOWN_ORGANISATION
    )
  }
  return organisation.name ?? UNKNOWN_ORGANISATION
}
