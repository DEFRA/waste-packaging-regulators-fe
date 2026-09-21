import { withForwardedPrefix } from '#server/common/helpers/proxy/forwarded-prefix.js'

export function buildLanguageSwitcherUrls(request) {
  const path = withForwardedPrefix(request, request?.path ?? '/')
  const search = new URLSearchParams(
    String(request?.url?.search ?? '').replace(/^\?/, '')
  )

  search.set('lang', 'en')
  const enSearch = search.toString()
  search.set('lang', 'cy')
  const cySearch = search.toString()

  return {
    en: enSearch ? `${path}?${enSearch}` : `${path}?lang=en`,
    cy: cySearch ? `${path}?${cySearch}` : `${path}?lang=cy`
  }
}
