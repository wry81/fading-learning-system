import type { QuestionData } from '../data/questions'

export const STEP2_REMINDER = '请在草稿纸上列出表达式'

export type Step2FormulaRow = {
  leftLabel: string
  operator: string
}

function parseStep2HintLine(line: string): Step2FormulaRow | null {
  const m = line.match(/^(.+?)\s*=\s*（___）\s*([+\-×÷])\s*（___）/)
  if (!m) return null
  return { leftLabel: m[1]!.trim(), operator: m[2]! }
}

export function getStep2FormulaRows(question: QuestionData): Step2FormulaRow[] {
  if (question.isTutorial) {
    return question.step2Hints
      .map(parseStep2HintLine)
      .filter((row): row is Step2FormulaRow => row != null)
  }

  const { skillType, hasTimeGap } = question

  if (skillType === '求时间') {
    if (hasTimeGap) {
      return [
        { leftLabel: '甲先行距离', operator: '×' },
        { leftLabel: '剩余距离', operator: '-' },
        { leftLabel: '速度和', operator: '+' },
        { leftLabel: '相遇时间', operator: '÷' },
      ]
    }
    return [
      { leftLabel: '速度和', operator: '+' },
      { leftLabel: '相遇时间', operator: '÷' },
    ]
  }

  if (hasTimeGap) {
    return [
      { leftLabel: '甲走的路程', operator: '×' },
      { leftLabel: '乙走的路程', operator: '×' },
      { leftLabel: '两地距离', operator: '+' },
    ]
  }
  return [
    { leftLabel: '速度和', operator: '+' },
    { leftLabel: '两地距离', operator: '×' },
  ]
}

export function initEmptyStep2Slots(question: QuestionData): string[][] {
  return getStep2FormulaRows(question).map(() => ['', '', ''])
}

function n(v: string | undefined): number {
  const x = Number.parseFloat(String(v ?? '').trim())
  return Number.isFinite(x) ? x : NaN
}

function row(a: number, b: number, result: number): string[] {
  return [String(a), String(b), String(result)]
}

/** Flat expected values: operand₁, operand₂, result per formula row. */
export function getStep2ExpectedValues(question: QuestionData): string[] {
  const s1 = question.expectedStep1Values
  const ans = question.correctAnswer

  if (question.isTutorial) {
    const qty = n(s1[0])
    const total = n(s1[1])
    const unit = total / qty
    return [...row(total, qty, unit), ...row(unit, 16, ans)]
  }

  const { skillType, hasTimeGap } = question

  if (skillType === '求时间') {
    const dist = n(s1[0])
    const speedA = n(s1[1])
    const speedB = n(s1[2])

    if (hasTimeGap) {
      const headTime = n(s1[3])
      const headDist = speedA * headTime
      const remaining = dist - headDist
      const speedSum = speedA + speedB
      return [
        ...row(speedA, headTime, headDist),
        ...row(dist, headDist, remaining),
        ...row(speedA, speedB, speedSum),
        ...row(remaining, speedSum, ans),
      ]
    }

    const speedSum = speedA + speedB
    return [...row(speedA, speedB, speedSum), ...row(dist, speedSum, ans)]
  }

  const speedA = n(s1[0])
  const speedB = n(s1[1])

  if (hasTimeGap) {
    const headTime = n(s1[2])
    const timeB = n(s1[3])
    const timeA = headTime + timeB
    const distA = speedA * timeA
    const distB = speedB * timeB
    return [...row(speedA, timeA, distA), ...row(speedB, timeB, distB), ...row(distA, distB, ans)]
  }

  const meetTime = n(s1[2])
  const speedSum = speedA + speedB
  return [...row(speedA, speedB, speedSum), ...row(speedSum, meetTime, ans)]
}
