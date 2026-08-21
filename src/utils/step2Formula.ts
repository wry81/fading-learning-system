import type { QuestionData } from '../data/questions'

/** The single structural value the learner derives in Step 2. */
export function getExpectedPartCount(question: QuestionData): number {
  return question.subtype === 'sum' ? question.factor + 1 : question.factor - 1
}

export function getPartRelationshipLabel(question: QuestionData): string {
  return question.subtype === 'sum'
    ? `${question.baseLabel}和${question.largerLabel}一共`
    : `${question.largerLabel}比${question.baseLabel}多`
}
