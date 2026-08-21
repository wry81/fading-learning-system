import { useLearningStore } from '../store/learningStore'
import { useParticipantStore } from '../store/participantStore'
import type { Session } from '../types'

/** Save or update the active session under its participant record. */
export function persistCurrentSession(): Session | null {
  const state = useLearningStore.getState()
  if (!state.currentParticipantId || !state.sessionStartTime) return null

  const session: Session = {
    sessionId: state.sessionStartTime,
    date: new Date(state.sessionStartTime).toISOString(),
    answers: state.questionHistory,
    fadingHistory: state.fadingHistory,
    abilityLevelAtEnd: state.abilityLevel,
    fadingStageAtEnd: state.fadingStage,
    skillStatesAtEnd: state.skillStates,
    completedSkillsAtEnd: state.completedSkills,
  }

  useParticipantStore.getState().saveSession(state.currentParticipantId, session)
  return session
}
