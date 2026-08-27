// Obligation data — a compliance record's per-material recycling tonnages. The
// compliance records reference these by shape; a not-submitted organisation with
// no obligations of its own falls back to `defaultObligations`.

const obligationRow = (material, obligated, accepted, status, extra = {}) => ({
  material,
  recyclingTarget: 1,
  tonnages: {
    material: accepted,
    awaitingAcceptance: 0,
    accepted,
    outstanding: Math.max(obligated - accepted, 0),
    obligated,
    ...extra
  },
  status
})

export const mockObligationsAllMet = [
  obligationRow('Aluminium', 215, 215, 'Met'),
  obligationRow('Glass', 640, 640, 'Met'),
  obligationRow('PaperBoardFibre', 870, 870, 'Met'),
  obligationRow('Plastic', 1740, 1740, 'Met'),
  obligationRow('Steel', 365, 365, 'Met'),
  obligationRow('Wood', 80, 80, 'Met'),
  obligationRow('GlassRemelt', 420, 420, 'Met'),
  obligationRow('RemainingGlass', 220, 220, 'Met')
]

const noDataRow = (material, obligated) => ({
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
})

export const mockObligationsMixed = [
  obligationRow('Aluminium', 215, 215, 'Met'),
  obligationRow('Glass', 640, 500, 'NotMet', { awaitingAcceptance: 40 }),
  obligationRow('PaperBoardFibre', 870, 870, 'Met'),
  obligationRow('Plastic', 1740, 1500, 'NotMet', { awaitingAcceptance: 120 }),
  obligationRow('Steel', 365, 365, 'Met'),
  noDataRow('Wood', 80),
  obligationRow('GlassRemelt', 420, 380, 'NotMet', { awaitingAcceptance: 20 }),
  noDataRow('RemainingGlass', 220)
]

// Every material met bar one that falls short — 4186 accepted of 4550 obligated,
// which derives to 92% coverage with a NotMet recycling status.
export const mockObligationsMostlyMet = [
  obligationRow('Aluminium', 215, 215, 'Met'),
  obligationRow('Glass', 640, 640, 'Met'),
  obligationRow('PaperBoardFibre', 870, 870, 'Met'),
  obligationRow('Plastic', 1740, 1376, 'NotMet', { awaitingAcceptance: 120 }),
  obligationRow('Steel', 365, 365, 'Met'),
  obligationRow('Wood', 80, 80, 'Met'),
  obligationRow('GlassRemelt', 420, 420, 'Met'),
  obligationRow('RemainingGlass', 220, 220, 'Met')
]

export const mockObligationsAllZero = [
  'Aluminium',
  'Glass',
  'PaperBoardFibre',
  'Plastic',
  'Steel',
  'Wood',
  'GlassRemelt',
  'RemainingGlass'
].map((material) => ({
  material,
  recyclingTarget: 0,
  tonnages: {
    material: 0,
    awaitingAcceptance: 0,
    accepted: 0,
    outstanding: 0,
    obligated: 0
  },
  status: 'NoDataYet'
}))

// Default obligations (every material NoDataYet, some obligated). Stands in for any
// not-submitted organisation that has no obligation fixture of its own, giving a
// "No data" recycling status exactly as a live organisation with no return would.
export const defaultObligations = [
  { material: 'Aluminium', obligated: 215 },
  { material: 'Glass', obligated: 0 },
  { material: 'PaperBoardFibre', obligated: 870 },
  { material: 'Plastic', obligated: 1740 },
  { material: 'Steel', obligated: 365 },
  { material: 'Wood', obligated: 80 },
  { material: 'GlassRemelt', obligated: 0 },
  { material: 'RemainingGlass', obligated: 0 }
].map(({ material, obligated }) => ({
  material,
  recyclingTarget: 1,
  tonnages: {
    material: 0,
    awaitingAcceptance: 0,
    accepted: 0,
    outstanding: 0,
    obligated
  },
  status: 'NoDataYet'
}))
