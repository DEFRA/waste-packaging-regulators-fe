import { config } from '#config/config.js'
import { declarationStatusByReviewStatus } from '../common/constants.js'
import { mapSessionUserToApiUser } from './approve.service.js'

export function getDeclarationSessionKey(organisationId, id) {
  return `${organisationId}/${id}`
}

export const certificateActionSessionKeys = {
  justApproved: 'coc-just-approved',
  justQueried: 'coc-just-queried',
  justCancelled: 'coc-just-cancelled'
}

function mockStatusSessionKey(declarationKey) {
  return `certificate-mock-status:${declarationKey}`
}

function mockAuditSessionKey(declarationKey) {
  return `certificate-mock-audit:${declarationKey}`
}

function mockCancelReasonSessionKey(declarationKey) {
  return `certificate-mock-cancel-reason:${declarationKey}`
}

function appendMockTransitionAudit(session, declarationKey, auditEntry) {
  const existing = session.get(mockAuditSessionKey(declarationKey)) ?? []
  const alreadyRecorded = existing.some(
    (entry) =>
      entry.action === auditEntry.action &&
      entry.timestamp === auditEntry.timestamp
  )

  if (alreadyRecorded) {
    return
  }

  session.set(mockAuditSessionKey(declarationKey), [...existing, auditEntry])
}

function nextMockAuditTimestamp(session, declarationKey) {
  const existing = session?.get?.(mockAuditSessionKey(declarationKey)) ?? []
  const lastTimestamp = existing.at(-1)?.timestamp
  const now = Date.now()
  const nextMs = lastTimestamp
    ? Math.max(now, new Date(lastTimestamp).getTime() + 1)
    : now

  return new Date(nextMs).toISOString()
}

function buildMockAcceptedAuditEntry(session, declarationKey) {
  const sessionUser = session?.get?.('user')
  const user = mapSessionUserToApiUser(sessionUser)
  const timestamp = nextMockAuditTimestamp(session, declarationKey)

  return {
    auditEntry: {
      action: 'Accepted',
      timestamp,
      user
    },
    updated: timestamp
  }
}

function buildMockCancelledAuditEntry(session, declarationKey) {
  const sessionUser = session?.get?.('user')
  const user = mapSessionUserToApiUser(sessionUser)
  const timestamp = nextMockAuditTimestamp(session, declarationKey)
  const reason =
    session?.get?.(mockCancelReasonSessionKey(declarationKey)) ?? null

  return {
    auditEntry: {
      action: 'Cancelled',
      timestamp,
      user,
      reason
    },
    updated: timestamp
  }
}

export function setMockDeclarationStatusOverride(
  session,
  declarationKey,
  reviewStatus,
  { reason } = {}
) {
  if (!config.get('useMockApi')) {
    return
  }

  const status = declarationStatusByReviewStatus[reviewStatus]
  if (status) {
    session.set(mockStatusSessionKey(declarationKey), status)
  }

  if (reviewStatus === 'Approved') {
    const { auditEntry } = buildMockAcceptedAuditEntry(session, declarationKey)
    appendMockTransitionAudit(session, declarationKey, auditEntry)
  }

  if (reviewStatus === 'Cancelled') {
    if (reason != null) {
      session.set(mockCancelReasonSessionKey(declarationKey), reason)
    }
    const { auditEntry } = buildMockCancelledAuditEntry(session, declarationKey)
    appendMockTransitionAudit(session, declarationKey, auditEntry)
  }
}

export function applyMockDeclarationStatusOverride(
  data,
  declarationKey,
  session
) {
  if (!config.get('useMockApi') || !session) {
    return data
  }

  const overrideStatus = session.get(mockStatusSessionKey(declarationKey))

  if (!overrideStatus) {
    return data
  }

  let sessionAudits = session.get(mockAuditSessionKey(declarationKey)) ?? []

  if (sessionAudits.length === 0) {
    if (overrideStatus === 'Accepted') {
      const { auditEntry } = buildMockAcceptedAuditEntry(
        session,
        declarationKey
      )
      sessionAudits = [auditEntry]
    } else if (overrideStatus === 'Cancelled') {
      const { auditEntry } = buildMockCancelledAuditEntry(
        session,
        declarationKey
      )
      sessionAudits = [auditEntry]
    } else {
      // No other status synthesises a mock audit entry - this else is only here to satisfy SonarQube rules.
    }
  }

  const updated = sessionAudits.at(-1)?.timestamp ?? data.updated

  return {
    ...data,
    status: overrideStatus,
    updated,
    audit: [...(data.audit ?? []), ...sessionAudits]
  }
}

export function readAndClearCertificateActionBannerFlags(
  session,
  declarationKey
) {
  const showApprovalBanner =
    session.get(certificateActionSessionKeys.justApproved) === declarationKey
  const showQueryBanner =
    session.get(certificateActionSessionKeys.justQueried) === declarationKey
  const showCancelBanner =
    session.get(certificateActionSessionKeys.justCancelled) === declarationKey

  if (showApprovalBanner) {
    session.clear(certificateActionSessionKeys.justApproved)
  }
  if (showQueryBanner) {
    session.clear(certificateActionSessionKeys.justQueried)
  }
  if (showCancelBanner) {
    session.clear(certificateActionSessionKeys.justCancelled)
  }

  return { showApprovalBanner, showQueryBanner, showCancelBanner }
}
