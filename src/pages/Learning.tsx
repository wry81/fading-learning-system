import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import FadingIndicator from '../components/FadingIndicator'
import LevelUpAnimation from '../components/LevelUpAnimation'
import StepScaffold, { type StepSubmitMeta } from '../components/StepScaffold'
import { experimentQuestions } from '../data/questions'
import { useLearningStore } from '../store/learningStore'
import type { AnswerRecord, FadingStage, SkillType, StudyCondition } from '../types'

const SKILL_TYPE_HEADER: Record<SkillType, string> = {
  倍数份数关系: '倍数份数关系',
}

export default function Learning() {
  const navigate = useNavigate()
  const condition =
    useLearningStore((s) => s.condition) ?? ('fading' as StudyCondition)
  const currentQuestionIndex = useLearningStore((s) => s.currentQuestionIndex)
  const currentSkillType = useLearningStore((s) => s.currentSkillType)
  const updateBKTAfterAnswer = useLearningStore((s) => s.updateBKTAfterAnswer)
  const loadActiveSkill = useLearningStore((s) => s.loadActiveSkill)
  const currentParticipantId = useLearningStore((s) => s.currentParticipantId)
  const sessionStartTime = useLearningStore((s) => s.sessionStartTime)
  const setPendingAnswerRecord = useLearningStore((s) => s.setPendingAnswerRecord)

  const filteredQuestions = useMemo(
    () => (currentSkillType ? experimentQuestions(currentSkillType) : []),
    [currentSkillType],
  )

  const currentQuestion = useMemo(() => {
    if (filteredQuestions.length === 0) return null
    const i = Math.min(
      Math.max(0, currentQuestionIndex),
      filteredQuestions.length - 1,
    )
    return filteredQuestions[i]!
  }, [currentQuestionIndex, filteredQuestions])

  useEffect(() => {
    if (!currentSkillType) {
      navigate('/home', { replace: true })
    }
  }, [currentSkillType, navigate])

  useEffect(() => {
    if (currentSkillType) {
      loadActiveSkill(currentSkillType)
    }
  }, [currentSkillType, loadActiveSkill])

  const correctAnswerText = useMemo(() => {
    if (!currentQuestion) return ''
    return currentQuestion.correctAnswers
      .map((answer, index) =>
        `${currentQuestion.answerLabels[index]}：${answer}${currentQuestion.answerUnits[index]}`,
      )
      .join('；')
  }, [currentQuestion])

  const [submitted, setSubmitted] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [showLevelUp, setShowLevelUp] = useState(false)
  const [levelUpData, setLevelUpData] = useState<{
    previousLevel: number
    newLevel: number
    previousStage: FadingStage
    newStage: FadingStage
  } | null>(null)
  const [pendingNav, setPendingNav] = useState<{
    reflectionState: {
      questionContent: string
      isCorrect: boolean
      correctAnswer: string
      subject: string
      skillType: SkillType
      questionId: string
      step1Escalations: number
      step2Escalations: number
      step3Escalations: number
      answerRecord: AnswerRecord
    }
  } | null>(null)

  if (!currentSkillType || !currentQuestion) {
    return null
  }

  const skillHeader = SKILL_TYPE_HEADER[currentSkillType]

  const dismissLevelUp = () => {
    setShowLevelUp(false)
    if (pendingNav) {
      navigate('/reflection', { state: pendingNav.reflectionState })
      setPendingNav(null)
    }
  }

  const handleSubmit = (answers: number[], meta: StepSubmitMeta) => {
    if (submitted) return
    const correct =
      answers.length === currentQuestion.correctAnswers.length &&
      answers.every((answer, index) => answer === currentQuestion.correctAnswers[index])
    setSubmitted(true)
    setIsCorrect(correct)

    const bktResult = updateBKTAfterAnswer(currentQuestion.skillType, correct)
    const submittedAt = Date.now()

    const answerRecord: AnswerRecord = {
      participantId: currentParticipantId ?? '',
      condition,
      sessionId: sessionStartTime ?? submittedAt,
      questionId: currentQuestion.id,
      questionOrder: currentQuestionIndex + 1,
      questionContent: currentQuestion.content,
      subject: currentQuestion.subject,
      skillType: currentQuestion.skillType,
      targetKnowledgeComponent: currentQuestion.skillType,
      questionSubtype: currentQuestion.subtype,
      userAnswers: answers,
      smallerQuantityAnswer: answers[0] ?? Number.NaN,
      largerQuantityAnswer: answers[1] ?? Number.NaN,
      correctAnswers: [...currentQuestion.correctAnswers],
      isCorrect: correct,
      timeSpent: meta.timing.totalProblemTime,
      timestamp: submittedAt,
      submittedAt,
      fadingStageAtTime: bktResult.previousStage,
      reflectionText: '',
      reflectionSkipped: false,
      reflectionSubmittedAt: null,
      perceivedOwnership: null,
      perceivedDifficulty: null,
      pLBefore: bktResult.pLBefore,
      pLAfter: bktResult.pLAfter,
      step1Escalations: meta.step1Escalations,
      step2Escalations: meta.step2Escalations,
      step3Escalations: meta.step3Escalations,
      steps: meta.steps,
      timing: meta.timing,
      bkt: {
        pLBefore: bktResult.pLBefore,
        pLAfter: bktResult.pLAfter,
        fadingStageBefore: bktResult.previousStage,
        fadingStageAfter: bktResult.newStage,
        consecutiveCorrectBefore: bktResult.consecutiveCorrectBefore,
        consecutiveCorrectAfter: bktResult.consecutiveCorrect,
        fadingTransitionOccurred: bktResult.stageChanged,
      },
    }
    setPendingAnswerRecord(answerRecord)

    const reflectionState = {
      questionContent: currentQuestion.content,
      isCorrect: correct,
      correctAnswer: correctAnswerText,
      subject: currentQuestion.subject,
      skillType: currentQuestion.skillType,
      questionId: currentQuestion.id,
      answerRecord,
      ...meta,
    }

    if (condition === 'fading' && bktResult.levelIncreased) {
      setLevelUpData({
        previousLevel: bktResult.previousLevel,
        newLevel: bktResult.newLevel,
        previousStage: bktResult.previousStage,
        newStage: bktResult.newStage,
      })
      setPendingNav({ reflectionState })
      setShowLevelUp(true)
      return
    }

    navigate('/reflection', { state: reflectionState })
  }

  return (
    <div className="app-page py-4">
      <div className="app-container space-y-4">
        {condition === 'fading' ? (
          <FadingIndicator skillKey={currentSkillType} />
        ) : null}

        <div className="text-l4 font-medium text-[#6353AC]">
          {skillHeader} — 第 {currentQuestionIndex + 1} 题 / 共{' '}
          {filteredQuestions.length} 题
        </div>

        <StepScaffold
          key={currentQuestion.id}
          question={currentQuestion}
          condition={condition}
          onSubmit={handleSubmit}
        />

        {submitted ? (
          <div
            className={[
              'rounded-2xl px-4 py-3 text-l3 font-semibold',
              isCorrect
                ? 'bg-[#C9EBCA] text-[#2D5E30]'
                : 'bg-[#FF9BB3]/40 text-[#8B2040]',
            ].join(' ')}
          >
            已提交：{isCorrect ? '正确 ✅' : '错误，再想想 💪'}
          </div>
        ) : null}

        {condition === 'fading' && levelUpData ? (
          <LevelUpAnimation
            show={showLevelUp}
            previousLevel={levelUpData.previousLevel}
            newLevel={levelUpData.newLevel}
            previousStage={levelUpData.previousStage}
            newStage={levelUpData.newStage}
            onDismiss={dismissLevelUp}
          />
        ) : null}
      </div>
    </div>
  )
}
