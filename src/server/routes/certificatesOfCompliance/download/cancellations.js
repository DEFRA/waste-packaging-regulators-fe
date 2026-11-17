import { auditAction, findAuditEntryByAction } from '../detail/audit.js'

function isReadableDate(value) {
  return value != null && !Number.isNaN(Date.parse(value))
}

// Falls back to `updated` when the Cancelled audit entry is missing or its
// timestamp cannot be read.
export function cancelledAt(declaration) {
  const entry = findAuditEntryByAction(declaration.audit, auditAction.cancelled)
  return isReadableDate(entry?.timestamp)
    ? entry.timestamp
    : (declaration.updated ?? null)
}

function cancelledTime(declaration) {
  const time = Date.parse(cancelledAt(declaration) ?? '')
  return Number.isNaN(time) ? Number.MAX_SAFE_INTEGER : time
}

// Cancelled declarations grouped by organisation, oldest first.
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
