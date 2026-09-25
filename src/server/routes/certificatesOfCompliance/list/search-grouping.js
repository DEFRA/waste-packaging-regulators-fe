// Nothing here sorts: both endpoints already ordered their rows, so one walk
// through a Map places each organisation at its most recent submission.

// The fallback stops two rows that both lack an organisationId from merging.
function groupKeyFor(item) {
  return item.organisationId ?? `ref:${item.organisationReferenceNumber}`
}

export function groupSearchItemsByOrganisation(
  declarationItems = [],
  unsubmittedItems = []
) {
  const unsubmittedByKey = new Map(
    unsubmittedItems.map((item) => [groupKeyFor(item), item])
  )

  const declarationsByKey = new Map()
  for (const item of declarationItems) {
    const key = groupKeyFor(item)
    const group = declarationsByKey.get(key)
    if (group) {
      group.push(item)
    } else {
      declarationsByKey.set(key, [item])
    }
  }

  const items = []

  for (const [key, declarations] of declarationsByKey) {
    // Both endpoints return an organisation holding only cancelled declarations.
    const unsubmitted = unsubmittedByKey.get(key)
    if (unsubmitted) {
      items.push(unsubmitted)
      unsubmittedByKey.delete(key)
    }
    items.push(...declarations)
  }

  items.push(...unsubmittedByKey.values())

  return items
}
