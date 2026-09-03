import { translateActionLabels } from '../common/locale-strings.js'
import {
  displayOrNoData,
  complianceDocumentNoun,
  buildComplianceTypeLabel,
  buildRegulation43Statement,
  isComplianceSchemeRegistrationType
} from '../common/display.js'
import { mapOrganisationName } from '../common/organisation.js'
import { formatSubmissionDate } from '../common/dates.js'
import {
  mapWasteOrganisationToDetailFields,
  mapCompaniesHouseNumberFromWasteOrganisation,
  mapRegistrationTypeToOrganisationType
} from '../common/registration-type.js'
import { mapDeclarationStatusToReviewStatus } from '../actions/status.js'
import { buildCertificateDetailActions } from '../actions/detail-actions.js'
import { findSubmittedAuditUser } from './audit.js'
import {
  mapDeclarationMaterialGroups,
  deriveRecyclingObligationsMet,
  mapRecyclingObligationsMet
} from './detail-mapping-materials.js'
import {
  mapAcceptedOutcomeFields,
  mapCancelledOutcomeFields,
  mapQueriedOutcome,
  mapCurrentYearHistory,
  buildCurrentYearDeclarations
} from './detail-mapping-history.js'

export { deriveRecyclingObligationsMet } from './detail-mapping-materials.js'

function noDetailActions(locale = 'en') {
  return {
    showAccept: false,
    showCancel: false,
    labels: translateActionLabels('DirectProducer', locale),
    urls: { accept: '#', cancel: '#' }
  }
}

function resolveDeclarationActions(
  reviewStatus,
  resolvedOrganisationId,
  resolvedId,
  registrationType,
  locale = 'en'
) {
  if (resolvedOrganisationId && resolvedId) {
    return buildCertificateDetailActions(
      reviewStatus,
      resolvedOrganisationId,
      resolvedId,
      registrationType,
      locale
    )
  }

  return noDetailActions(locale)
}

function mapDeclarationComplianceFields(
  organisation,
  {
    obligationYear,
    obligationStatus,
    isRegulation43Compliant,
    companyName,
    created,
    locale = 'en'
  }
) {
  return {
    complianceYear: obligationYear == null ? null : String(obligationYear),
    complianceTypeLabel: buildComplianceTypeLabel(
      obligationYear,
      organisation.registrationType,
      locale
    ),
    complianceDocumentNoun: complianceDocumentNoun(
      organisation.registrationType,
      locale
    ),
    recyclingObligationsMet: mapRecyclingObligationsMet(obligationStatus),
    regulation43Met: isRegulation43Compliant ?? null,
    regulation43Statement: buildRegulation43Statement(
      isRegulation43Compliant ?? null,
      companyName,
      locale
    ),
    dateDeclarationSubmitted: displayOrNoData(
      formatSubmissionDate(created, locale),
      locale
    )
  }
}

function mapDeclarationContactFields(
  organisation,
  {
    wasteOrganisation,
    submittedUser,
    submitterPhoneNumber,
    submitterName,
    locale = 'en'
  }
) {
  return {
    organisationType: mapRegistrationTypeToOrganisationType(
      organisation.registrationType,
      locale
    ),
    registrationType: organisation.registrationType,
    environmentalRegulator: organisation.regulator ?? null,
    businessCountry: wasteOrganisation?.businessCountry ?? null,
    organisationRef: displayOrNoData(organisation.referenceNumber, locale),
    companiesHouseNumber: mapCompaniesHouseNumberFromWasteOrganisation(
      wasteOrganisation,
      locale
    ),
    nameOnAccount: displayOrNoData(submittedUser?.name, locale),
    declarationEmailAddress: displayOrNoData(submittedUser?.email, locale),
    companyPhoneNumber: displayOrNoData(submitterPhoneNumber, locale),
    declarationSignedBy: displayOrNoData(submitterName, locale)
  }
}

export function mapDeclarationToDetail(
  data,
  {
    organisationId,
    id,
    declarationsForYear,
    submitterPhoneNumber,
    wasteOrganisation,
    locale = 'en'
  } = {}
) {
  const {
    organisation,
    obligationYear,
    obligations,
    obligationStatus,
    isRegulation43Compliant,
    submitterName,
    created,
    status
  } = data

  const reviewStatus = mapDeclarationStatusToReviewStatus(status)
  const resolvedOrganisationId = organisationId ?? organisation?.id ?? null
  const resolvedId = id ?? data.id ?? null
  const companyName = mapOrganisationName(organisation)
  const submittedUser = findSubmittedAuditUser(data.audit)
  const historyDeclarations = buildCurrentYearDeclarations(
    declarationsForYear,
    data,
    status,
    resolvedId
  )

  return {
    organisationId: resolvedOrganisationId,
    declarationId: resolvedId,
    companyName,
    declarationStatus: data.status,
    reviewStatus,
    showDeclaration: true,
    showSubmittedOn: true,
    showNameOnAccount: true,
    ...mapDeclarationComplianceFields(organisation, {
      obligationYear,
      obligationStatus,
      isRegulation43Compliant,
      companyName,
      created,
      locale
    }),
    ...mapAcceptedOutcomeFields(data, locale),
    ...mapCancelledOutcomeFields(data, locale),
    ...mapDeclarationContactFields(organisation, {
      wasteOrganisation,
      submittedUser,
      submitterPhoneNumber,
      submitterName,
      locale
    }),
    ...mapDeclarationMaterialGroups(obligations),
    actions: resolveDeclarationActions(
      reviewStatus,
      resolvedOrganisationId,
      resolvedId,
      organisation.registrationType,
      locale
    ),
    queryDetails: mapQueriedOutcome(data, locale),
    currentYearActions: mapCurrentYearHistory(
      resolvedOrganisationId,
      historyDeclarations,
      locale
    ),
    showObligations: (obligations ?? []).length !== 0
  }
}

export function mapObligationToDetail(
  data,
  {
    obligationYear,
    organisation,
    accountOrganisationName,
    accountOrganisationReferenceNumber,
    accountOrganisationContact,
    locale = 'en'
  } = {}
) {
  const obligations = data?.obligations ?? []
  const materialGroups = mapDeclarationMaterialGroups(obligations)

  const orgFields = mapWasteOrganisationToDetailFields(organisation, {
    obligationYear,
    locale
  })

  // Compliance schemes take their name from the waste-organisations record (as
  // on the listing); direct producers keep the Account API name (waste-org as
  // fallback).
  const companyName = isComplianceSchemeRegistrationType(
    orgFields.registrationType
  )
    ? orgFields.companyName
    : (accountOrganisationName ?? orgFields.companyName)

  const noData = displayOrNoData(null, locale)

  return {
    complianceYear: obligationYear == null ? null : String(obligationYear),
    complianceTypeLabel: buildComplianceTypeLabel(
      obligationYear,
      orgFields.registrationType,
      locale
    ),
    ...orgFields,
    companyName: displayOrNoData(companyName, locale),
    declarationStatus: 'Unsubmitted',
    reviewStatus: null,
    showDeclaration: false,
    showSubmittedOn: false,
    showNameOnAccount: false,
    complianceDocumentNoun: complianceDocumentNoun(
      orgFields.registrationType,
      locale
    ),
    recyclingObligationsMet: deriveRecyclingObligationsMet(obligations),
    regulation43Met: null,
    dateDeclarationSubmitted: noData,
    // Organisation ID mirrors the listing: the Account API reference number
    // (or "No data"). Never the internal external id / GUID.
    organisationRef: displayOrNoData(
      accountOrganisationReferenceNumber ?? organisation?.referenceNumber,
      locale
    ),
    nameOnAccount: noData,
    declarationEmailAddress: displayOrNoData(
      accountOrganisationContact?.email,
      locale
    ),
    companyPhoneNumber: displayOrNoData(
      accountOrganisationContact?.telephoneNumber,
      locale
    ),
    declarationSignedBy: noData,
    ...materialGroups,
    actions: noDetailActions(locale),
    showAcceptedOutcome: false,
    acceptedBy: null,
    acceptedDate: null,
    showCancelledOutcome: false,
    cancelledBy: null,
    cancelledDate: null,
    cancellationReason: null,
    currentYearActions: [],
    showObligations: obligations.length !== 0
  }
}
