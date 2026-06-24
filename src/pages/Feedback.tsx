import { useLocation, useNavigate } from 'react-router-dom'

import FadingIndicator from '../components/FadingIndicator'
import { questions } from '../data/questions'
import { useLearningStore } from '../store/learningStore'
import type { FadingStage } from '../types'

type FeedbackRouteState = {
  questionContent?: string
  isCorrect?: boolean
  correctAnswer?: string
}

type StageMeta = {
  label: string
  badgeClass: string
}

const STAGE_META: Record<FadingStage, StageMeta> = {
  full_support: {
    label: 'AI 全力辅助',
    badgeClass: 'bg-[#FF9BB3]/40 text-[#3D2E7C]',
  },
  partial: {
    label: 'AI 部分辅助',
    badgeClass: 'bg-[#9F9DF3]/40 text-[#3D2E7C]',
  },
  minimal: {
    label: 'AI 少量辅助',
    badgeClass: 'bg-[#C9EBCA] text-[#2D5E30]',
  },
  none: {
    label: '自主作答',
    badgeClass: 'bg-[#6353AC] text-white',
  },
}

export default function Feedback() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = (location.state as FeedbackRouteState | null) ?? null
  const condition = useLearningStore((s) => s.condition)
  const fadingStage = useLearningStore((s) => s.fadingStage)
  const currentSkillType = useLearningStore((s) => s.currentSkillType)
  const markSkillCompleted = useLearningStore((s) => s.markSkillCompleted)
  const setCurrentQuestionIndex = useLearningStore((s) => s.setCurrentQuestionIndex)

  const currentQuestionIndex = useLearningStore((s) => s.currentQuestionIndex)

  const filteredQuestions = currentSkillType
    ? questions.filter((q) => q.skillType === currentSkillType)
    : questions

  const isCorrect = state?.isCorrect ?? false
  const correctAnswer = state?.correctAnswer ?? '未知'
  const questionContent =
    state?.questionContent ?? '未获取到题目信息，请返回学习页面重新开始。'

  const stage = STAGE_META[fadingStage]

  return (
    <div className="app-page py-4">
      <div className="app-container space-y-6">
      <header>
        <h1 className="text-l1 text-[#3D2E7C]">本题总结</h1>
      </header>

      <section className="app-card overflow-hidden p-0">
        <div
          className={[
            'h-2 w-full',
            isCorrect ? 'bg-[#C9EBCA]' : 'bg-[#FF9BB3]',
          ].join(' ')}
        />
        <div className="p-5">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span
              className={[
                'rounded-full px-3 py-1 text-l3 font-semibold',
                isCorrect
                  ? 'bg-[#C9EBCA] text-[#2D5E30]'
                  : 'bg-[#FF9BB3]/50 text-[#8B2040]',
              ].join(' ')}
            >
              {isCorrect ? '回答正确 ✅' : '回答错误 💪'}
            </span>
          </div>

          <div className="space-y-4 text-l3 leading-relaxed text-[#3D2E7C]">
            <div>
              <div className="mb-1 text-l4 font-medium text-[#6353AC]">题目回顾</div>
              <div className="text-question text-[#2D2D2D]">{questionContent}</div>
            </div>

            <div>
              <div className="mb-1 text-l4 font-medium text-[#6353AC]">正确答案</div>
              <div className="text-question text-[#2D2D2D]">{correctAnswer}</div>
            </div>

            <div>
              <div className="mb-1 text-l4 font-medium text-[#6353AC]">解析</div>
              <div>
                行程类问题请结合题意中的路程、速度与时间关系核对；可对照 AI
                提示中的分步思路，在草稿纸上重算一遍以巩固。
              </div>
            </div>
          </div>
        </div>
      </section>

      {condition === 'fading' ? (
        <section className="app-card p-5">
          <h2 className="text-l2 text-[#3D2E7C]">能力状态更新</h2>

          <div className="mt-4 space-y-4">
            <FadingIndicator skillKey={currentSkillType ?? undefined} />

            <div className="flex items-center gap-2">
              <span
                className={[
                  'inline-flex rounded-full px-3 py-1 text-l3 font-semibold',
                  stage.badgeClass,
                ].join(' ')}
              >
                {stage.label}
              </span>
            </div>

            <div
              className={[
                'rounded-2xl px-4 py-3 text-l3 font-medium',
                isCorrect
                  ? 'bg-[#C9EBCA] text-[#2D5E30]'
                  : 'bg-[#FF9BB3]/40 text-[#8B2040]',
              ].join(' ')}
            >
              {isCorrect ? '太棒了！继续加油 🌟' : '继续练习，你会进步的 💪'}
            </div>
          </div>
        </section>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="app-btn-primary px-5 py-2.5"
          onClick={() => {
            const next = currentQuestionIndex + 1
            if (next >= filteredQuestions.length) {
              if (currentSkillType) {
                markSkillCompleted(currentSkillType)
              }
              navigate('/completion')
              return
            }
            setCurrentQuestionIndex(next)
            navigate('/learning')
          }}
        >
          继续学习
        </button>
        <button
          type="button"
          className="app-btn-outline px-5 py-2.5"
          onClick={() => navigate('/home')}
        >
          返回主页
        </button>
      </div>
      </div>
    </div>
  )
}
