import type { GradedQuestion } from './types'

export function computeAverage(graded: GradedQuestion[]): number {
  if (!graded.length) return 0
  return graded.reduce((sum, q) => sum + q.score, 0) / graded.length
}

export function safePercent(value: number): number {
  return Math.round(Math.max(0, Math.min(1, value)) * 100)
}