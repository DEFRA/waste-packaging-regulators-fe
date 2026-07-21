export function redirectToSignIn(request, h) {
  request.yar.set('returnTo', request.url.pathname + request.url.search)
  return h.redirect('/signin-oidc')
}
