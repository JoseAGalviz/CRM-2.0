const STAGE_SCORES = { lead: 5, qualified: 10, proposal: 15, negotiation: 20, won: 0, lost: 0 }

/**
 * Returns a health score (0-100) and metadata for a deal.
 * Higher = healthier / more likely to close.
 *
 * Scoring breakdown:
 *  - Probability   0–40 pts  (linear)
 *  - Stage         0–20 pts
 *  - Close date   -15 to +20 pts (overdue = penalty)
 *  - Last activity  0–20 pts  (stale deals lose points)
 */
export function getDealHealth(deal, daysSinceLastActivity = null) {
  if (deal.stage === 'won') return { score: 100, label: 'Ganado', color: 'text-green-600', bg: 'bg-green-500' }
  if (deal.stage === 'lost') return { score: 0, label: 'Perdido', color: 'text-gray-400', bg: 'bg-gray-400' }

  let score = 0

  // Probability (0–40)
  score += (deal.probability || 0) * 0.4

  // Stage (0–20)
  score += STAGE_SCORES[deal.stage] || 0

  // Close date proximity (–15 to +20)
  if (deal.expected_close) {
    const daysToClose = Math.ceil((new Date(deal.expected_close) - new Date()) / 86_400_000)
    if (daysToClose < 0)        score -= 15
    else if (daysToClose <= 7)  score += 20
    else if (daysToClose <= 30) score += 15
    else if (daysToClose <= 90) score += 10
    else                        score += 5
  }

  // Activity recency (0–20)
  if (daysSinceLastActivity !== null) {
    if (daysSinceLastActivity <= 3)       score += 20
    else if (daysSinceLastActivity <= 7)  score += 15
    else if (daysSinceLastActivity <= 14) score += 10
    else if (daysSinceLastActivity <= 30) score += 5
  }

  const clamped = Math.max(0, Math.min(100, Math.round(score)))

  if (clamped >= 70) return { score: clamped, label: 'Caliente',  color: 'text-green-600',  bg: 'bg-green-500' }
  if (clamped >= 40) return { score: clamped, label: 'Tibio',     color: 'text-yellow-600', bg: 'bg-yellow-400' }
  return                    { score: clamped, label: 'Frío',      color: 'text-red-500',    bg: 'bg-red-400' }
}
