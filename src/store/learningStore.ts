import { create } from 'zustand'

import { questions } from '../data/questions'
import {
  DEFAULT_BKT_PARAMS,
  pretestToPL0,
  pLtoFadingStage,
  updateBKT,
} from '../utils/bkt'
import type {
  AnswerRecord,
  FadingEvent,
  FadingStage,
  Question,
  SkillType,
  StudyCondition,
} from '../types'

export type SkillState = {
  pL: number
  fadingStage: FadingStage
  abilityLevel: number
  consecutiveCorrect: number
}

export type BKTUpdateResult = {
  pLBefore: number
  pLAfter: number
  previousLevel: number
  newLevel: number
  previousStage: FadingStage
  newStage: FadingStage
  levelIncreased: boolean
  stageChanged: boolean
  consecutiveCorrect: number
}

const SKILL_TYPES: SkillType[] = ['求时间', '求路程']

const STAGE_ORDER: FadingStage[] = ['full_support', 'partial', 'minimal', 'none']

/** Map fading stage to abilityLevel 1–4 (backward compatibility) */
function fadingStageToAbilityLevel(stage: FadingStage): number {
  switch (stage) {
    case 'full_support':
      return 1
    case 'partial':
      return 2
    case 'minimal':
      return 3
    case 'none':
      return 4
  }
}

function stageIndex(stage: FadingStage): number {
  return STAGE_ORDER.indexOf(stage)
}

/** 进阶：仅升一级（full_support → partial → minimal → none） */
function nextFadingStage(stage: FadingStage): FadingStage {
  const idx = stageIndex(stage)
  return STAGE_ORDER[Math.min(idx + 1, STAGE_ORDER.length - 1)]!
}

/** 答错回退：取当前 stage 与 pL 对应 stage 中支持度更高（index 更小）者 */
function regressFadingStage(current: FadingStage, pLAfter: number): FadingStage {
  const pLStage = pLtoFadingStage(pLAfter)
  const idx = Math.min(stageIndex(current), stageIndex(pLStage))
  return STAGE_ORDER[idx]!
}

function createSkillState(pL0: number): SkillState {
  const fadingStage = pLtoFadingStage(pL0)
  return {
    pL: pL0,
    fadingStage,
    abilityLevel: fadingStageToAbilityLevel(fadingStage),
    consecutiveCorrect: 0,
  }
}

function defaultSkillStates(pL0: number = 0.05): Record<string, SkillState> {
  return {
    求时间: createSkillState(pL0),
    求路程: createSkillState(pL0),
  }
}

export function ensureSkillStates(
  states: Record<string, SkillState> | undefined,
): Record<string, SkillState> {
  const base = defaultSkillStates()
  if (!states) return base
  return {
    求时间: states['求时间'] ?? base['求时间']!,
    求路程: states['求路程'] ?? base['求路程']!,
  }
}

function bktStateFromSkillStates(skillStates: Record<string, SkillState>): Record<string, number> {
  return Object.fromEntries(Object.entries(skillStates).map(([skill, s]) => [skill, s.pL]))
}

type LearningState = {
  abilityLevel: number // active skill, 1-4
  fadingStage: FadingStage // active skill
  activeSkill: string | null
  currentSkillType: SkillType | null
  condition: StudyCondition | null
  currentParticipantId: string | null
  questionHistory: AnswerRecord[]
  fadingHistory: FadingEvent[]
  currentQuestion: Question | null
  currentQuestionIndex: number
  sessionStartTime: number | null

  /** Per-skill BKT + fading progress */
  skillStates: Record<string, SkillState>
  /** @deprecated synced from skillStates — use skillStates[skill].pL */
  bktState: Record<string, number>
  pretestScore: number

  /** Modules where all questions have been finished at least once */
  completedSkills: Partial<Record<SkillType, boolean>>

  setAbilityLevel: (level: number) => void
  setFadingStage: (stage: FadingStage) => void
  setCondition: (condition: StudyCondition) => void
  setCurrentParticipantId: (id: string | null) => void
  addAnswerRecord: (record: AnswerRecord) => void
  addFadingEvent: (event: FadingEvent) => void
  setCurrentQuestion: (question: Question | null) => void
  setCurrentQuestionIndex: (index: number) => void
  initBKT: (pretestScore: number) => void
  loadActiveSkill: (skill: string) => void
  setCurrentSkillType: (skill: SkillType) => void
  markSkillCompleted: (skill: SkillType) => void
  repairSkillStates: () => void
  updateBKTAfterAnswer: (skill: string, isCorrect: boolean) => BKTUpdateResult
  startSession: () => void
  resetSession: () => void
}

const initialSkillStates = defaultSkillStates()

const initialState = {
  abilityLevel: 1,
  fadingStage: 'full_support' as FadingStage,
  activeSkill: null as string | null,
  currentSkillType: null as SkillType | null,
  condition: null as StudyCondition | null,
  currentParticipantId: null,
  questionHistory: [] as AnswerRecord[],
  fadingHistory: [] as FadingEvent[],
  currentQuestion: null as Question | null,
  currentQuestionIndex: 0,
  sessionStartTime: null as number | null,
  skillStates: initialSkillStates,
  bktState: bktStateFromSkillStates(initialSkillStates),
  pretestScore: 0,
  completedSkills: {} as Partial<Record<SkillType, boolean>>,
}

export const useLearningStore = create<LearningState>((set, get) => ({
  ...initialState,

  setAbilityLevel: (level: number) => set({ abilityLevel: level }),
  setFadingStage: (stage: FadingStage) => set({ fadingStage: stage }),
  setCondition: (condition: StudyCondition) => set({ condition }),
  setCurrentParticipantId: (id: string | null) => set({ currentParticipantId: id }),
  addAnswerRecord: (record: AnswerRecord) =>
    set((state) => ({ questionHistory: [...state.questionHistory, record] })),
  addFadingEvent: (event: FadingEvent) =>
    set((state) => ({ fadingHistory: [...state.fadingHistory, event] })),
  setCurrentQuestion: (question: Question | null) => set({ currentQuestion: question }),
  setCurrentQuestionIndex: (index: number) => set({ currentQuestionIndex: index }),

  initBKT: (pretestScore: number) => {
    const pL0 = pretestToPL0(pretestScore)
    const skillStates = defaultSkillStates(pL0)
    set({
      pretestScore,
      skillStates,
      bktState: bktStateFromSkillStates(skillStates),
      activeSkill: null,
      currentSkillType: null,
      fadingStage: 'full_support',
      abilityLevel: 1,
    })
  },

  loadActiveSkill: (skill: string) => {
    const state = get()
    const skillStates = ensureSkillStates(state.skillStates)
    const skillState = skillStates[skill]
    if (!skillState) return
    set({
      skillStates,
      activeSkill: skill,
      fadingStage: skillState.fadingStage,
      abilityLevel: skillState.abilityLevel,
    })
  },

  setCurrentSkillType: (skill: SkillType) => {
    const state = get()
    const skillStates = ensureSkillStates(state.skillStates)
    const skillState = skillStates[skill]
    if (skillState) {
      set({
        skillStates,
        currentSkillType: skill,
        currentQuestionIndex: 0,
        activeSkill: skill,
        fadingStage: skillState.fadingStage,
        abilityLevel: skillState.abilityLevel,
      })
      return
    }
    set({ skillStates, currentSkillType: skill, currentQuestionIndex: 0, activeSkill: skill })
  },

  markSkillCompleted: (skill: SkillType) => {
    set((state) => ({
      completedSkills: { ...state.completedSkills, [skill]: true },
    }))
  },

  repairSkillStates: () => {
    const fixed = ensureSkillStates(get().skillStates)
    set({
      skillStates: fixed,
      bktState: bktStateFromSkillStates(fixed),
    })
  },

  updateBKTAfterAnswer: (skill: string, isCorrect: boolean) => {
    const state = get()
    const params = DEFAULT_BKT_PARAMS[skill] ?? DEFAULT_BKT_PARAMS['求时间']!
    const current = state.skillStates[skill] ?? createSkillState(params.pL0)

    const pLBefore = current.pL
    const pLAfter = updateBKT(pLBefore, isCorrect, params)

    let consecutiveCorrect = current.consecutiveCorrect
    if (isCorrect) {
      consecutiveCorrect += 1
    } else {
      consecutiveCorrect = 0
    }

    const previousStage = current.fadingStage
    const previousLevel = current.abilityLevel
    const pLStage = pLtoFadingStage(pLAfter)

    let newStage = previousStage
    let stageChanged = false

    if (isCorrect) {
      // 连续答对 2 题 → 仅升一级，不随 pL 跨级跳跃
      if (consecutiveCorrect >= 2 && previousStage !== 'none') {
        newStage = nextFadingStage(previousStage)
        consecutiveCorrect = 0
        stageChanged = newStage !== previousStage
      }
    } else {
      // 答错 → 按 pL 回退 scaffolding（增加 AI 支持）
      const regressed = regressFadingStage(previousStage, pLAfter)
      if (regressed !== previousStage) {
        newStage = regressed
        stageChanged = true
      }
    }

    const newLevel = fadingStageToAbilityLevel(newStage)

    const updatedSkill: SkillState = {
      pL: pLAfter,
      fadingStage: newStage,
      abilityLevel: newLevel,
      consecutiveCorrect,
    }

    const skillStates = { ...state.skillStates, [skill]: updatedSkill }
    const bktState = { ...state.bktState, [skill]: pLAfter }

    const currentQuestion =
      state.currentSkillType != null
        ? questions.filter((q) => q.skillType === state.currentSkillType)[
            state.currentQuestionIndex
          ]
        : undefined

    console.log('[BKT Debug]', {
      skill,
      questionId: currentQuestion?.id,
      isCorrect,
      pLBefore,
      pLAfter,
      consecutiveCorrect,
      fadingStageBeforeUpdate: previousStage,
      fadingStageAfterUpdate: newStage,
      pLStage,
      threshold_check: {
        pL_lt_04: pLAfter < 0.4,
        pL_lt_06: pLAfter < 0.6,
        pL_lt_08: pLAfter < 0.8,
      },
    })

    console.log('[BKT Update]', {
      skill,
      isCorrect,
      pLBefore,
      pLAfter,
      pLStage,
      consecutiveCorrect,
      previousStage,
      newFadingStage: newStage,
      newAbilityLevel: newLevel,
      stageChanged,
    })

    set({
      skillStates,
      bktState,
      activeSkill: skill,
      fadingStage: newStage,
      abilityLevel: newLevel,
    })

    if (stageChanged) {
      get().addFadingEvent({
        fromStage: previousStage,
        toStage: newStage,
        abilityLevelAtChange: newLevel,
        timestamp: Date.now(),
      })
    }

    return {
      pLBefore,
      pLAfter,
      previousLevel,
      newLevel,
      previousStage,
      newStage,
      levelIncreased: newLevel > previousLevel,
      stageChanged,
      consecutiveCorrect,
    }
  },

  startSession: () =>
    set((state) => ({
      ...state,
      questionHistory: [],
      fadingHistory: [],
      currentQuestion: null,
      currentQuestionIndex: 0,
      currentSkillType: null,
      sessionStartTime: Date.now(),
    })),

  resetSession: () => {
    const skillStates = defaultSkillStates()
    set({
      ...initialState,
      skillStates,
      bktState: bktStateFromSkillStates(skillStates),
    })
  },
}))

export { SKILL_TYPES }
