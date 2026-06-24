import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import FadingIndicator from '../components/FadingIndicator'
import LevelUpAnimation from '../components/LevelUpAnimation'
import StepScaffold from '../components/StepScaffold'
import { questions } from '../data/questions'
import { useLearningStore } from '../store/learningStore'
import type { FadingStage, SkillType, StudyCondition } from '../types'

const SKILL_TYPE_HEADER: Record<SkillType, string> = {
  求时间: '求相遇时间',
  求路程: '求总路程',
}

export default function Learning() {
  const navigate = useNavigate()
  const condition =
    useLearningStore((s) => s.condition) ?? ('fading' as StudyCondition)
  const currentQuestionIndex = useLearningStore((s) => s.currentQuestionIndex)
  const currentSkillType = useLearningStore((s) => s.currentSkillType)
  const updateBKTAfterAnswer = useLearningStore((s) => s.updateBKTAfterAnswer)
  const loadActiveSkill = useLearningStore((s) => s.loadActiveSkill)

  const filteredQuestions = useMemo(
    () =>
      currentSkillType
        ? questions.filter((q) => q.skillType === currentSkillType)
        : [],
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
    return `${currentQuestion.correctAnswer}${currentQuestion.answerUnit}`
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
    correct: boolean
    correctAnswer: string
  } | null>(null)

  if (!currentSkillType || !currentQuestion) {
    return null
  }

  const skillHeader = SKILL_TYPE_HEADER[currentSkillType]

  const dismissLevelUp = () => {
    setShowLevelUp(false)
    if (pendingNav) {
      navigate('/reflection', {
        state: {
          questionContent: currentQuestion.content,
          isCorrect: pendingNav.correct,
          correctAnswer: pendingNav.correctAnswer,
          subject: currentQuestion.subject,
          skillType: currentQuestion.skillType,
        },
      })
      setPendingNav(null)
    }
  }

  const handleSubmit = (answer: number) => {
    if (submitted) return
    const correct = answer === currentQuestion.correctAnswer
    setSubmitted(true)
    setIsCorrect(correct)

    const bktResult = updateBKTAfterAnswer(currentQuestion.skillType, correct)

    if (condition === 'fading' && bktResult.levelIncreased) {
      setLevelUpData({
        previousLevel: bktResult.previousLevel,
        newLevel: bktResult.newLevel,
        previousStage: bktResult.previousStage,
        newStage: bktResult.newStage,
      })
      setPendingNav({ correct, correctAnswer: correctAnswerText })
      setShowLevelUp(true)
      return
    }

    navigate('/reflection', {
      state: {
        questionContent: currentQuestion.content,
        isCorrect: correct,
        correctAnswer: correctAnswerText,
        subject: currentQuestion.subject,
        skillType: currentQuestion.skillType,
      },
    })
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
