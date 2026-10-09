import { describe, it, expect, vi } from 'vitest'
import { BELL_AZURE_AD_B2C_COOKIE } from '#server/auth/azure-ad-b2c.js'
import { clearSiblingAuthCookies } from './clear-sibling-auth-cookies.js'

describe('clearSiblingAuthCookies', () => {
  it('appends expired Set-Cookie headers for session and Bell cookies on each path', () => {
    const header = vi.fn()
    const request = {
      response: { isBoom: false, header }
    }

    clearSiblingAuthCookies(request, ['/manage-waste-dashboard'])

    expect(header).toHaveBeenCalledTimes(2)
    expect(header).toHaveBeenCalledWith(
      'Set-Cookie',
      expect.stringContaining('session='),
      { append: true }
    )
    expect(header).toHaveBeenCalledWith(
      'Set-Cookie',
      expect.stringContaining(`${BELL_AZURE_AD_B2C_COOKIE}=`),
      { append: true }
    )
    expect(header.mock.calls[0][1]).toContain('Path=/manage-waste-dashboard')
  })

  it('does nothing when the response is missing or is a Boom error', () => {
    const header = vi.fn()

    clearSiblingAuthCookies({ response: null }, ['/manage-waste-dashboard'])
    clearSiblingAuthCookies({ response: { isBoom: true, header } }, [
      '/manage-waste-dashboard'
    ])

    expect(header).not.toHaveBeenCalled()
  })
})
