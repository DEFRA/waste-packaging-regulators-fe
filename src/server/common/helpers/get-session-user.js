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

function pickAuthProfile(profile) {
  if (!profile || typeof profile !== 'object') {
    return null
  }

  return {
    oid: profile.oid,
    sub: profile.sub,
    email: profile.email,
    emails: profile.emails
  }
}

/**
 * Merge Bell auth claims and any stored auth profile into the Yar session user
 * so obligations API actions receive a GUID id and email.
 *
 * @param {import('@hapi/hapi').Request} request
 * @returns {object|null}
 */
export function enrichRegulatorSessionUser(request) {
  const sessionUser = getSessionUser(request)
  if (!sessionUser) {
    return null
  }

  const profile =
    pickAuthProfile(request.auth?.credentials?.profile) ??
    pickAuthProfile(sessionUser.authProfile) ??
    pickAuthProfile(sessionUser.profile)

  const enriched = { ...sessionUser }

  if (profile) {
    enriched.authProfile = profile
    enriched.profile = profile

    const userId = profile.oid ?? profile.sub
    if (userId) {
      enriched.id = userId
    }

    enriched.email =
      profile.email ??
      profile.emails?.[0] ??
      enriched.email ??
      enriched.contactEmail
  }

  request.yar.set('user', enriched)
  return enriched
}
