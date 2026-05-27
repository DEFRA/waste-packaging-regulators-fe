import {
  getAccountDetails,
  getAccountUserIdFromSessionUser,
  mapAccountDetailsDtoToViewModel
} from '../common/services/gateway-account-client.js'

export const homeController = {
  async handler(request, h) {
    const user = request.yar?.get('user')
    if (!user) {
      return h.redirect('/regulators/signin-oidc')
    }

    let accountDetails
    let accountDetailsError
    const userId = getAccountUserIdFromSessionUser(user)

    if (userId) {
      try {
        const dto = await getAccountDetails(userId, {
          logger: request.logger
        })
        accountDetails = mapAccountDetailsDtoToViewModel(dto)
        if (
          !accountDetails ||
          (accountDetails.firstName === '' &&
            accountDetails.lastName === '' &&
            accountDetails.organisationName === '' &&
            accountDetails.nationId === undefined &&
            accountDetails.serviceRoleId === undefined)
        ) {
          accountDetails = undefined
          accountDetailsError = 'We could not load your account details.'
        }
      } catch (err) {
        request.logger?.error({ err }, 'Failed to load account details')
        accountDetailsError = 'We could not load your account details.'
      }
    } else {
      accountDetailsError = 'We could not determine your user id.'
    }

    return h.view('home/index', {
      pageTitle: 'Regulator Dashboard',
      heading: 'Regulator Dashboard',
      user,
      accountDetails,
      accountDetailsError
    })
  }
}
