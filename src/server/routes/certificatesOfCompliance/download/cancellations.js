import { auditAction, findAuditEntryByAction } from '../detail/audit.js'

// When a declaration was cancelled: the timestamp of its Cancelled audit entry.
// Cancelled is a final status, so a declaration has at most one. `updated` is
// the fallback for a declaration with no audit trail.
export function cancelledAt(declaration) {
  const entry = findAuditEntryByAction(declaration.audit, auditAction.cancelled)
  return entry?.timestamp ?? declaration.updated ?? null
}

function cancelledTime(declaration) {
  const time = Date.parse(cancelledAt(declaration) ?? '')
  return Number.isNaN(time) ? Number.MAX_SAFE_INTEGER : time
}

// Groups cancelled declarations by organisation, each group ordered oldest
// cancellation first by the full timestamp. The count on a report row and any
// per-cancellation detail are read from the same groups, so they always agree.
export function groupCancellationsByOrganisation(declarations = []) {
  const groups = new Map()

  for (const declaration of declarations) {
    const organisationId = declaration.organisation?.id
    if (organisationId == null) {
      continue
    }
    const group = groups.get(organisationId) ?? []
    group.push(declaration)
    groups.set(organisationId, group)
  }

  for (const group of groups.values()) {
    group.sort((a, b) => cancelledTime(a) - cancelledTime(b))
  }

  return groups
}
