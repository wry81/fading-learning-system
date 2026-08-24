export type FadingStage = 'full_support' | 'partial' | 'minimal' | 'none'

export type StudyCondition = 'fading' | 'fixed' | 'no_ai'

export type SkillType = '倍数份数关系'

export type ProblemSubtype = 'sum' | 'difference'

/** Practice question shown before the formal experiment (not counted in BKT) */
export interface TutorialQuestionMeta {
  isTutorial?: boolean
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
  participantId: string
  condition: StudyCondition
  sessionId: number
  questionId: string
  questionOrder: number
  questionContent: string
  subject: string
  skillType: SkillType
  targetKnowledgeComponent: SkillType
  questionSubtype: ProblemSubtype
  userAnswers: number[]
  smallerQuantityAnswer: number
  largerQuantityAnswer: number
  correctAnswers: number[]
  isCorrect: boolean
  timeSpent: number // seconds spent on this question
  timestamp: number
  submittedAt: number
  fadingStageAtTime: FadingStage
  reflectionText: string // content from reflection page
  reflectionSkipped: boolean
  reflectionSubmittedAt: number | null
  perceivedOwnership: 1 | 2 | 3 | 4 | 5 | null
  perceivedDifficulty: 1 | 2 | 3 | 4 | 5 | null
  pLBefore: number // P(L) before this answer (BKT)
  pLAfter: number // P(L) after this answer (BKT)
  step1Escalations: number // how many times student escalated step1 hint
  step2Escalations: number
  step3Escalations: number
  steps: {
    step1: StepProcessRecord
    step2: StepProcessRecord
    step3: StepProcessRecord
  }
  timing: ProblemTimingRecord
  bkt: BKTProblemRecord
}

export interface SupportEscalationRecord {
  fromLevel: FadingStage
  toLevel: FadingStage
  timestamp: number
}

export interface HintExposureRecord {
  step: 1 | 2 | 3
  supportLevel: FadingStage
  hintText: string
  source: 'initial' | 'help_request' | 'check_feedback'
  generatedAt: number
  shownAt: number
}

export interface StepProcessRecord {
  enteredValues: string[]
  fieldCorrectness: boolean[]
  isCorrect: boolean
  checkCount: number
  stepStartedAt: number
  stepCompletedAt: number
  stepTime: number
  initialSupportLevel: FadingStage
  actualSupportLevelShown: FadingStage
  aiSupportShown: boolean
  helpRequestCount: number
  supportEscalations: SupportEscalationRecord[]
  displayedHints: HintExposureRecord[]
}

export interface ProblemTimingRecord {
  problemStartedAt: number
  problemCompletedAt: number
  totalProblemTime: number
  timeToFirstInteraction: number | null
  timeBeforeFirstHelpRequest: number | null
}

export interface BKTProblemRecord {
  pLBefore: number
  pLAfter: number
  fadingStageBefore: FadingStage
  fadingStageAfter: FadingStage
  consecutiveCorrectBefore: number
  consecutiveCorrectAfter: number
  fadingTransitionOccurred: boolean
}

export interface PersistedSkillState {
  pL: number
  fadingStage: FadingStage
  abilityLevel: number
  consecutiveCorrect: number
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
  /** Resume position for an interrupted intervention session. */
  currentQuestionIndex?: number
  currentSkillType?: SkillType | null
  answers: AnswerRecord[]
  fadingHistory: FadingEvent[]
  abilityLevelAtEnd: number
  fadingStageAtEnd: FadingStage
  skillStatesAtEnd: Record<string, PersistedSkillState>
  completedSkillsAtEnd: Partial<Record<SkillType, boolean>>
}

export interface Participant {
  id: string
  condition: StudyCondition
  createdAt: string
  sessions: Session[]
}
