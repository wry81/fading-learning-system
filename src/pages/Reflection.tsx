import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

const REFLECTION_PROMPT =
  '用你自己的话，给旁边的同学讲讲这道题是怎么做的？'

type ReflectionRouteState = {
  questionContent?: string
  isCorrect?: boolean
  correctAnswer?: string
  subject?: string
}

export default function Reflection() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = (location.state as ReflectionRouteState | null) ?? null
  const [reflection, setReflection] = useState('')

  const questionContent =
    state?.questionContent ?? '未获取到题目信息，请返回学习页面重新作答。'
  const isCorrect = state?.isCorrect ?? false
  const correctAnswer = state?.correctAnswer ?? '未知'
  const subject = state?.subject

  const goFeedback = () =>
    navigate('/feedback', {
      state: {
        questionContent,
        isCorrect,
        correctAnswer,
      },
    })

  return (
    <div className="app-page py-4">
      <div className="app-container space-y-6">
        <header className="space-y-1">
          <h1 className="text-l1 text-[#3D2E7C]">反思一下</h1>
          <p className="text-l4 text-[#6353AC]">
            回答以下问题，帮助你巩固刚才的学习
          </p>
        </header>

        <section className="app-card p-5">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#D5D6F2] px-3 py-1 text-l3 font-medium text-[#3D2E7C]">
              {subject ?? '刚才的题目'}
            </span>
            <span
              className={[
                'rounded-full px-3 py-1 text-l3 font-semibold',
                isCorrect
                  ? 'bg-[#C9EBCA] text-[#2D5E30]'
                  : 'bg-[#FF9BB3]/50 text-[#8B2040]',
              ].join(' ')}
            >
              {isCorrect ? '回答正确 ✅' : '回答错误'}
            </span>
          </div>

          <div className="space-y-4 text-l3 leading-relaxed text-[#3D2E7C]">
            <div>
              <div className="mb-1 text-l4 font-medium text-[#6353AC]">原题</div>
              <div className="text-question text-[#3D2E7C]">{questionContent}</div>
            </div>

            <div>
              <div className="mb-1 text-l4 font-medium text-[#6353AC]">正确答案</div>
              <div className="font-semibold text-[#3D2E7C]">{correctAnswer}</div>
            </div>
          </div>
        </section>

        <section className="app-card p-5">
          <div className="mb-3 text-l3 font-semibold leading-relaxed text-[#3D2E7C]">
            {REFLECTION_PROMPT}
          </div>

          <textarea
            className="min-h-[96px] w-full resize-y rounded-2xl border border-[#9F9DF3] px-3 py-2 text-l3 text-[#3D2E7C] outline-none transition placeholder:text-[#6353AC] focus:border-[#6353AC] focus:ring-2 focus:ring-[#9F9DF3]/30"
            rows={3}
            placeholder="就像在给同学解释一样，说说你的解题步骤..."
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
          />

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="text-l4 text-[#6353AC]">可以使用语音输入哦</div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="app-btn-outline px-4 py-2"
                onClick={goFeedback}
              >
                跳过
              </button>
              <button
                type="button"
                className="app-btn-primary border border-2 border-[#9F9DF3] px-4 py-2 disabled:opacity-50"
                disabled={reflection.trim().length < 10}
                onClick={goFeedback}
              >
                提交反思
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
