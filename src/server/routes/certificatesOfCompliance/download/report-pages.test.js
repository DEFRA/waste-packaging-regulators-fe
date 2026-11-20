import { describe, expect, test, vi } from 'vitest'
import {
  DECLARATIONS_BATCH_SIZE,
  DOWNLOAD_PAGE_CONCURRENCY
} from '../common/constants.js'
import {
  fetchAllDeclarations,
  fetchAllUnsubmittedOrganisations,
  ResultSetChangedError
} from './report-pages.js'

describe('#report-pages', () => {
  describe('fetchAllDeclarations', () => {
    test('fetches every page when the total exceeds the batch size', async () => {
      const api = {
        listComplianceDeclarations: vi.fn(({ page }) =>
          Promise.resolve({
            total: 150,
            complianceDeclarations: Array.from(
              { length: page === 1 ? DECLARATIONS_BATCH_SIZE : 50 },
              (_, i) => ({ organisation: { id: `decl-${page}-${i}` } })
            )
          })
        )
      }

      const declarations = await fetchAllDeclarations(
        api,
        { status: 'Submitted' },
        'trace-1'
      )

      expect(api.listComplianceDeclarations).toHaveBeenCalledTimes(2)
      expect(declarations).toHaveLength(150)
    })

    test('keeps at most DOWNLOAD_PAGE_CONCURRENCY later pages in flight', async () => {
      let inFlight = 0
      let maxInFlight = 0
      const api = {
        listComplianceDeclarations: vi.fn(async ({ page }) => {
          if (page > 1) {
            inFlight += 1
            maxInFlight = Math.max(maxInFlight, inFlight)
            await new Promise((resolve) => setImmediate(resolve))
            inFlight -= 1
          }
          return {
            total: DECLARATIONS_BATCH_SIZE * 20,
            complianceDeclarations: [{ organisation: { id: `p${page}` } }]
          }
        })
      }

      const declarations = await fetchAllDeclarations(api, {}, undefined)

      expect(api.listComplianceDeclarations).toHaveBeenCalledTimes(20)
      expect(declarations).toHaveLength(20)
      expect(maxInFlight).toBe(DOWNLOAD_PAGE_CONCURRENCY)
    })

    test('fails with ResultSetChangedError when the total changes between pages', async () => {
      const api = {
        listComplianceDeclarations: vi.fn(async ({ page }) => ({
          // A row left the set after page 1 was read.
          total: page === 1 ? 150 : 149,
          complianceDeclarations: [{ organisation: { id: `p${page}` } }]
        }))
      }

      await expect(fetchAllDeclarations(api, {}, undefined)).rejects.toThrow(
        ResultSetChangedError
      )
    })

    test('makes a single call when one page covers the total', async () => {
      const api = {
        listComplianceDeclarations: vi.fn().mockResolvedValue({
          total: 3,
          complianceDeclarations: [{}, {}, {}]
        })
      }

      const declarations = await fetchAllDeclarations(api, {}, undefined)

      expect(api.listComplianceDeclarations).toHaveBeenCalledTimes(1)
      expect(declarations).toHaveLength(3)
    })
  })

  describe('fetchAllUnsubmittedOrganisations', () => {
    test('fails with ResultSetChangedError when the unsubmitted total changes between pages', async () => {
      const api = {
        listUnsubmittedComplianceDeclarations: vi.fn(async ({ page }) => ({
          total: page === 1 ? 150 : 151,
          unsubmittedOrganisations: [{ organisationId: `p${page}` }]
        }))
      }

      await expect(
        fetchAllUnsubmittedOrganisations(api, {}, undefined)
      ).rejects.toThrow(ResultSetChangedError)
    })
  })
})
