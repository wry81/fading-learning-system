import type { QuestionData } from '../data/questions'

export const STEP2_REMINDER = '请在草稿纸上列出表达式'

export type Step2FormulaRow = {
  leftLabel: string
  operator: string
}

export function getStep2FormulaRows(question: QuestionData): Step2FormulaRow[] {
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
  return getStep2FormulaRows(question).map(() => ['', ''])
}

/** Flat expected values for each blank, left-to-right, top-to-bottom. */
export function getStep2ExpectedValues(question: QuestionData): string[] {
  const { skillType, hasTimeGap } = question

  if (skillType === '求时间') {
    if (hasTimeGap) {
      return [
        '甲的速度',
        '先行时间',
        '总路程',
        '甲先行距离',
        '甲的速度',
        '乙的速度',
        '剩余距离',
        '速度和',
      ]
    }
    return ['甲的速度', '乙的速度', '总路程', '速度和']
  }

  if (hasTimeGap) {
    return [
      '甲的速度',
      '甲走的时间',
      '乙的速度',
      '乙走的时间',
      '甲走的路程',
      '乙走的路程',
    ]
  }
  return ['甲的速度', '乙的速度', '速度和', '相遇时间']
}
