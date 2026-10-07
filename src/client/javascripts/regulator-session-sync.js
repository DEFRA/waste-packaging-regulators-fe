const STORAGE_KEY = 'regulator-auth-revoked'
const LOGOUT_LINK_SELECTOR = 'a[href*="/logout"]'

function markAuthRevoked() {
  try {
    localStorage.setItem(STORAGE_KEY, String(Date.now()))
  } catch {
    // localStorage may be unavailable
  }
}

function clearAuthRevoked() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // localStorage may be unavailable
  }
}

function redirectIfRevoked() {
  try {
    if (localStorage.getItem(STORAGE_KEY)) {
      window.location.href = '/logout'
    }
  } catch {
    // localStorage may be unavailable
  }
}

async function recheckAuthOnVisible() {
  if (document.visibilityState !== 'visible') {
    return
  }

  if (!document.querySelector(LOGOUT_LINK_SELECTOR)) {
    return
  }

  try {
    const response = await fetch(
      `${window.location.pathname}${window.location.search}`,
      {
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { Accept: 'text/html' }
      }
    )
    const html = await response.text()
    if (!html.includes('/logout')) {
      window.location.reload()
    }
  } catch {
    // fetch may fail when offline
  }
}

export function initRegulatorSessionSync() {
  if (window.location.pathname.includes('/signed-out')) {
    markAuthRevoked()

    const returnTo = new URLSearchParams(window.location.search).get('returnTo')
    if (returnTo && /^https?:\/\//i.test(returnTo)) {
      window.location.replace(returnTo)
    }
    return
  }

  document.querySelectorAll(LOGOUT_LINK_SELECTOR).forEach((link) => {
    link.addEventListener('click', () => markAuthRevoked())
  })

  if (document.querySelector(LOGOUT_LINK_SELECTOR)) {
    clearAuthRevoked()
  }

  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY && event.newValue) {
      redirectIfRevoked()
    }
  })

  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible') {
      redirectIfRevoked()
      await recheckAuthOnVisible()
    }
  })
}
