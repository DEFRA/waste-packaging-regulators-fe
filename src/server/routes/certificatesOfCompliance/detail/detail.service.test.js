import { describe, expect, it } from 'vitest'
import {
  buildDetailBacklink,
  validateFromDetailPath
} from './detail.service.js'

describe('detail.service.js', () => {
  describe('validateFromDetailPath', () => {
    it('accepts a relative detail path under the route prefix', () => {
      expect(
        validateFromDetailPath(
          '/certificates-of-compliance/org-1/certificate/decl-parent?type=directProducer&tab=pending',
          '/certificates-of-compliance'
        )
      ).toBe(
        '/certificates-of-compliance/org-1/certificate/decl-parent?type=directProducer&tab=pending'
      )
    })

    it('accepts a detail path when no route prefix is configured', () => {
      expect(validateFromDetailPath('/org-1/certificate/decl-parent')).toBe(
        '/org-1/certificate/decl-parent'
      )
    })

    it('rejects absolute and traversal paths', () => {
      expect(validateFromDetailPath('https://evil.example/path')).toBeNull()
      expect(
        validateFromDetailPath('/certificates-of-compliance/../admin')
      ).toBeNull()
    })
  })

  describe('buildDetailBacklink', () => {
    it('uses the parent detail path when fromDetail is valid', () => {
      expect(
        buildDetailBacklink({
          fromDetail:
            '/certificates-of-compliance/org-1/certificate/decl-parent?type=directProducer&tab=pending',
          routePrefix: '/certificates-of-compliance',
          locale: 'en'
        })
      ).toEqual({
        backlink:
          '/certificates-of-compliance/org-1/certificate/decl-parent?type=directProducer&tab=pending',
        backlinkText: 'Back'
      })
    })

    it('falls back to the submissions list when fromDetail is absent', () => {
      expect(
        buildDetailBacklink({
          type: 'directProducer',
          tab: 'pending',
          routePrefix: '/certificates-of-compliance',
          locale: 'en'
        })
      ).toEqual({
        backlink: '/certificates-of-compliance?type=directProducer&tab=pending',
        backlinkText: 'Back to all submissions'
      })
    })

    it('appends lang=cy to a validated parent back link', () => {
      expect(
        buildDetailBacklink({
          fromDetail:
            '/certificates-of-compliance/org-1/certificate/decl-parent',
          routePrefix: '/certificates-of-compliance',
          locale: 'cy'
        })
      ).toEqual({
        backlink:
          '/certificates-of-compliance/org-1/certificate/decl-parent?lang=cy',
        backlinkText: 'Yn ôl'
      })
    })
  })
})
