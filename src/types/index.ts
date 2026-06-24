export type FadingStage = 'full_support' | 'partial' | 'minimal' | 'none'

export type StudyCondition = 'fading' | 'fixed' | 'no_ai'

export type SkillType = '求时间' | '求路程'

/** Whether 甲/乙 depart at different times — selects Step 2 formula variant */
export interface HasTimeGapMeta {
  hasTimeGap: boolean
}

export interface Question {
  id: string
  type: 'multiple_choice'
  subject: string
  content: string
  options: string[]
  correctAnswer: number
  difficulty: 1 | 2 | 3 | 4 | 5
  hints?: {
    level1: string
    level2: string
    level3: string
  }
}

export interface AnswerRecord {
  questionId: string
  userAnswer: number
  isCorrect: boolean
  timeSpent: number // seconds spent on this question
  timestamp: number
  fadingStageAtTime: FadingStage
  reflectionText: string // content from reflection page
  pLBefore: number // P(L) before this answer (BKT)
  pLAfter: number // P(L) after this answer (BKT)
}

export interface FadingEvent {
  fromStage: FadingStage
  toStage: FadingStage
  abilityLevelAtChange: number
  timestamp: number
}

export interface Session {
  sessionId: number
  date: string
  answers: AnswerRecord[]
  fadingHistory: FadingEvent[]
  abilityLevelAtEnd: number
  fadingStageAtEnd: FadingStage
}

export interface Participant {
  id: string
  condition: StudyCondition
  createdAt: string
  sessions: Session[]
}

