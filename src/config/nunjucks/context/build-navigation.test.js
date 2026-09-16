import {
  buildNavigation,
  buildAccountNavigation,
  buildRegulatorContext
} from './build-navigation.js'

function mockRequest(options) {
  return { ...options }
}

describe('#buildNavigation', () => {
  test('Should return an empty array', () => {
    expect(buildNavigation(mockRequest({ path: '/' }))).toEqual([])
  })
})

describe('#buildAccountNavigation', () => {
  test('Should return organisation name when available in accountDetails', () => {
    const request = mockRequest({
      app: { accountDetails: { organisationName: 'Environment Agency' } }
    })
    expect(buildAccountNavigation(request)).toEqual([
      { text: 'Environment Agency' }
    ])
  })

  test('Should return empty array when organisationName is absent', () => {
    const request = mockRequest({ app: { accountDetails: {} } })
    expect(buildAccountNavigation(request)).toEqual([])
  })

  test('Should return empty array when accountDetails is absent', () => {
    const request = mockRequest({ app: {} })
    expect(buildAccountNavigation(request)).toEqual([])
  })
})

describe('#buildRegulatorContext', () => {
  test('Should return sign in link when user is not authenticated', () => {
    const request = mockRequest({ yar: { id: null } })
    const result = buildRegulatorContext(request, 'en')
    expect(result).toContain('Sign in')
    expect(result).toContain('href="/auth/login"')
  })

  test('Should show first and last name and sign out link when available in accountDetails', () => {
    const request = mockRequest({
      yar: {
        id: '123',
        get: (key) => (key === 'user' ? { name: 'Fallback Name' } : null)
      },
      app: { accountDetails: { firstName: 'John', lastName: 'Doe' } }
    })
    const result = buildRegulatorContext(request, 'en')
    expect(result).toContain('John Doe &nbsp;|&nbsp;')
    expect(result).toContain('Sign out')
    expect(result).toContain('href="/auth/logout"')
  })

  test('Should fallback to user.name if firstName/lastName not in accountDetails', () => {
    const request = mockRequest({
      yar: {
        id: '123',
        get: (key) => (key === 'user' ? { name: 'Fallback Name' } : null)
      },
      app: { accountDetails: {} }
    })
    const result = buildRegulatorContext(request, 'en')
    expect(result).toContain('Fallback Name &nbsp;|&nbsp;')
    expect(result).toContain('Sign out')
  })

  test('Should still render correctly if user object has no name', () => {
    const request = mockRequest({
      yar: { id: '123', get: (key) => (key === 'user' ? {} : null) }
    })
    const result = buildRegulatorContext(request, 'en')
    expect(result).not.toContain('undefined')
    expect(result).toContain('Sign out')
  })
})
