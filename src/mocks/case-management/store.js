export function createCaseManagementStore(records = []) {
  const cases = [...records]

  function listCases({
    nation,
    caseTypes,
    unassignedOnly,
    isTerminal,
    producerTypes,
    page,
    pageSize
  }) {
    const filtered = cases.filter((item) => {
      if (nation && item.nation !== nation) {
        return false
      }
      if (
        caseTypes?.length &&
        !caseTypes.some(
          (type) =>
            String(type).toLowerCase() === String(item.caseType).toLowerCase()
        )
      ) {
        return false
      }
      if (unassignedOnly && item.assignedToId) {
        return false
      }
      if (isTerminal != null && item.isTerminal !== isTerminal) {
        return false
      }
      if (producerTypes?.length && !producerTypes.includes(item.producerType)) {
        return false
      }
      return true
    })

    const safePage = Math.max(1, page ?? 1)
    const safePageSize = Math.max(1, pageSize ?? 20)
    const start = (safePage - 1) * safePageSize
    const items = filtered.slice(start, start + safePageSize)

    return {
      items,
      totalCount: filtered.length,
      page: safePage,
      pageSize: safePageSize
    }
  }

  return { listCases }
}
