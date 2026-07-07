import { describe, it, expect, vi, beforeEach } from 'vitest'
import { signinOidcController } from './controller.js'

const mockGetAccountDetailsById = vi.fn()

vi.mock('#services/account-api.service.js', () => ({
  createAccountApiService: () => ({
    getAccountDetailsById: mockGetAccountDetailsById
  })
}))

const mockAccountDetails = {
  firstName: 'Jane',
  lastName: 'Smith',
  organisationName: 'Test Agency',
  serviceRole: 'Regulator Admin',
  serviceRoleId: 2,
  contactEmail: 'jane.smith@test.gov.uk',
  nationId: 1
}

// Credentials shape after Bell parses the Azure AD B2C id_token into a profile
const credentials = {
  profile: {
    oid: 'user-oid-123',
    email: 'jane@example.com'
  }
}

function makeYar({ returnTo = null } = {}) {
  const store = { ...(returnTo ? { returnTo } : {}) }
  return {
    get: vi.fn((key) => store[key] ?? null),
    set: vi.fn((key, val) => {
      store[key] = val
    }),
    clear: vi.fn((key) => {
      delete store[key]
    }),
    _store: store
  }
}

function makeH() {
  return {
    redirect: vi.fn((url) => `redirect:${url}`)
  }
}

describe('signinOidcController', () => {
  describe('with valid credentials', () => {
    beforeEach(() => {
      mockGetAccountDetailsById.mockResolvedValue({ ...mockAccountDetails })
    })

    it('calls getAccountDetailsById with the oid from credentials profile', async () => {
      await signinOidcController.handler(
        { auth: { credentials }, yar: makeYar() },
        makeH()
      )

      expect(mockGetAccountDetailsById).toHaveBeenCalledWith('user-oid-123')
    })

    it('stores the user in yar with id from credentials profile oid', async () => {
      const yar = makeYar()
      await signinOidcController.handler(
        { auth: { credentials }, yar },
        makeH()
      )

      const stored = yar.set.mock.calls.find(([key]) => key === 'user')?.[1]
      expect(stored?.id).toBe('user-oid-123')
    })

    it('stores the user in yar with email from credentials profile', async () => {
      const yar = makeYar()
      await signinOidcController.handler(
        { auth: { credentials }, yar },
        makeH()
      )

      const stored = yar.set.mock.calls.find(([key]) => key === 'user')?.[1]
      expect(stored?.email).toBe('jane@example.com')
    })

    it('stores the user in yar with name derived from firstName and lastName', async () => {
      const yar = makeYar()
      await signinOidcController.handler(
        { auth: { credentials }, yar },
        makeH()
      )

      const stored = yar.set.mock.calls.find(([key]) => key === 'user')?.[1]
      expect(stored?.name).toBe('Jane Smith')
    })

    it('stores the full account details alongside id, email, and name', async () => {
      const yar = makeYar()
      await signinOidcController.handler(
        { auth: { credentials }, yar },
        makeH()
      )

      const stored = yar.set.mock.calls.find(([key]) => key === 'user')?.[1]
      expect(stored).toMatchObject(mockAccountDetails)
    })

    it('redirects to / when no returnTo is set', async () => {
      const h = makeH()
      await signinOidcController.handler(
        { auth: { credentials }, yar: makeYar() },
        h
      )

      expect(h.redirect).toHaveBeenCalledWith('/')
    })

    it('redirects to the returnTo URL when one is set', async () => {
      const h = makeH()
      await signinOidcController.handler(
        {
          auth: { credentials },
          yar: makeYar({ returnTo: '/certificates-of-compliance?tab=pending' })
        },
        h
      )

      expect(h.redirect).toHaveBeenCalledWith(
        '/certificates-of-compliance?tab=pending'
      )
    })

    it('clears returnTo from the session after redirecting', async () => {
      const yar = makeYar({ returnTo: '/some-path' })
      await signinOidcController.handler(
        { auth: { credentials }, yar },
        makeH()
      )

      expect(yar.clear).toHaveBeenCalledWith('returnTo')
    })
  })

  describe('without credentials', () => {
    it('does not call the account API', async () => {
      await signinOidcController.handler(
        { auth: null, yar: makeYar() },
        makeH()
      )

      expect(mockGetAccountDetailsById).not.toHaveBeenCalled()
    })

    it('does not set user in the session', async () => {
      const yar = makeYar()
      await signinOidcController.handler({ auth: null, yar }, makeH())

      expect(yar.set).not.toHaveBeenCalledWith('user', expect.anything())
    })

    it('still redirects to / when there are no credentials', async () => {
      const h = makeH()
      await signinOidcController.handler({ auth: null, yar: makeYar() }, h)

      expect(h.redirect).toHaveBeenCalledWith('/')
    })

    it('still redirects to returnTo when one is set and there are no credentials', async () => {
      const h = makeH()
      await signinOidcController.handler(
        { auth: null, yar: makeYar({ returnTo: '/dashboard' }) },
        h
      )

      expect(h.redirect).toHaveBeenCalledWith('/dashboard')
    })
  })
})
