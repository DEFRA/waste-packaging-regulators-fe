import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { initRegulatorSessionSync } from './regulator-session-sync.js'

const STORAGE_KEY = 'regulator-auth-revoked'

function createStorage() {
  const store = new Map()
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => {
      store.set(key, String(value))
    },
    removeItem: (key) => {
      store.delete(key)
    }
  }
}

function setupBrowser({ pathname = '/', search = '' } = {}) {
  const storage = createStorage()
  const location = {
    pathname,
    search,
    href: `${pathname}${search}`,
    replace: vi.fn(),
    reload: vi.fn()
  }
  const listeners = new Map()

  globalThis.localStorage = storage
  globalThis.window = {
    location,
    addEventListener: vi.fn((event, handler) => {
      const handlers = listeners.get(event) ?? []
      handlers.push(handler)
      listeners.set(event, handlers)
    })
  }
  globalThis.document = {
    visibilityState: 'visible',
    querySelector: vi.fn(() => null),
    querySelectorAll: vi.fn(() => []),
    addEventListener: vi.fn((event, handler) => {
      const handlers = listeners.get(event) ?? []
      handlers.push(handler)
      listeners.set(event, handlers)
    })
  }
  globalThis.fetch = vi.fn()

  return { storage, location, listeners }
}

function dispatchEvent(listeners, event, detail) {
  for (const handler of listeners.get(event) ?? []) {
    handler(detail)
  }
}

describe('initRegulatorSessionSync', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    delete globalThis.localStorage
    delete globalThis.window
    delete globalThis.document
    delete globalThis.fetch
  })

  it('marks auth revoked and follows returnTo on the signed-out page', () => {
    const { storage, location } = setupBrowser({
      pathname: '/signed-out',
      search: '?returnTo=https%3A%2F%2Flocalhost%3A7154%2Fsigned-out'
    })

    initRegulatorSessionSync()

    expect(storage.getItem(STORAGE_KEY)).not.toBeNull()
    expect(location.replace).toHaveBeenCalledWith(
      'https://localhost:7154/signed-out'
    )
  })

  it('marks auth revoked on signed-out without redirecting when returnTo is absent', () => {
    const { storage, location } = setupBrowser({ pathname: '/signed-out' })

    initRegulatorSessionSync()

    expect(storage.getItem(STORAGE_KEY)).not.toBeNull()
    expect(location.replace).not.toHaveBeenCalled()
  })

  it('clears revoked state when a logout link is present', () => {
    const { storage } = setupBrowser()
    storage.setItem(STORAGE_KEY, '1')
    document.querySelectorAll.mockReturnValue([
      {
        getAttribute: () => '/logout',
        addEventListener: vi.fn()
      }
    ])

    initRegulatorSessionSync()

    expect(storage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('marks auth revoked when a logout link is clicked', () => {
    const link = {
      addEventListener: vi.fn(),
      getAttribute: vi.fn(() => '/logout')
    }
    setupBrowser()
    document.querySelectorAll.mockReturnValue([link])

    initRegulatorSessionSync()

    const clickHandler = link.addEventListener.mock.calls[0][1]
    clickHandler()

    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull()
  })

  it('redirects to logout when another tab broadcasts logout', () => {
    const { storage, location, listeners } = setupBrowser()
    storage.setItem(STORAGE_KEY, '1')
    document.querySelectorAll.mockReturnValue([
      {
        getAttribute: () => '/cy/defra/logout',
        addEventListener: vi.fn()
      }
    ])

    initRegulatorSessionSync()

    storage.setItem(STORAGE_KEY, '1')
    dispatchEvent(listeners, 'storage', {
      key: STORAGE_KEY,
      newValue: String(Date.now())
    })

    expect(location.href).toBe('/cy/defra/logout')
  })

  it('reloads when visibility recheck finds the session is no longer signed in', async () => {
    const logoutLink = {}
    const { location } = setupBrowser({
      pathname: '/certificates-of-compliance',
      search: '?tab=pending'
    })
    document.querySelector.mockReturnValue(logoutLink)
    globalThis.fetch = vi.fn().mockResolvedValue({
      text: vi.fn().mockResolvedValue('<html><body>Signed out</body></html>')
    })

    initRegulatorSessionSync()

    const visibilityHandler = document.addEventListener.mock.calls.find(
      ([event]) => event === 'visibilitychange'
    )[1]
    visibilityHandler()
    await vi.waitFor(() => {
      expect(location.reload).toHaveBeenCalled()
    })

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/certificates-of-compliance?tab=pending',
      {
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { Accept: 'text/html' }
      }
    )
  })

  it('skips visibility recheck when no logout link is on the page', async () => {
    setupBrowser()
    document.querySelector.mockReturnValue(null)

    initRegulatorSessionSync()

    const visibilityHandler = document.addEventListener.mock.calls.find(
      ([event]) => event === 'visibilitychange'
    )[1]
    visibilityHandler()

    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it('ignores visibility recheck when the document is hidden', async () => {
    setupBrowser()
    document.visibilityState = 'hidden'
    document.querySelector.mockReturnValue({})

    initRegulatorSessionSync()

    const visibilityHandler = document.addEventListener.mock.calls.find(
      ([event]) => event === 'visibilitychange'
    )[1]
    await visibilityHandler()

    expect(fetch).not.toHaveBeenCalled()
  })

  it('silently catches errors when localStorage.setItem throws', () => {
    setupBrowser({ pathname: '/signed-out' })
    globalThis.localStorage.setItem = vi.fn(() => {
      throw new Error('QuotaExceededError')
    })

    expect(() => initRegulatorSessionSync()).not.toThrow()
  })

  it('silently catches errors when localStorage.removeItem throws', () => {
    setupBrowser()
    globalThis.localStorage.removeItem = vi.fn(() => {
      throw new Error('AccessDenied')
    })
    document.querySelectorAll.mockReturnValue([
      {
        getAttribute: () => '/logout',
        addEventListener: vi.fn()
      }
    ])

    expect(() => initRegulatorSessionSync()).not.toThrow()
  })

  it('silently catches errors when localStorage.getItem throws', () => {
    const { listeners } = setupBrowser()
    globalThis.localStorage.getItem = vi.fn(() => {
      throw new Error('AccessDenied')
    })

    initRegulatorSessionSync()

    expect(() => {
      dispatchEvent(listeners, 'storage', {
        key: STORAGE_KEY,
        newValue: String(Date.now())
      })
    }).not.toThrow()
  })

  it('silently catches errors when fetch throws during visibility check', async () => {
    const logoutLink = {}
    setupBrowser({
      pathname: '/certificates-of-compliance'
    })
    document.querySelector.mockReturnValue(logoutLink)
    globalThis.fetch = vi
      .fn()
      .mockRejectedValue(new TypeError('Failed to fetch'))

    initRegulatorSessionSync()

    const visibilityHandler = document.addEventListener.mock.calls.find(
      ([event]) => event === 'visibilitychange'
    )[1]

    await expect(visibilityHandler()).resolves.toBeUndefined()
  })

  it('aborts recheckAuthOnVisible if visibilityState changes to hidden before check', async () => {
    setupBrowser({
      pathname: '/certificates-of-compliance'
    })
    document.querySelector.mockReturnValue({})

    let calls = 0
    Object.defineProperty(document, 'visibilityState', {
      get: () => {
        calls++
        return calls === 1 ? 'visible' : 'hidden'
      },
      configurable: true
    })

    initRegulatorSessionSync()

    const visibilityHandler = document.addEventListener.mock.calls.find(
      ([event]) => event === 'visibilitychange'
    )[1]

    await visibilityHandler()

    expect(fetch).not.toHaveBeenCalled()
  })

  it('does not reload if the page still contains the logout link', async () => {
    const logoutLink = {
      getAttribute: () => '/logout',
      addEventListener: vi.fn()
    }
    setupBrowser({ pathname: '/certificates-of-compliance' })
    document.querySelector.mockReturnValue(logoutLink)
    document.querySelectorAll.mockReturnValue([logoutLink])
    globalThis.fetch = vi.fn().mockResolvedValue({
      text: () =>
        Promise.resolve(
          '<html><body><a href="/logout">Logout</a></body></html>'
        )
    })

    initRegulatorSessionSync()

    const visibilityHandler = document.addEventListener.mock.calls.find(
      ([event]) => event === 'visibilitychange'
    )[1]

    await visibilityHandler()

    expect(window.location.reload).not.toHaveBeenCalled()
  })

  it('uses default logout URL if link has no href attribute', () => {
    const logoutLink = { getAttribute: () => null, addEventListener: vi.fn() }
    setupBrowser()
    document.querySelectorAll.mockReturnValue([logoutLink])

    initRegulatorSessionSync()

    expect(logoutLink.addEventListener).toHaveBeenCalledWith(
      'click',
      expect.any(Function)
    )
  })

  it('ignores storage events for other keys or with no new value', () => {
    const { listeners } = setupBrowser()
    document.querySelectorAll.mockReturnValue([])

    initRegulatorSessionSync()

    dispatchEvent(listeners, 'storage', {
      key: 'some-other-key',
      newValue: '123'
    })
    dispatchEvent(listeners, 'storage', { key: STORAGE_KEY, newValue: '' })

    expect(window.location.href).not.toBe('/logout')
  })
})
