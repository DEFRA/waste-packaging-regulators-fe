import { cookiesController } from './controller.js'

export const cookies = {
  plugin: {
    name: 'cookies',
    register(server) {
      const options = {
        auth: false,
        plugins: { crumb: false }
      }

      server.route([
        {
          method: 'GET',
          path: '/cookies',
          handler: cookiesController.getHandler,
          options
        },
        {
          method: 'POST',
          path: '/cookies',
          handler: cookiesController.postHandler,
          options
        },
        {
          method: 'POST',
          path: '/cookies/banner',
          handler: cookiesController.bannerPostHandler,
          options
        },
        {
          method: 'POST',
          path: '/cookies/hide-banner',
          handler: cookiesController.hideBannerPostHandler,
          options
        }
      ])
    }
  }
}
