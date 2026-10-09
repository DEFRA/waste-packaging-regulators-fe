import { config } from '#config/config.js'
import { BELL_AZURE_AD_B2C_COOKIE } from '#server/auth/azure-ad-b2c.js'

const SIBLING_AUTH_COOKIES = ['session', BELL_AZURE_AD_B2C_COOKIE]

const COOKIE_CLEAR_OPTIONS = {
  session: { httpOnly: true, sameSite: 'Lax' },
  [BELL_AZURE_AD_B2C_COOKIE]: {
    httpOnly: true,
    sameSite: 'Strict',
    secure: true
  }
}

function buildExpiredSetCookie(name, path) {
  const options = COOKIE_CLEAR_OPTIONS[name]
  const parts = [
    `${name}=`,
    'Max-Age=0',
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT'
  ]

  if (options.httpOnly) {
    parts.push('HttpOnly')
  }

  if (options.secure) {
    parts.push('Secure')
  }

  if (options.sameSite) {
    parts.push(`SameSite=${options.sameSite}`)
  }

  parts.push(`Path=${path}`)
  return parts.join('; ')
}

/**
 * Clears auth cookies scoped to sibling app path prefixes (e.g. dashboard vs CSOC).
 * Appends Set-Cookie headers so local session clearing is preserved.
 *
 * @param {import('@hapi/hapi').Request} request
 * @param {string[]} paths - cookie path prefixes, e.g. `/manage-waste-dashboard`
 */
export function clearSiblingAuthCookies(request, paths) {
  const response = request.response

  if (!response || response.isBoom) {
    return
  }

  for (const path of paths) {
    for (const name of SIBLING_AUTH_COOKIES) {
      response.header('Set-Cookie', buildExpiredSetCookie(name, path), {
        append: true
      })
    }
  }
}

/**
 * Clears sibling auth cookies configured for this app.
 *
 * @param {import('@hapi/hapi').Request} request
 */
export function clearConfiguredSiblingAuthCookies(request) {
  clearSiblingAuthCookies(request, config.get('auth.siblingCookiePaths'))
}
