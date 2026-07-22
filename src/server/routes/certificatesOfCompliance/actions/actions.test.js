import { describe, expect, test, vi } from 'vitest'

vi.mock('#config/config.js', () => ({
  config: { get: vi.fn() }
}))

vi.mock('#services/waste-obligations-api.service.js', () => ({
  createWasteObligationsApiService: vi.fn()
}))

import { config } from '#config/config.js'
import { createWasteObligationsApiService } from '#services/waste-obligations-api.service.js'
import {
  buildComplianceTypeLabel,
  buildRegulation43Statement,
  displayOrNoData
} from '../common/display.js'
import {
  mapDeclarationStatusToReviewStatus,
  canApproveComplianceDeclaration,
  canCancelComplianceDeclaration
} from './status.js'
import {
  buildCertificateDetailActions,
  buildCertificateSuccessBanner
} from './detail-actions.js'
import {
  readAndClearCertificateActionBannerFlags,
  setMockDeclarationStatusOverride,
  certificateActionSessionKeys
} from './session.service.js'
import {
  mapSessionUserToApiUser,
  approveComplianceDeclaration
} from './approve.service.js'
import { cancelComplianceDeclaration } from './cancel.service.js'

describe('certificate detail action helpers', () => {
  test('buildComplianceTypeLabel builds certificate and statement labels', () => {
    expect(buildComplianceTypeLabel(2026, 'DirectProducer')).toBe(
      '2026 certificate of compliance'
    )
    expect(buildComplianceTypeLabel(2026, 'ComplianceScheme')).toBe(
      '2026 statement of compliance'
    )
    expect(buildComplianceTypeLabel(null, 'DirectProducer')).toBe('No data')
  })

  test('buildRegulation43Statement builds compliant and not compliant text', () => {
    expect(buildRegulation43Statement(true, 'EcoPack Compliance Ltd')).toBe(
      'EcoPack Compliance Ltd declared they have complied with all other requirements in regulation 43.'
    )
    expect(buildRegulation43Statement(false, 'EcoPack Compliance Ltd')).toBe(
      'EcoPack Compliance Ltd declared they have not complied with all other requirements in regulation 43.'
    )
  })

  test('buildRegulation43Statement returns null when status is null', () => {
    expect(
      buildRegulation43Statement(null, 'EcoPack Compliance Ltd')
    ).toBeNull()
  })

  test('displayOrNoData returns No data for null and empty values', () => {
    expect(displayOrNoData(null)).toBe('No data')
    expect(displayOrNoData('')).toBe('No data')
    expect(displayOrNoData('Acme Ltd')).toBe('Acme Ltd')
  })

  test('mapDeclarationStatusToReviewStatus maps known statuses', () => {
    expect(mapDeclarationStatusToReviewStatus('Submitted')).toBe('Pending')
    expect(mapDeclarationStatusToReviewStatus('Accepted')).toBe('Approved')
    expect(mapDeclarationStatusToReviewStatus('Queried')).toBe('Queried')
    expect(mapDeclarationStatusToReviewStatus('Cancelled')).toBe('Cancelled')
    expect(mapDeclarationStatusToReviewStatus('Unknown')).toBe('Pending')
  })

  test('buildCertificateDetailActions shows buttons by review status', () => {
    expect(
      buildCertificateDetailActions(
        'Pending',
        'org-1',
        'decl-1',
        'DirectProducer'
      )
    ).toEqual({
      showAccept: true,
      showCancel: true,
      labels: {
        accept: 'Accept certificate',
        cancel: 'Cancel certificate'
      },
      urls: {
        accept: '/org-1/certificates-of-compliance/decl-1/accept',
        cancel: '/org-1/certificates-of-compliance/decl-1/cancel/reason'
      }
    })
    expect(
      buildCertificateDetailActions(
        'Queried',
        'org-1',
        'decl-1',
        'DirectProducer'
      )
    ).toMatchObject({
      showAccept: true,
      showCancel: true
    })
    expect(
      buildCertificateDetailActions(
        'Approved',
        'org-1',
        'decl-1',
        'DirectProducer'
      )
    ).toMatchObject({
      showAccept: false,
      showCancel: true
    })
  })

  test('buildCertificateDetailActions uses statement labels for compliance schemes', () => {
    expect(
      buildCertificateDetailActions(
        'Pending',
        'org-1',
        'decl-1',
        'ComplianceScheme'
      ).labels
    ).toEqual({
      accept: 'Accept statement',
      cancel: 'Cancel statement'
    })
  })

  test('buildCertificateSuccessBanner returns copy by registration type', () => {
    expect(
      buildCertificateSuccessBanner(
        {
          showApprovalBanner: true,
          showQueryBanner: false,
          showCancelBanner: false
        },
        'DirectProducer'
      )
    ).toEqual({
      heading: 'Certificate accepted',
      text: 'Certificate has been accepted.',
      type: 'accepted'
    })
    expect(
      buildCertificateSuccessBanner(
        {
          showApprovalBanner: false,
          showQueryBanner: false,
          showCancelBanner: true
        },
        'DirectProducer'
      )
    ).toEqual({
      heading: 'Certificate cancelled',
      text: 'Certificate has been cancelled and an email sent to the producer.',
      type: 'cancelled'
    })
    expect(
      buildCertificateSuccessBanner(
        {
          showApprovalBanner: true,
          showQueryBanner: false,
          showCancelBanner: false
        },
        'ComplianceScheme'
      )
    ).toEqual({
      heading: 'Statement accepted',
      text: 'Statement has been accepted.',
      type: 'accepted'
    })
    expect(
      buildCertificateSuccessBanner(
        {
          showApprovalBanner: false,
          showQueryBanner: false,
          showCancelBanner: true
        },
        'ComplianceScheme'
      )
    ).toEqual({
      heading: 'Statement cancelled',
      text: 'Statement has been cancelled and an email sent to the compliance scheme.',
      type: 'cancelled'
    })
    expect(
      buildCertificateSuccessBanner(
        {
          showApprovalBanner: false,
          showQueryBanner: true,
          showCancelBanner: false
        },
        'DirectProducer'
      )
    ).toBeNull()
    expect(
      buildCertificateSuccessBanner(
        {
          showApprovalBanner: false,
          showQueryBanner: false,
          showCancelBanner: false
        },
        'DirectProducer'
      )
    ).toBeNull()
  })

  test('readAndClearCertificateActionBannerFlags reads and clears session keys', () => {
    const session = {
      data: {
        [certificateActionSessionKeys.justApproved]: 'org-1/decl-1',
        [certificateActionSessionKeys.justCancelled]: 'org-1/decl-2'
      },
      get(key) {
        return this.data[key]
      },
      clear(key) {
        delete this.data[key]
      }
    }

    const flags = readAndClearCertificateActionBannerFlags(
      session,
      'org-1/decl-1'
    )

    expect(flags).toEqual({
      showApprovalBanner: true,
      showQueryBanner: false,
      showCancelBanner: false
    })
    expect(
      session.data[certificateActionSessionKeys.justApproved]
    ).toBeUndefined()
    expect(session.data[certificateActionSessionKeys.justCancelled]).toBe(
      'org-1/decl-2'
    )
  })

  test('canApproveComplianceDeclaration and canCancelComplianceDeclaration match review status', () => {
    expect(canApproveComplianceDeclaration('Pending')).toBe(true)
    expect(canApproveComplianceDeclaration('Queried')).toBe(true)
    expect(canApproveComplianceDeclaration('Approved')).toBe(false)
    expect(canCancelComplianceDeclaration('Pending')).toBe(true)
    expect(canCancelComplianceDeclaration('Approved')).toBe(true)
    expect(canCancelComplianceDeclaration('Cancelled')).toBe(false)
  })

  test('setMockDeclarationStatusOverride stores status in session when useMockApi is true', () => {
    config.get.mockReturnValue(true)
    const session = {
      data: {},
      get(key) {
        return this.data[key]
      },
      set(key, value) {
        this.data[key] = value
      }
    }

    setMockDeclarationStatusOverride(session, 'org-1/decl-1', 'Approved')

    expect(session.data['certificate-mock-status:org-1/decl-1']).toBe(
      'Accepted'
    )
    expect(session.data['certificate-mock-audit:org-1/decl-1']).toHaveLength(1)
    expect(session.data['certificate-mock-audit:org-1/decl-1'][0].action).toBe(
      'Accepted'
    )
  })

  test('mapSessionUserToApiUser maps session user to API user', () => {
    expect(
      mapSessionUserToApiUser({
        id: 'user-oid-123',
        email: 'regulator@example.com',
        name: 'Bob Smith'
      })
    ).toEqual({
      id: 'user-oid-123',
      email: 'regulator@example.com',
      name: 'Bob Smith'
    })
  })

  test('mapSessionUserToApiUser defaults name to "Unknown" when absent', () => {
    expect(
      mapSessionUserToApiUser({
        id: 'user-oid-123',
        email: 'regulator@example.com'
      })
    ).toEqual({
      id: 'user-oid-123',
      email: 'regulator@example.com',
      name: 'Unknown'
    })
  })

  test('mapSessionUserToApiUser falls back to mock user when id or email is missing', () => {
    expect(mapSessionUserToApiUser({})).toEqual({
      id: 'mock-user',
      email: 'mock-user@test.local',
      name: 'Mock User'
    })
  })

  test('setMockDeclarationStatusOverride does nothing when useMockApi is false', () => {
    config.get.mockReturnValue(false)
    const session = { set: vi.fn() }

    setMockDeclarationStatusOverride(session, 'org-1/decl-1', 'Approved')

    expect(session.set).not.toHaveBeenCalled()
  })

  test('readAndClearCertificateActionBannerFlags clears the query banner when shown', () => {
    const session = {
      data: {
        [certificateActionSessionKeys.justQueried]: 'org-1/decl-q'
      },
      get(key) {
        return this.data[key]
      },
      clear(key) {
        delete this.data[key]
      }
    }

    const flags = readAndClearCertificateActionBannerFlags(
      session,
      'org-1/decl-q'
    )

    expect(flags).toEqual({
      showApprovalBanner: false,
      showQueryBanner: true,
      showCancelBanner: false
    })
    expect(
      session.data[certificateActionSessionKeys.justQueried]
    ).toBeUndefined()
  })

  describe('approveComplianceDeclaration', () => {
    test('skips API call when useMockApi is true', async () => {
      config.get.mockReturnValue(true)

      await approveComplianceDeclaration(
        'org-1',
        'decl-1',
        { user: 'mock-user' },
        'trace-1'
      )

      expect(createWasteObligationsApiService).not.toHaveBeenCalled()
    })

    test('calls updateComplianceDeclaration when useMockApi is false', async () => {
      config.get.mockReturnValue(false)
      const mockApi = { updateComplianceDeclaration: vi.fn() }
      createWasteObligationsApiService.mockReturnValue(mockApi)

      await approveComplianceDeclaration(
        'org-1',
        'decl-1',
        { id: 'user-oid-1', email: 'user@example.com', name: 'John Doe' },
        'trace-1'
      )

      expect(mockApi.updateComplianceDeclaration).toHaveBeenCalledWith(
        {
          organisationId: 'org-1',
          id: 'decl-1',
          status: 'Accepted',
          user: {
            id: 'user-oid-1',
            email: 'user@example.com',
            name: 'John Doe'
          }
        },
        'trace-1'
      )
    })
  })

  describe('cancelComplianceDeclaration', () => {
    test('skips API call when useMockApi is true', async () => {
      config.get.mockReturnValue(true)

      await cancelComplianceDeclaration(
        'org-1',
        'decl-1',
        { user: 'mock-user' },
        'Producer requested to cancel',
        'trace-1'
      )

      expect(createWasteObligationsApiService).not.toHaveBeenCalled()
    })

    test('sends status Cancelled with the reason when useMockApi is false', async () => {
      config.get.mockReturnValue(false)
      const mockApi = { updateComplianceDeclaration: vi.fn() }
      createWasteObligationsApiService.mockReturnValue(mockApi)

      await cancelComplianceDeclaration(
        'org-1',
        'decl-1',
        { id: 'user-oid-1', email: 'user@example.com', name: 'John Doe' },
        'Producer requested to cancel',
        'trace-1'
      )

      expect(mockApi.updateComplianceDeclaration).toHaveBeenCalledWith(
        {
          organisationId: 'org-1',
          id: 'decl-1',
          status: 'Cancelled',
          reason: 'Producer requested to cancel',
          user: {
            id: 'user-oid-1',
            email: 'user@example.com',
            name: 'John Doe'
          }
        },
        'trace-1'
      )
    })
  })
})
