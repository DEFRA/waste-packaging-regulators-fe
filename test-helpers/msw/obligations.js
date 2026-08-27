// Obligation presets for scenario tests. Each is a valid array of material
// rows; a test picks one (or passes its own) so the input that drives a row's
// recycling status and percentage is visible in the test, not hidden in a fixture.

// A single material obligation row with the given status — for building an obligations array
// inline in a test so the tonnages that drive the assertions are visible there.
export function materialRow(material, obligated, accepted, status = 'Met') {
  return {
    material,
    recyclingTarget: 1,
    tonnages: {
      material: accepted,
      awaitingAcceptance: 0,
      accepted,
      outstanding: Math.max(obligated - accepted, 0),
      obligated
    },
    status
  }
}

const met = (material, obligated, accepted) =>
  materialRow(material, obligated, accepted, 'Met')

const notMet = (material, obligated, accepted) => ({
  material,
  recyclingTarget: 1,
  tonnages: {
    material: accepted,
    awaitingAcceptance: 0,
    accepted,
    outstanding: Math.max(obligated - accepted, 0),
    obligated
  },
  status: 'NotMet'
})

// A material row with no tonnages reported yet — renders "No data" and zeroes.
export function noDataRow(material, obligated) {
  return {
    material,
    recyclingTarget: 1,
    tonnages: {
      material: null,
      awaitingAcceptance: null,
      accepted: null,
      outstanding: null,
      obligated
    },
    status: 'NoDataYet'
  }
}

const noData = noDataRow

// Named presets spanning the recycling states (Met / Not met / No data) and a
// couple of percentage-met points, so a test can name its input plainly.
export const obligationPresets = {
  // 100% coverage, all materials met.
  allMet: [met('Aluminium', 100, 100), met('Plastic', 200, 200)],
  // A not-met material drags the whole return to "Not met"; ~73% coverage.
  mixed: [met('Aluminium', 100, 100), notMet('Plastic', 200, 120)],
  // Everything short; 30% coverage.
  allNotMet: [notMet('Aluminium', 100, 40), notMet('Plastic', 200, 50)],
  // No tonnages reported yet → "No data"; 0% coverage.
  allNoData: [noData('Aluminium', 100), noData('Plastic', 200)],
  // No obligations at all.
  none: []
}
