import { GLASS_BREAKDOWN_MATERIALS } from '../common/constants.js'
import { translateActionLabels } from '../common/locale-strings.js'
import {
  displayOrNoData,
  complianceDocumentNoun,
  buildComplianceTypeLabel,
  buildRegulation43Statement,
  isComplianceSchemeRegistrationType
} from '../common/display.js'
import { mapOrganisationName } from '../common/organisation.js'
import {
  formatSubmissionDate,
  formatDate,
  formatHistoryDate
} from '../common/dates.js'
import {
  mapWasteOrganisationToDetailFields,
  mapCompaniesHouseNumberFromWasteOrganisation,
  mapRegistrationTypeToOrganisationType
} from '../common/registration-type.js'
import { mapDeclarationStatusToReviewStatus } from '../actions/status.js'
import {
  buildCertificateDetailActions,
  buildCertificateDetailPath
} from '../actions/detail-actions.js'
import {
  findSubmittedAuditUser,
  findAuditEntryByAction,
  auditAction
} from './audit.js'

function mapRecyclingObligationsMet(obligationStatus) {
  if (obligationStatus == null) {
    return null
  }
  return obligationStatus.toLowerCase() === 'met'
}

function mapMaterialTotalsStatusToRecyclingObligationsMet(
  status,
  { hasObligations } = {}
) {
  if (!hasObligations) {
    return null
  }

  switch (status) {
    case 'met':
      return true
    case 'not-met':
      return false
    case 'no-data':
      return null
    default:
      throw new Error(`Unexpected material totals status: ${status}`)
  }
}

function mapAcceptedOutcomeFields(data, locale = 'en') {
  if (data.status !== 'Accepted') {
    return {
      showAcceptedOutcome: false,
      acceptedBy: null,
      acceptedDate: null
    }
  }

  const acceptedAudit = findAuditEntryByAction(data.audit, auditAction.accepted)

  return {
    showAcceptedOutcome: true,
    acceptedBy: displayOrNoData(acceptedAudit?.user?.name, locale),
    acceptedDate: displayOrNoData(
      formatSubmissionDate(acceptedAudit?.timestamp ?? data.updated, locale),
      locale
    )
  }
}

function mapCancelledOutcomeFields(data, locale = 'en') {
  if (data.status !== 'Cancelled') {
    return {
      showCancelledOutcome: false,
      cancelledBy: null,
      cancelledDate: null,
      cancellationReason: null
    }
  }

  const cancelledAudit = findAuditEntryByAction(
    data.audit,
    auditAction.cancelled
  )

  return {
    showCancelledOutcome: true,
    cancelledBy: displayOrNoData(cancelledAudit?.user?.name, locale),
    cancelledDate: displayOrNoData(
      formatSubmissionDate(cancelledAudit?.timestamp ?? data.updated, locale),
      locale
    ),
    cancellationReason: displayOrNoData(cancelledAudit?.reason, locale)
  }
}

function mapObligationStatus(status) {
  switch (status) {
    case 'Met':
      return 'met'
    case 'NotMet':
      return 'not-met'
    case 'NoDataYet':
    case null:
    case undefined:
      return 'no-data'
    default:
      throw new Error(`Unexpected obligation status: ${status}`)
  }
}

function mapObligation(obligation) {
  return {
    name: obligation.material,
    obligationToMeet: obligation.tonnages.obligated ?? 0,
    awaitingAcceptance: obligation.tonnages.awaitingAcceptance ?? 0,
    accepted: obligation.tonnages.accepted ?? 0,
    outstanding: obligation.tonnages.outstanding ?? 0,
    status: mapObligationStatus(obligation.status)
  }
}

function deriveTotalsStatus(rows) {
  if (rows.some((r) => r.status === 'not-met')) {
    return 'not-met'
  }
  if (rows.every((r) => r.status === 'no-data')) {
    return 'no-data'
  }
  return 'met'
}

function computeTotals(rows) {
  return {
    obligationToMeet: rows.reduce((sum, r) => sum + r.obligationToMeet, 0),
    awaitingAcceptance: rows.reduce((sum, r) => sum + r.awaitingAcceptance, 0),
    accepted: rows.reduce((sum, r) => sum + r.accepted, 0),
    outstanding: rows.reduce((sum, r) => sum + r.outstanding, 0),
    status: deriveTotalsStatus(rows)
  }
}

function mapQueryDetails(queryDetails, locale = 'en') {
  if (!queryDetails) {
    return null
  }
  return {
    queriedMaterials: queryDetails.queriedMaterials ?? null,
    reason: queryDetails.reason ?? null,
    dateQueried: formatDate(
      queryDetails.dateQueried ?? queryDetails.actionDate,
      locale
    )
  }
}

function mapQueriedOutcome(data, locale = 'en') {
  return data.status === 'Queried'
    ? mapQueryDetails(data.queryDetails, locale)
    : null
}

function mapHistoryReason(status, transitionAudit) {
  switch (status) {
    case 'Accepted':
      return ''
    case 'Cancelled':
      return transitionAudit?.reason ?? null
    default:
      return null
  }
}

function buildCurrentYearViewSubmissionUrl(
  declaration,
  fallbackOrganisationId,
  locale = 'en'
) {
  const organisationId = declaration.organisation?.id ?? fallbackOrganisationId
  return buildCertificateDetailPath(organisationId, declaration.id, locale)
}

function getCurrentYearTransitionAudits(declaration) {
  return (declaration.audit ?? []).filter(
    (entry) => entry.action === 'Accepted' || entry.action === 'Cancelled'
  )
}

function buildCurrentYearHistoryRow(
  declaration,
  entry,
  viewSubmissionUrl,
  locale = 'en'
) {
  return {
    sortTimestamp: entry.timestamp ?? declaration.updated,
    date: formatHistoryDate(entry.timestamp ?? declaration.updated, locale),
    action: entry.action,
    by: entry.user?.name ?? '',
    reason: mapHistoryReason(entry.action, entry),
    viewSubmissionUrl
  }
}

function buildCurrentYearHistoryRowFromStatus(
  declaration,
  viewSubmissionUrl,
  locale = 'en'
) {
  return {
    sortTimestamp: declaration.updated,
    date: formatHistoryDate(declaration.updated, locale),
    action: declaration.status,
    by: '',
    reason: mapHistoryReason(declaration.status, null),
    viewSubmissionUrl
  }
}

function mapCurrentYearHistory(
  fallbackOrganisationId,
  declarations = [],
  locale = 'en'
) {
  const rows = []

  for (const declaration of declarations) {
    const viewSubmissionUrl = buildCurrentYearViewSubmissionUrl(
      declaration,
      fallbackOrganisationId,
      locale
    )
    const transitionAudits = getCurrentYearTransitionAudits(declaration)

    if (transitionAudits.length > 0) {
      for (const entry of transitionAudits) {
        rows.push(
          buildCurrentYearHistoryRow(
            declaration,
            entry,
            viewSubmissionUrl,
            locale
          )
        )
      }
      continue
    }

    if (
      declaration.status === 'Accepted' ||
      declaration.status === 'Cancelled'
    ) {
      rows.push(
        buildCurrentYearHistoryRowFromStatus(
          declaration,
          viewSubmissionUrl,
          locale
        )
      )
    }
  }

  const sorted = rows.toSorted(
    (a, b) =>
      new Date(b.sortTimestamp).getTime() - new Date(a.sortTimestamp).getTime()
  )
  return sorted.map(({ sortTimestamp: _sortTimestamp, ...row }) => row)
}

function buildCurrentYearDeclarations(
  declarationsForYear,
  data,
  status,
  declarationId
) {
  const declarations = [...(declarationsForYear ?? [])]

  if ((status === 'Accepted' || status === 'Cancelled') && declarationId) {
    const withoutCurrent = declarations.filter(
      (declaration) => declaration.id !== declarationId
    )

    return [...withoutCurrent, data].toSorted(
      (a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime()
    )
  }

  return declarations
}

function mapDeclarationMaterialGroups(obligations) {
  const resolvedObligations = obligations ?? []
  const allMapped = resolvedObligations.map(mapObligation)
  const materials = allMapped.filter(
    (_, i) => !GLASS_BREAKDOWN_MATERIALS.has(resolvedObligations[i].material)
  )
  const glassBreakdown = allMapped.filter((_, i) =>
    GLASS_BREAKDOWN_MATERIALS.has(resolvedObligations[i].material)
  )

  return {
    materials,
    materialTotals: computeTotals(materials),
    glassBreakdown,
    glassBreakdownTotals: computeTotals(glassBreakdown)
  }
}

export function deriveRecyclingObligationsMet(obligations) {
  const resolved = obligations ?? []
  const { materialTotals } = mapDeclarationMaterialGroups(resolved)
  return mapMaterialTotalsStatusToRecyclingObligationsMet(
    materialTotals.status,
    {
      hasObligations: resolved.length !== 0
    }
  )
}

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
