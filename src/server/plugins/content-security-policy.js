import Blankie from 'blankie'

const googleAnalyticsUrl = 'https://www.google-analytics.com'

/**
 * Manage content security policies.
 * @satisfies {import('@hapi/hapi').Plugin}
 */
const contentSecurityPolicy = {
  plugin: Blankie,
  options: {
    // Hash 'sha256-GUQ5ad8JK5KmEWmROf3LZd9ge94daqNvd8xy9YS1iDw=' is to support a GOV.UK frontend script bundled within Nunjucks macros
    // https://frontend.design-system.service.gov.uk/import-javascript/#if-our-inline-javascript-snippet-is-blocked-by-a-content-security-policy
    defaultSrc: ['self'],
    fontSrc: ['self', 'data:', googleAnalyticsUrl],
    connectSrc: [
      'self',
      'wss',
      'data:',
      googleAnalyticsUrl,
      'https://region1.google-analytics.com',
      'https://analytics.google.com'
    ],
    mediaSrc: ['self'],
    styleSrc: ['self'],
    scriptSrc: [
      'self',
      "'sha256-GUQ5ad8JK5KmEWmROf3LZd9ge94daqNvd8xy9YS1iDw='",
      'https://www.googletagmanager.com',
      googleAnalyticsUrl
    ],
    imgSrc: [
      'self',
      'data:',
      googleAnalyticsUrl,
      'https://www.googletagmanager.com'
    ],
    frameSrc: ['self', 'data:'],
    objectSrc: ['none'],
    frameAncestors: ['none'],
    formAction: ['self'],
    manifestSrc: ['self'],
    generateNonces: true
  }
}

export { contentSecurityPolicy }
