import { createServer } from '#/server/server.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import {
  mockSummary,
  mockPendingItems,
  mockAcceptedItems,
  mockNotSubmittedItems
} from '../certificates-of-compliance.service.js'

describe('#certificatesOfComplianceController', () => {
  let server
  let sessionCookie

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
    // Sign in via mock strategy to get a session cookie for use in all tests
    const { headers } = await server.inject({
      method: 'GET',
      url: '/signin-oidc'
    })
    sessionCookie = headers['set-cookie']?.[0]?.split(';')[0]
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  const inject = (url) =>
    server.inject({ method: 'GET', url, headers: { cookie: sessionCookie } })

  test('Should return 200 for default request', async () => {
    const { statusCode } = await inject('/certificates-of-compliance')

    expect(statusCode).toBe(statusCodes.ok)
  })

  test('Should render the page heading', async () => {
    const { result } = await inject('/certificates-of-compliance')

    expect(result).toEqual(
      expect.stringContaining('View certificates and statements of compliance')
    )
  })

  test('Should render the compliance year from the summary', async () => {
    const { result } = await inject('/certificates-of-compliance')

    expect(result).toEqual(
      expect.stringContaining(`${mockSummary.complianceYear} compliance year`)
    )
  })

  describe('Organisation type navigation', () => {
    test('Should default to direct-producers as the active nav item', async () => {
      const { result } = await inject('/certificates-of-compliance')

      expect(result).toEqual(
        expect.stringContaining(
          '<strong class="govuk-service-navigation__active-fallback">Direct producers</strong>'
        )
      )
    })

    test('Should set direct-producers as the active nav item when type=direct-producers', async () => {
      const { result, statusCode } = await inject(
        '/certificates-of-compliance?type=direct-producers'
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(
        expect.stringContaining(
          '<strong class="govuk-service-navigation__active-fallback">Direct producers</strong>'
        )
      )
    })

    test('Should set compliance-schemes as the active nav item when type=compliance-schemes', async () => {
      const { result, statusCode } = await inject(
        '/certificates-of-compliance?type=compliance-schemes'
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(
        expect.stringContaining(
          '<strong class="govuk-service-navigation__active-fallback">Compliance schemes</strong>'
        )
      )
    })

    test('Should preserve the active tab when switching organisation type', async () => {
      const { result } = await inject(
        '/certificates-of-compliance?type=direct-producers&tab=accepted'
      )

      expect(result).toEqual(
        expect.stringContaining('type=direct-producers&tab=accepted')
      )
    })

    test('Should include the current tab in the non-active organisation type nav link', async () => {
      const { result } = await inject(
        '/certificates-of-compliance?type=compliance-schemes&tab=accepted'
      )

      expect(result).toEqual(
        expect.stringContaining('type=direct-producers&tab=accepted')
      )
    })
  })

  describe('Tab counts', () => {
    test('Should show the pending count from mock data in the tab label', async () => {
      const { result } = await inject('/certificates-of-compliance')

      expect(result).toEqual(
        expect.stringContaining(`Pending (${mockSummary.totalPending})`)
      )
    })

    test('Should show the accepted count from mock data in the tab label', async () => {
      const { result } = await inject('/certificates-of-compliance')

      expect(result).toEqual(
        expect.stringContaining(`Accepted (${mockSummary.totalAccepted})`)
      )
    })

    test('Should show the not submitted count from mock data in the tab label', async () => {
      const { result } = await inject('/certificates-of-compliance')

      expect(result).toEqual(
        expect.stringContaining(
          `Not submitted (${mockSummary.totalNotSubmitted})`
        )
      )
    })
  })

  describe('Tab content', () => {
    test('Should render pending items in the pending tab by default', async () => {
      const { result } = await inject('/certificates-of-compliance')

      expect(result).toEqual(
        expect.stringContaining(`<strong>${mockSummary.totalPending}</strong>`)
      )
      expect(result).toEqual(expect.stringContaining('pending submissions'))
      mockPendingItems.forEach(({ organisationName, id }) => {
        expect(result).toEqual(expect.stringContaining(organisationName))
        expect(result).toEqual(expect.stringContaining(id))
      })
    })

    test('Should render accepted items in the accepted tab', async () => {
      const { result, statusCode } = await inject(
        '/certificates-of-compliance?tab=accepted'
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(
        expect.stringContaining(`<strong>${mockSummary.totalAccepted}</strong>`)
      )
      expect(result).toEqual(expect.stringContaining('accepted submissions'))
      mockAcceptedItems.forEach(({ organisationName, id }) => {
        expect(result).toEqual(expect.stringContaining(organisationName))
        expect(result).toEqual(expect.stringContaining(id))
      })
    })

    test('Should render not submitted items in the not submitted tab', async () => {
      const { result, statusCode } = await inject(
        '/certificates-of-compliance?tab=not-submitted'
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(
        expect.stringContaining(
          `<strong>${mockSummary.totalNotSubmitted}</strong>`
        )
      )
      expect(result).toEqual(expect.stringContaining('not submitted'))
      mockNotSubmittedItems.forEach(({ organisationName, organisationReferenceNumber }) => {
        expect(result).toEqual(expect.stringContaining(organisationName))
        expect(result).toEqual(expect.stringContaining(organisationReferenceNumber))
      })
    })

    test('Should not render other tab panels when a specific tab is active', async () => {
      const { result } = await inject(
        '/certificates-of-compliance?tab=accepted'
      )

      expect(result).not.toEqual(expect.stringContaining('pending submissions'))
      expect(result).not.toEqual(expect.stringContaining('not submitted'))
    })

    test('Should not show the Date submitted column on the not-submitted tab', async () => {
      const { result } = await inject(
        '/certificates-of-compliance?tab=not-submitted'
      )

      expect(result).not.toEqual(expect.stringContaining('Date submitted'))
    })

    test('Should show the Date submitted column on the pending tab', async () => {
      const { result } = await inject('/certificates-of-compliance?tab=pending')

      expect(result).toEqual(expect.stringContaining('Date submitted'))
    })
  })

  describe('Regulation 43 column', () => {
    test('Should show Regulation 43 column header for compliance-schemes', async () => {
      const { result } = await inject(
        '/certificates-of-compliance?type=compliance-schemes&tab=accepted'
      )

      expect(result).toEqual(expect.stringContaining('Regulation 43'))
      expect(result).not.toEqual(expect.stringContaining('Percentage met'))
    })

    test('Should show Percentage met column header for direct-producers', async () => {
      const { result } = await inject(
        '/certificates-of-compliance?type=direct-producers&tab=accepted'
      )

      expect(result).toEqual(expect.stringContaining('Percentage met'))
      expect(result).not.toEqual(expect.stringContaining('Regulation 43'))
    })

    test('Should render Compliant tag for items where regulation43Met is true', async () => {
      const trueItem = mockAcceptedItems.find(
        (item) => item.regulation43Met === true
      )
      const { result } = await inject(
        '/certificates-of-compliance?type=compliance-schemes&tab=accepted'
      )

      expect(result).toEqual(expect.stringContaining(trueItem.organisationName))
      expect(result).toEqual(expect.stringContaining('Compliant'))
    })

    test('Should render Not compliant tag for items where regulation43Met is false', async () => {
      const falseItem = mockAcceptedItems.find(
        (item) => item.regulation43Met === false
      )
      const { result } = await inject(
        '/certificates-of-compliance?type=compliance-schemes&tab=accepted'
      )

      expect(result).toEqual(
        expect.stringContaining(falseItem.organisationName)
      )
      expect(result).toEqual(expect.stringContaining('Not compliant'))
    })

    test('Should show Regulation 43 column header on the pending tab for compliance-schemes', async () => {
      const { result } = await inject(
        '/certificates-of-compliance?type=compliance-schemes&tab=pending'
      )

      expect(result).toEqual(expect.stringContaining('Regulation 43'))
    })

    test('Should show Regulation 43 column header on the not-submitted tab for compliance-schemes', async () => {
      const { result } = await inject(
        '/certificates-of-compliance?type=compliance-schemes&tab=not-submitted'
      )

      expect(result).toEqual(expect.stringContaining('Regulation 43'))
      expect(result).not.toEqual(expect.stringContaining('Percentage met'))
    })

    test('Should show Percentage met column header on the not-submitted tab for direct-producers', async () => {
      const { result } = await inject(
        '/certificates-of-compliance?type=direct-producers&tab=not-submitted'
      )

      expect(result).toEqual(expect.stringContaining('Percentage met'))
      expect(result).not.toEqual(expect.stringContaining('Regulation 43'))
    })
  })

  describe('Pagination', () => {
    test('Should include type and tab params in pagination links', async () => {
      const { result } = await inject(
        '/certificates-of-compliance?type=direct-producers&tab=pending&page=1'
      )

      expect(result).toEqual(
        expect.stringContaining(
          '/certificates-of-compliance?type=direct-producers&amp;tab=pending&amp;page='
        )
      )
    })
  })
})
