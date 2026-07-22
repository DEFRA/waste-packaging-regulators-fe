import {
  NO_DATA,
  GLASS_BREAKDOWN_MATERIALS,
  certificateActionLabelsByRegistrationType
} from '../common/constants.js'
import {
  displayOrNoData,
  complianceDocumentNoun,
  buildComplianceTypeLabel,
  buildRegulation43Statement
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
import { buildCertificateDetailActions } from '../actions/detail-actions.js'
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
    case 'no-data':
      return false
    default:
      throw new Error(`Unexpected material totals status: ${status}`)
  }
}

function mapAcceptedOutcomeFields(data) {
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
    acceptedBy: displayOrNoData(acceptedAudit?.user?.name),
    acceptedDate: displayOrNoData(
      formatSubmissionDate(acceptedAudit?.timestamp ?? data.updated)
    )
  }
}

function mapCancelledOutcomeFields(data) {
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
    cancelledBy: displayOrNoData(cancelledAudit?.user?.name),
    cancelledDate: displayOrNoData(
      formatSubmissionDate(cancelledAudit?.timestamp ?? data.updated)
    ),
    cancellationReason: displayOrNoData(cancelledAudit?.reason)
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

function mapQueryDetails(queryDetails) {
  if (!queryDetails) {
    return null
  }
  return {
    queriedMaterials: queryDetails.queriedMaterials ?? null,
    reason: queryDetails.reason ?? null,
    dateQueried: formatDate(queryDetails.dateQueried ?? queryDetails.actionDate)
  }
}

function mapQueriedOutcome(data) {
  return data.status === 'Queried' ? mapQueryDetails(data.queryDetails) : null
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

function mapCurrentYearHistory(declarations = []) {
  const rows = []

  for (const declaration of declarations) {
    const transitionAudits = (declaration.audit ?? []).filter(
      (entry) => entry.action === 'Accepted' || entry.action === 'Cancelled'
    )

    if (transitionAudits.length > 0) {
      for (const entry of transitionAudits) {
        rows.push({
          sortTimestamp: entry.timestamp ?? declaration.updated,
          date: formatHistoryDate(entry.timestamp ?? declaration.updated),
          action: entry.action,
          by: entry.user?.name ?? '',
          reason: mapHistoryReason(entry.action, entry)
        })
      }
      continue
    }

    if (
      declaration.status === 'Accepted' ||
      declaration.status === 'Cancelled'
    ) {
      rows.push({
        sortTimestamp: declaration.updated,
        date: formatHistoryDate(declaration.updated),
        action: declaration.status,
        by: '',
        reason: mapHistoryReason(declaration.status, null)
      })
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

function resolveDeclarationCompanyName(organisation) {
  return mapOrganisationName(organisation)
}

function resolveDeclarationActions(
  reviewStatus,
  resolvedOrganisationId,
  resolvedId,
  registrationType
) {
  if (resolvedOrganisationId && resolvedId) {
    return buildCertificateDetailActions(
      reviewStatus,
      resolvedOrganisationId,
      resolvedId,
      registrationType
    )
  }

  return {
    showAccept: false,
    showCancel: false,
    labels: certificateActionLabelsByRegistrationType.DirectProducer,
    urls: { accept: '#', cancel: '#' }
  }
}

function mapDeclarationComplianceFields(
  organisation,
  {
    obligationYear,
    obligationStatus,
    isRegulation43Compliant,
    companyName,
    created
  }
) {
  return {
    complianceYear: obligationYear == null ? null : String(obligationYear),
    complianceTypeLabel: buildComplianceTypeLabel(
      obligationYear,
      organisation.registrationType
    ),
    complianceDocumentNoun: complianceDocumentNoun(
      organisation.registrationType
    ),
    recyclingObligationsMet: mapRecyclingObligationsMet(obligationStatus),
    regulation43Met: isRegulation43Compliant ?? null,
    regulation43Statement: buildRegulation43Statement(
      isRegulation43Compliant ?? null,
      companyName
    ),
    dateDeclarationSubmitted: displayOrNoData(formatSubmissionDate(created))
  }
}

function mapDeclarationContactFields(
  organisation,
  { wasteOrganisation, submittedUser, submitterPhoneNumber, submitterName }
) {
  return {
    organisationType: mapRegistrationTypeToOrganisationType(
      organisation.registrationType
    ),
    registrationType: organisation.registrationType,
    organisationRef: displayOrNoData(organisation.referenceNumber),
    companiesHouseNumber:
      mapCompaniesHouseNumberFromWasteOrganisation(wasteOrganisation),
    nameOnAccount: displayOrNoData(submittedUser?.name),
    declarationEmailAddress: displayOrNoData(submittedUser?.email),
    companyPhoneNumber: displayOrNoData(submitterPhoneNumber),
    declarationSignedBy: displayOrNoData(submitterName)
  }
}

export function mapDeclarationToDetail(
  data,
  {
    organisationId,
    id,
    declarationsForYear,
    submitterPhoneNumber,
    wasteOrganisation
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
  const companyName = resolveDeclarationCompanyName(organisation)
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
      created
    }),
    ...mapAcceptedOutcomeFields(data),
    ...mapCancelledOutcomeFields(data),
    ...mapDeclarationContactFields(organisation, {
      wasteOrganisation,
      submittedUser,
      submitterPhoneNumber,
      submitterName
    }),
    ...mapDeclarationMaterialGroups(obligations),
    actions: resolveDeclarationActions(
      reviewStatus,
      resolvedOrganisationId,
      resolvedId,
      organisation.registrationType
    ),
    queryDetails: mapQueriedOutcome(data),
    currentYearActions: mapCurrentYearHistory(historyDeclarations),
    showObligations: (obligations ?? []).length !== 0
  }
}

export function mapObligationToDetail(
  data,
  {
    organisationId,
    obligationYear,
    organisation,
    accountOrganisationName,
    accountOrganisationReferenceNumber
  } = {}
) {
  const obligations = data?.obligations ?? []
  const materialGroups = mapDeclarationMaterialGroups(obligations)

  const orgFields = mapWasteOrganisationToDetailFields(organisation, {
    obligationYear
  })

  return {
    complianceYear: obligationYear == null ? null : String(obligationYear),
    complianceTypeLabel: buildComplianceTypeLabel(
      obligationYear,
      orgFields.registrationType
    ),
    ...orgFields,
    companyName: displayOrNoData(
      accountOrganisationName ?? orgFields.companyName
    ),
    declarationStatus: 'Unsubmitted',
    reviewStatus: null,
    showDeclaration: false,
    showSubmittedOn: false,
    showNameOnAccount: false,
    complianceDocumentNoun: complianceDocumentNoun(orgFields.registrationType),
    recyclingObligationsMet: mapMaterialTotalsStatusToRecyclingObligationsMet(
      materialGroups.materialTotals.status,
      { hasObligations: obligations.length !== 0 }
    ),
    regulation43Met: null,
    dateDeclarationSubmitted: NO_DATA,
    organisationRef: displayOrNoData(
      accountOrganisationReferenceNumber ??
        organisation?.referenceNumber ??
        organisationId
    ),
    nameOnAccount: NO_DATA,
    declarationEmailAddress: NO_DATA,
    companyPhoneNumber: NO_DATA,
    declarationSignedBy: NO_DATA,
    ...materialGroups,
    actions: {
      showAccept: false,
      showCancel: false,
      labels: certificateActionLabelsByRegistrationType.DirectProducer,
      urls: { accept: '#', cancel: '#' }
    },
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
