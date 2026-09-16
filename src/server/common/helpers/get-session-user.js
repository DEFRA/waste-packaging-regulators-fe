/**
 * Read the authenticated user from Yar when the session has been initialized.
 * Returns null when Yar is missing, not yet initialized (e.g. 404 before onPreAuth),
 * or when no user is stored.
 *
 * @param {import('@hapi/hapi').Request} request
 * @returns {object|null}
 */
export function getSessionUser(request) {
  if (!request.yar?.id) {
    return null
  }

  return request.yar.get('user')
}
