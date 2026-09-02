import { GLASS_BREAKDOWN_MATERIALS } from '../common/constants.js'

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

export function mapDeclarationMaterialGroups(obligations) {
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

export { mapRecyclingObligationsMet }
