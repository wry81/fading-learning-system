import { useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { useLearningStore } from '../store/learningStore'
import type { AnswerRecord } from '../types'
import { persistCurrentSession } from '../utils/sessionPersistence'

const REFLECTION_PROMPT =
  '用你自己的话，给旁边的同学讲讲这道题是怎么做的？'

const OWNERSHIP_OPTIONS = [
  '几乎不是我自己完成的',
  '少部分是我自己完成的',
  '大约一半是我自己完成的',
  '大部分是我自己完成的',
  '基本都是我自己完成的',
] as const

const DIFFICULTY_OPTIONS = [
  '非常简单',
  '比较简单',
  '一般',
  '比较难',
  '非常难',
] as const

type Rating = 1 | 2 | 3 | 4 | 5

type ReflectionRouteState = {
  questionContent?: string
  isCorrect?: boolean
  correctAnswer?: string
  subject?: string
  answerRecord?: AnswerRecord
}

function RatingQuestion({
  prompt,
  options,
  value,
  onChange,
}: {
  prompt: string
  options: readonly string[]
  value: Rating | null
  onChange: (value: Rating) => void
}) {
  return (
    <section className="app-card p-5">
      <div className="mb-4 text-l3 font-semibold leading-relaxed text-[#3D2E7C]">
        {prompt}
      </div>
      <div className="grid gap-2 sm:grid-cols-5">
        {options.map((label, index) => {
          const rating = (index + 1) as Rating
          const selected = value === rating
          return (
            <button
              key={rating}
              type="button"
              aria-pressed={selected}
              className={[
                'min-h-[76px] rounded-2xl border-2 px-3 py-3 text-left text-l4 transition',
                selected
                  ? 'border-[#6353AC] bg-[#9F9DF3]/35 text-[#3D2E7C] shadow-sm'
                  : 'border-[#C8C9E8] bg-white text-[#6353AC] hover:border-[#9F9DF3]',
              ].join(' ')}
              onClick={() => onChange(rating)}
            >
              <span className="mb-1 block text-l2 font-bold">{rating}</span>
              <span className="leading-snug">{label}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

export default function Reflection() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = (location.state as ReflectionRouteState | null) ?? null
  const pendingAnswerRecord = useLearningStore((s) => s.pendingAnswerRecord)
  const addAnswerRecord = useLearningStore((s) => s.addAnswerRecord)
  const setPendingAnswerRecord = useLearningStore((s) => s.setPendingAnswerRecord)
  const answerRecord = state?.answerRecord ?? pendingAnswerRecord

  const [reflection, setReflection] = useState('')
  const [reflectionSkipped, setReflectionSkipped] = useState(false)
  const [ownership, setOwnership] = useState<Rating | null>(null)
  const [difficulty, setDifficulty] = useState<Rating | null>(null)
  const submittedRef = useRef(false)

  const questionContent =
    state?.questionContent ??
    answerRecord?.questionContent ??
    '未获取到题目信息，请返回学习页面重新作答。'
  const isCorrect = state?.isCorrect ?? answerRecord?.isCorrect ?? false
  const correctAnswer =
    state?.correctAnswer ?? answerRecord?.correctAnswers.join('、') ?? '未知'
  const subject = state?.subject ?? answerRecord?.subject

  const canSubmit =
    answerRecord != null &&
    ownership != null &&
    difficulty != null &&
    (reflectionSkipped || reflection.trim().length >= 10)

  const submitPostProblem = () => {
    if (!canSubmit || submittedRef.current || !answerRecord) return
    submittedRef.current = true
    const reflectionSubmittedAt = Date.now()
    addAnswerRecord({
      ...answerRecord,
      reflectionText: reflectionSkipped ? '' : reflection.trim(),
      reflectionSkipped,
      reflectionSubmittedAt,
      perceivedOwnership: ownership,
      perceivedDifficulty: difficulty,
    })
    setPendingAnswerRecord(null)
    persistCurrentSession()
    navigate('/feedback', {
      state: { questionContent, isCorrect, correctAnswer },
    })
  }

  return (
    <div className="app-page py-4">
      <div className="app-container space-y-6">
        <header className="space-y-1">
          <h1 className="text-l1 text-[#3D2E7C]">反思一下</h1>
          <p className="text-l4 text-[#6353AC]">回答以下问题，帮助你巩固刚才的学习</p>
        </header>

        <section className="app-card p-5">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#D5D6F2] px-3 py-1 text-l3 font-medium text-[#3D2E7C]">
              {subject ?? '刚才的题目'}
            </span>
            <span className={[
              'rounded-full px-3 py-1 text-l3 font-semibold',
              isCorrect ? 'bg-[#C9EBCA] text-[#2D5E30]' : 'bg-[#FF9BB3]/50 text-[#8B2040]',
            ].join(' ')}>
              {isCorrect ? '回答正确 ✅' : '回答错误'}
            </span>
          </div>
          <div className="space-y-4 text-l3 leading-relaxed text-[#3D2E7C]">
            <div>
              <div className="mb-1 text-l4 font-medium text-[#6353AC]">原题</div>
              <div className="text-question">{questionContent}</div>
            </div>
            <div>
              <div className="mb-1 text-l4 font-medium text-[#6353AC]">正确答案</div>
              <div className="font-semibold">{correctAnswer}</div>
            </div>
          </div>
        </section>

        <section className="app-card p-5">
          <div className="mb-3 text-l3 font-semibold leading-relaxed text-[#3D2E7C]">
            {REFLECTION_PROMPT}
          </div>
          <textarea
            className="min-h-[96px] w-full resize-y rounded-2xl border border-[#9F9DF3] px-3 py-2 text-l3 text-[#3D2E7C] outline-none transition placeholder:text-[#6353AC] focus:border-[#6353AC] focus:ring-2 focus:ring-[#9F9DF3]/30 disabled:bg-[#F3F2FA]"
            rows={3}
            placeholder="就像在给同学解释一样，说说你的解题步骤..."
            value={reflection}
            disabled={reflectionSkipped}
            onChange={(event) => {
              setReflection(event.target.value)
              setReflectionSkipped(false)
            }}
          />
          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="text-l4 text-[#6353AC]">
              {reflectionSkipped ? '已选择跳过反思' : '可以使用语音输入哦'}
            </div>
            <button
              type="button"
              className="app-btn-outline px-4 py-2"
              onClick={() => {
                setReflection('')
                setReflectionSkipped((value) => !value)
              }}
            >
              {reflectionSkipped ? '返回填写' : '跳过反思'}
            </button>
          </div>
        </section>

        <RatingQuestion
          prompt="你觉得刚才这道题有多大程度是你自己想出来并完成的？"
          options={OWNERSHIP_OPTIONS}
          value={ownership}
          onChange={setOwnership}
        />
        <RatingQuestion
          prompt="你觉得刚才这道题有多难？"
          options={DIFFICULTY_OPTIONS}
          value={difficulty}
          onChange={setDifficulty}
        />

        <div className="flex justify-end">
          <button
            type="button"
            className="app-btn-primary px-6 py-3 disabled:opacity-50"
            disabled={!canSubmit}
            onClick={submitPostProblem}
          >
            提交并继续
          </button>
        </div>
      </div>
    </div>
  )
}
