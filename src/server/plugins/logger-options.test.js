import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetTraceId } = vi.hoisted(() => ({
  mockGetTraceId: vi.fn()
}))

vi.mock('@defra/hapi-tracing', () => ({
  getTraceId: mockGetTraceId
}))

const { loggerOptions } = await import('./logger-options.js')

describe('loggerOptions', () => {
  describe('static properties', () => {
    it('ignores the /health path', () => {
      expect(loggerOptions.ignorePaths).toContain('/health')
    })

    it('enables nesting', () => {
      expect(loggerOptions.nesting).toBe(true)
    })

    it('removes redacted paths rather than replacing them', () => {
      expect(loggerOptions.redact.remove).toBe(true)
    })

    it('has a valid log level', () => {
      const validLevels = [
        'fatal',
        'error',
        'warn',
        'info',
        'debug',
        'trace',
        'silent'
      ]
      expect(validLevels).toContain(loggerOptions.level)
    })
  })

  describe('mixin()', () => {
    beforeEach(() => {
      mockGetTraceId.mockReset()
    })

    it('returns a trace.id when a trace ID is present', () => {
      mockGetTraceId.mockReturnValue('abc-trace-123')

      expect(loggerOptions.mixin()).toEqual({ trace: { id: 'abc-trace-123' } })
    })

    it('returns an empty object when getTraceId returns null', () => {
      mockGetTraceId.mockReturnValue(null)

      expect(loggerOptions.mixin()).toEqual({})
    })

    it('returns an empty object when getTraceId returns undefined', () => {
      mockGetTraceId.mockReturnValue(undefined)

      expect(loggerOptions.mixin()).toEqual({})
    })

    it('returns an empty object when getTraceId returns an empty string', () => {
      mockGetTraceId.mockReturnValue('')

      expect(loggerOptions.mixin()).toEqual({})
    })
  })
})
