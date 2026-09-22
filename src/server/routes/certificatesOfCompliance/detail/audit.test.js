import { describe, expect, it } from 'vitest'
import {
  findAuditEntryByAction,
  findSubmittedAuditUser,
  findAcceptedAuditEntry,
  auditAction
} from './audit.js'

describe('audit.js', () => {
  const auditList = [
    { action: auditAction.submitted, user: { name: 'Submitter' } },
    { action: auditAction.accepted, user: { name: 'Approver' } },
    { action: auditAction.cancelled, user: { name: 'Canceller' } }
  ]

  describe('findAuditEntryByAction', () => {
    it('returns the audit entry matching the action', () => {
      expect(findAuditEntryByAction(auditList, auditAction.accepted)).toEqual(
        auditList[1]
      )
    })

    it('returns undefined if audit is null or undefined', () => {
      expect(findAuditEntryByAction(null, auditAction.accepted)).toBeUndefined()
      expect(
        findAuditEntryByAction(undefined, auditAction.accepted)
      ).toBeUndefined()
    })
  })

  describe('findSubmittedAuditUser', () => {
    it('returns the user from the submitted action', () => {
      expect(findSubmittedAuditUser(auditList)).toEqual({ name: 'Submitter' })
    })

    it('returns null if no submitted action exists', () => {
      expect(findSubmittedAuditUser([])).toBeNull()
      expect(findSubmittedAuditUser(null)).toBeNull()
    })
  })

  describe('findAcceptedAuditEntry', () => {
    it('returns the entry for the accepted action', () => {
      expect(findAcceptedAuditEntry(auditList)).toEqual(auditList[1])
    })

    it('returns undefined if no accepted action exists', () => {
      expect(findAcceptedAuditEntry([])).toBeUndefined()
      expect(findAcceptedAuditEntry(undefined)).toBeUndefined()
    })
  })
})
