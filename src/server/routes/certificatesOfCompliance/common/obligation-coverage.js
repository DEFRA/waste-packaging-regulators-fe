export function calculateObligationCoveragePercentage(obligations = []) {
  const totalAccepted = obligations.reduce(
    (sum, o) => sum + (o.tonnages?.accepted ?? 0),
    0
  )
  const totalObligated = obligations.reduce(
    (sum, o) => sum + (o.tonnages?.obligated ?? 0),
    0
  )

  if (totalObligated === 0) {
    return 0
  }

  const percentage = (totalAccepted / totalObligated) * 100
  // Match ObligationCoveragePercentageCalculator: cap then AwayFromZero round
  return Math.round(Math.min(percentage, 100))
}
