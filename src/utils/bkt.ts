import type { FadingStage } from '../types'

/** BKT parameters per skill */
export interface BKTParams {
  pL0: number // initial mastery probability
  pT: number // learning/transition rate
  pS: number // slip probability
  pG: number // guess probability
}

/** Default parameters (from Corbett & Anderson 1995) */
export const DEFAULT_BKT_PARAMS: Record<string, BKTParams> = {
  求时间: { pL0: 0.05, pT: 0.1, pS: 0.1, pG: 0.05 },
  求路程: { pL0: 0.05, pT: 0.1, pS: 0.1, pG: 0.05 },
}

export const BKT_SKILL_NAMES = Object.keys(DEFAULT_BKT_PARAMS)

/** Update P(L) after one answer */
export function updateBKT(pL: number, isCorrect: boolean, params: BKTParams): number {
  // Step 1: posterior given evidence
  let pLgivenEvidence: number
  if (isCorrect) {
    const numerator = pL * (1 - params.pS)
    const denominator = pL * (1 - params.pS) + (1 - pL) * params.pG
    pLgivenEvidence = numerator / denominator
  } else {
    const numerator = pL * params.pS
    const denominator = pL * params.pS + (1 - pL) * (1 - params.pG)
    pLgivenEvidence = numerator / denominator
  }

  // Step 2: add learning opportunity
  const pLnext = pLgivenEvidence + (1 - pLgivenEvidence) * params.pT

  return Math.min(1, Math.max(0, pLnext))
}

/** Map P(L) to fading stage */
export function pLtoFadingStage(pL: number): FadingStage {
  if (pL < 0.4) return 'full_support'
  if (pL < 0.6) return 'partial'
  if (pL < 0.8) return 'minimal'
  return 'none'
}

/** Map P(L) to ability level 1–5 */
export function pLtoAbilityLevel(pL: number): number {
  if (pL < 0.2) return 1
  if (pL < 0.4) return 2
  if (pL < 0.6) return 3
  if (pL < 0.8) return 4
  return 5
}

/** Map pretest score to P(L0); pretestScore: number of correct answers (0-5) */
export function pretestToPL0(pretestScore: number, _totalQuestions: number = 5): number {
  const mapping: Record<number, number> = {
    0: 0.05,
    1: 0.15,
    2: 0.3,
    3: 0.5,
    4: 0.7,
    5: 0.85,
  }
  const score = Math.round(pretestScore)
  return mapping[score] ?? 0.05
}
