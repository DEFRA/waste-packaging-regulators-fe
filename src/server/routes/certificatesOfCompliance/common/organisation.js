import { UNKNOWN_ORGANISATION } from './constants.js'
import { isComplianceSchemeRegistrationType } from './display.js'

export function mapOrganisationName(organisation) {
  if (isComplianceSchemeRegistrationType(organisation.registrationType)) {
    return (
      organisation.schemeOperatorName ??
      organisation.name ??
      UNKNOWN_ORGANISATION
    )
  }
  return organisation.name ?? UNKNOWN_ORGANISATION
}
