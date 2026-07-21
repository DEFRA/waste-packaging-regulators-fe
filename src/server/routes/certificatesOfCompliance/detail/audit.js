const auditAction = {
  submitted: 'Submitted',
  accepted: 'Accepted',
  cancelled: 'Cancelled'
}

function findAuditEntryByAction(audit, action) {
  return (audit ?? []).find((auditEntry) => auditEntry.action === action)
}

export function findSubmittedAuditUser(audit = []) {
  return findAuditEntryByAction(audit, auditAction.submitted)?.user ?? null
}

export function findAcceptedAuditEntry(audit = []) {
  return findAuditEntryByAction(audit, auditAction.accepted)
}

export { findAuditEntryByAction, auditAction }
