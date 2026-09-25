import { groupSearchItemsByOrganisation } from './search-grouping.js'

// The rows arrive from the service already mapped, and already in each
// endpoint's own order — declarations most recent first, unsubmitted by name.
// These factories build only the fields the grouping reads.
function declaration(id, organisationId, overrides = {}) {
  return {
    id,
    organisationId,
    organisationName: `Org ${organisationId}`,
    organisationReferenceNumber: `REF-${organisationId}`,
    submissionStatus: 'Pending',
    ...overrides
  }
}

function unsubmitted(organisationId, overrides = {}) {
  return {
    id: null,
    organisationId,
    organisationName: `Org ${organisationId}`,
    organisationReferenceNumber: `REF-${organisationId}`,
    submissionStatus: 'Not submitted',
    ...overrides
  }
}

const idsOf = (items) => items.map((item) => item.id)
const orgsOf = (items) => items.map((item) => item.organisationId)

describe('#groupSearchItemsByOrganisation', () => {
  test('Should lead an organisation with its Not submitted row', () => {
    const items = groupSearchItemsByOrganisation(
      [declaration('cancelled-1', 'a', { submissionStatus: 'Cancelled' })],
      [unsubmitted('a')]
    )

    expect(items.map((item) => item.submissionStatus)).toEqual([
      'Not submitted',
      'Cancelled'
    ])
  })

  test('Should keep an organisation declarations in the order they arrived', () => {
    const items = groupSearchItemsByOrganisation(
      [
        declaration('newer', 'a'),
        declaration('middle', 'a'),
        declaration('older', 'a')
      ],
      []
    )

    expect(idsOf(items)).toEqual(['newer', 'middle', 'older'])
  })

  // The declaration endpoint sorts by date descending, so an organisation's
  // first row is its most recent — which is what positions the organisation.
  test('Should order organisations by where their first declaration arrived', () => {
    const items = groupSearchItemsByOrganisation(
      [
        declaration('a-newest', 'a'),
        declaration('b-newer', 'b'),
        declaration('a-older', 'a'),
        declaration('c-oldest', 'c')
      ],
      []
    )

    expect(orgsOf(items)).toEqual(['a', 'a', 'b', 'c'])
    expect(idsOf(items)).toEqual(['a-newest', 'a-older', 'b-newer', 'c-oldest'])
  })

  test('Should place organisations with no declaration after every organisation with one', () => {
    const items = groupSearchItemsByOrganisation(
      [declaration('d-1', 'submitted-org')],
      [unsubmitted('never-1'), unsubmitted('never-2')]
    )

    expect(orgsOf(items)).toEqual(['submitted-org', 'never-1', 'never-2'])
  })

  test('Should keep never-submitted organisations in the order the endpoint returned', () => {
    const items = groupSearchItemsByOrganisation(
      [],
      [
        unsubmitted('a', { organisationName: 'Alpha Ltd' }),
        unsubmitted('b', { organisationName: 'Beta Ltd' }),
        unsubmitted('c', { organisationName: 'Gamma Ltd' })
      ]
    )

    expect(items.map((item) => item.organisationName)).toEqual([
      'Alpha Ltd',
      'Beta Ltd',
      'Gamma Ltd'
    ])
  })

  // A cancelled-only organisation reaches both endpoints. It has a declaration to
  // position it, so it belongs among the submitted organisations rather than in
  // the never-submitted tail.
  test('Should position a cancelled-only organisation by its cancelled declaration', () => {
    const items = groupSearchItemsByOrganisation(
      [
        declaration('a-1', 'a'),
        declaration('cancelled-1', 'cancelled-org', {
          submissionStatus: 'Cancelled'
        }),
        declaration('b-1', 'b')
      ],
      [unsubmitted('cancelled-org'), unsubmitted('never-1')]
    )

    expect(orgsOf(items)).toEqual([
      'a',
      'cancelled-org',
      'cancelled-org',
      'b',
      'never-1'
    ])
  })

  test('Should never interleave one organisation rows with another', () => {
    const items = groupSearchItemsByOrganisation(
      [
        declaration('a-1', 'a'),
        declaration('b-1', 'b'),
        declaration('a-2', 'a'),
        declaration('b-2', 'b'),
        declaration('a-3', 'a')
      ],
      []
    )

    const seen = new Set()
    for (const [index, organisationId] of orgsOf(items).entries()) {
      const previous = index > 0 ? orgsOf(items)[index - 1] : null
      if (organisationId !== previous) {
        expect(seen.has(organisationId)).toBe(false)
        seen.add(organisationId)
      }
    }

    expect(orgsOf(items)).toEqual(['a', 'a', 'a', 'b', 'b'])
  })

  test('Should return the declarations unchanged when nothing is unsubmitted', () => {
    const declarations = [declaration('a-1', 'a'), declaration('b-1', 'b')]

    expect(groupSearchItemsByOrganisation(declarations, [])).toEqual(
      declarations
    )
  })

  test('Should return the unsubmitted rows unchanged when nothing matched a declaration', () => {
    const rows = [unsubmitted('a'), unsubmitted('b')]

    expect(groupSearchItemsByOrganisation([], rows)).toEqual(rows)
  })

  test('Should return nothing when neither endpoint matched', () => {
    expect(groupSearchItemsByOrganisation([], [])).toEqual([])
  })

  test('Should default both sides so a missing result set is not a crash', () => {
    expect(groupSearchItemsByOrganisation()).toEqual([])
  })

  // organisationId is the join between the two endpoints. Without the reference
  // number fallback, two different organisations both missing one would collapse
  // into a single group.
  test('Should not group two rows together only because both lack an organisation id', () => {
    const items = groupSearchItemsByOrganisation(
      [
        declaration('d-1', undefined, { organisationReferenceNumber: '111' }),
        declaration('d-2', undefined, { organisationReferenceNumber: '222' })
      ],
      []
    )

    expect(idsOf(items)).toEqual(['d-1', 'd-2'])
  })
})
