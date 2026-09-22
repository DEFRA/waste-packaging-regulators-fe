export function getBaseQueryString(request) {
  const qs = new URLSearchParams()
  if (request.query.type) {
    qs.set('type', request.query.type)
  }
  if (request.query.tab) {
    qs.set('tab', request.query.tab)
  }
  return qs.toString() ? `?${qs.toString()}` : ''
}
