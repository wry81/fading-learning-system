import { useCallback, useEffect, useMemo, useState } from 'react'

import type { QuestionData } from '../data/questions'
import { useLearningStore } from '../store/learningStore'
import { alignStudentToExpected, checkHintInputs } from '../utils/hintCheck'
import {
  EMPTY_CHECK_HINT,
  generateStep1Hint,
  generateStep1InitialFullSupport,
  generateStep2Hint,
  generateStep2InitialHint,
  generateStep3Hint,
} from '../utils/aiHints'
import {
  getStep2ExpectedValues,
  getStep2FormulaRows,
  initEmptyStep2Slots,
  STEP2_REMINDER,
} from '../utils/step2Formula'
import type { FadingStage, StudyCondition } from '../types'

export type StepScaffoldProps = {
  question: QuestionData
  condition: StudyCondition
  onSubmit: (answer: number) => void
}

type HintCardMeta = {
  accentClass: string
  title: string
  containerClass: string
}

function firstSentenceZh(text: string): string {
  const t = text.trim()
  if (!t) return ''
  const m = t.match(/^[^。！？\n]+[。！？]?/)
  if (m) return m[0].trim()
  return t.length > 40 ? `${t.slice(0, 40)}…` : t
}

function hintMetaFor(_condition: StudyCondition, _stage: FadingStage): HintCardMeta {
  return {
    title: 'Step AI 提示',
    accentClass: 'border-l-[3px] border-l-[#9F9DF3]',
    containerClass: 'bg-[#D5D6F2]',
  }
}

function ThinkingDots() {
  return (
    <span className="ml-1 inline-flex gap-0.5" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="inline-block h-1 w-1 rounded-full bg-[#9F9DF3] motion-safe:animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  )
}

const step1InputClass =
  'h-8 min-w-[60px] w-[60px] shrink-0 border-0 border-b-2 border-[#9F9DF3] bg-transparent px-0.5 text-center text-l3 text-[#2D2D2D] outline-none focus:border-[#6353AC] focus:ring-0'

const step2InputClass =
  'h-8 w-[80px] shrink-0 border-0 border-b-2 border-[#9F9DF3] bg-transparent px-0.5 text-center text-l3 text-[#2D2D2D] outline-none focus:border-[#6353AC] focus:ring-0'

type FillableHintRowsProps = {
  lines: string[]
  values: string[][]
  onSlotChange: (lineIndex: number, slotIndex: number, value: string) => void
}

function FillableHintRows({ lines, values, onSlotChange }: FillableHintRowsProps) {
  return (
    <div className="mt-3 space-y-3">
      {lines.map((line, lineIndex) => {
        const parts = line.split('___')
        const rowValues = values[lineIndex] ?? []
        return (
          <div
            key={lineIndex}
            className="flex min-h-[1.75rem] flex-wrap items-center gap-x-1 gap-y-1 text-l3 leading-relaxed text-[#2D2D2D]"
          >
            {parts.map((part, i) => (
              <span key={i} className="inline-flex items-center gap-1">
                <span className="whitespace-pre-wrap">{part}</span>
                {i < parts.length - 1 ? (
                  <input
                    type="text"
                    inputMode="decimal"
                    className={step1InputClass}
                    placeholder=""
                    value={rowValues[i] ?? ''}
                    onChange={(e) => onSlotChange(lineIndex, i, e.target.value)}
                    aria-label={`第 ${lineIndex + 1} 行填空 ${i + 1}`}
                  />
                ) : null}
              </span>
            ))}
          </div>
        )
      })}
    </div>
  )
}

function Step2FormulaRow({
  leftLabel,
  operator,
  values,
  onChange,
}: {
  leftLabel: string
  operator: string
  values: string[]
  onChange: (slotIndex: number, value: string) => void
}) {
  return (
    <div className="flex min-h-[1.75rem] flex-wrap items-center gap-x-1.5 gap-y-2 text-l3 text-[#2D2D2D]">
      <span>{leftLabel}</span>
      <span>=</span>
      <span>（</span>
      <input
        type="text"
        className={step2InputClass}
        placeholder=""
        value={values[0] ?? ''}
        onChange={(e) => onChange(0, e.target.value)}
        aria-label={`${leftLabel}第一个量`}
      />
      <span>）</span>
      <span>{operator}</span>
      <span>（</span>
      <input
        type="text"
        className={step2InputClass}
        placeholder=""
        value={values[1] ?? ''}
        onChange={(e) => onChange(1, e.target.value)}
        aria-label={`${leftLabel}第二个量`}
      />
      <span>）</span>
    </div>
  )
}

function Step2FrameworkPanel({
  question,
  values,
  onSlotChange,
}: {
  question: QuestionData
  values: string[][]
  onSlotChange: (lineIndex: number, slotIndex: number, value: string) => void
}) {
  const rows = getStep2FormulaRows(question)

  return (
    <div className="mt-3 space-y-3">
      {rows.map((row, lineIndex) => (
        <Step2FormulaRow
          key={row.leftLabel}
          leftLabel={row.leftLabel}
          operator={row.operator}
          values={values[lineIndex] ?? ['', '']}
          onChange={(slotIndex, value) => onSlotChange(lineIndex, slotIndex, value)}
        />
      ))}
      <p className="text-l4 text-[#6353AC]/70">{STEP2_REMINDER}</p>
    </div>
  )
}

function AiHintPanel({
  meta,
  isLoading,
  displayText,
}: {
  meta: HintCardMeta
  isLoading: boolean
  displayText: string
}) {
  return (
    <div
      className={[
        'mt-4 min-h-[3.5rem] rounded-2xl border border-[#C8C9E8] p-4',
        meta.accentClass,
        meta.containerClass,
      ].join(' ')}
    >
      <div className="text-l2 text-[#2D2D2D]">{meta.title}</div>
      {isLoading ? (
        <div className="mt-3 flex items-center text-l3 text-[#9F9DF3]">
          <span>AI思考中...</span>
          <ThinkingDots />
        </div>
      ) : displayText ? (
        <div className="mt-3 whitespace-pre-wrap text-l3 text-[#2D2D2D]">{displayText}</div>
      ) : (
        <div className="mt-3 text-l4 text-[#6353AC]"> </div>
      )}
    </div>
  )
}

function blankSlotCount(line: string): number {
  return (line.match(/___/g) ?? []).length
}

function initSlotRows(lines: string[]): string[][] {
  return lines.map((line) => Array(blankSlotCount(line)).fill(''))
}

function emptyInputs(len: number): string[] {
  return Array(len).fill('')
}

function falseFlags(len: number): boolean[] {
  return Array(len).fill(false)
}

/** 进页初次提示：按 fading 深度调用对应 system prompt */
async function fetchInitialStep1Hint(
  question: QuestionData,
  fadingStage: FadingStage,
  condition: StudyCondition,
): Promise<string> {
  if (condition === 'fading' && fadingStage === 'full_support') {
    return generateStep1InitialFullSupport(question)
  }

  const n = question.expectedStep1Values.length
  if (condition === 'fading' && fadingStage === 'minimal') {
    return generateStep1Hint(question, 'minimal', emptyInputs(n), falseFlags(n), condition)
  }

  const stage: FadingStage = condition === 'fixed' ? 'full_support' : fadingStage
  const placeholders = Array.from({ length: n }, () => '（尚未填写）')
  return generateStep1Hint(question, stage, placeholders, falseFlags(n), condition)
}

async function fetchInitialStep2Hint(
  question: QuestionData,
  fadingStage: FadingStage,
  condition: StudyCondition,
): Promise<string> {
  return generateStep2InitialHint(question, fadingStage, condition)
}

export default function StepScaffold({ question, condition, onSubmit }: StepScaffoldProps) {
  const fadingStage = useLearningStore((s) => s.fadingStage)

  const [numericAnswer, setNumericAnswer] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const [step1SlotValues, setStep1SlotValues] = useState<string[][]>(() =>
    initSlotRows(question.step1Hints),
  )
  const [step2SlotValues, setStep2SlotValues] = useState<string[][]>(() =>
    initEmptyStep2Slots(question),
  )

  const [step1Hint, setStep1Hint] = useState('')
  const [step2Hint, setStep2Hint] = useState('')
  const [step3Hint, setStep3Hint] = useState('')
  const [isLoadingStep1, setIsLoadingStep1] = useState(false)
  const [isLoadingStep2, setIsLoadingStep2] = useState(false)
  const [isLoadingStep3, setIsLoadingStep3] = useState(false)

  const [step1CheckCount, setStep1CheckCount] = useState(0)
  const [step2CheckCount, setStep2CheckCount] = useState(0)

  const canUseAi = condition !== 'no_ai'
  const fadingNone = condition === 'fading' && fadingStage === 'none'
  const showAi = canUseAi && !fadingNone

  const step2ExpectedValues = useMemo(() => getStep2ExpectedValues(question), [question])

  const showStep2Ai = canUseAi && !(condition === 'fading' && fadingStage === 'none')

  const stageForMeta: FadingStage = condition === 'fading' ? fadingStage : 'partial'
  const meta = hintMetaFor(condition, stageForMeta)

  useEffect(() => {
    if (!showAi) return

    let cancelled = false
    setIsLoadingStep1(true)
    setIsLoadingStep2(true)
    setIsLoadingStep3(true)
    setStep1Hint('')
    setStep2Hint('')
    setStep3Hint('')

    void (async () => {
      try {
        const [h1, h2, h3] = await Promise.all([
          fetchInitialStep1Hint(question, fadingStage, condition),
          fetchInitialStep2Hint(question, fadingStage, condition),
          generateStep3Hint(question, fadingStage, condition),
        ])
        if (cancelled) return
        setStep1Hint(h1)
        setStep2Hint(h2)
        setStep3Hint(h3)
      } finally {
        if (!cancelled) {
          setIsLoadingStep1(false)
          setIsLoadingStep2(false)
          setIsLoadingStep3(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [question.id, showAi, fadingStage, condition])

  const runCheckStep1 = useCallback(async () => {
    setIsLoadingStep1(true)
    try {
      const flat = alignStudentToExpected(
        step1SlotValues.flatMap((row) => [...row]),
        question.expectedStep1Values.length,
      )
      if (flat.every((s) => !String(s).trim())) {
        setStep1Hint(EMPTY_CHECK_HINT)
        return
      }
      const flags = checkHintInputs(flat, question.expectedStep1Values)
      const text = await generateStep1Hint(question, fadingStage, flat, flags, condition)
      setStep1Hint(text)
    } finally {
      setStep1CheckCount((c) => c + 1)
      setIsLoadingStep1(false)
    }
  }, [condition, fadingStage, question, step1SlotValues])

  const runCheckStep2 = useCallback(async () => {
    setIsLoadingStep2(true)
    try {
      const flat = alignStudentToExpected(
        step2SlotValues.flatMap((row) => [...row]),
        step2ExpectedValues.length,
      )
      if (flat.every((s) => !String(s).trim())) {
        setStep2Hint(EMPTY_CHECK_HINT)
        return
      }
      const flags = checkHintInputs(flat, step2ExpectedValues)
      const text = await generateStep2Hint(question, fadingStage, flat, flags, condition)
      setStep2Hint(text)
    } finally {
      setStep2CheckCount((c) => c + 1)
      setIsLoadingStep2(false)
    }
  }, [condition, fadingStage, question, step2ExpectedValues, step2SlotValues])

  useEffect(() => {
    setNumericAnswer('')
    setSubmitted(false)
    setStep1Hint('')
    setStep2Hint('')
    setStep3Hint('')
    setIsLoadingStep1(false)
    setIsLoadingStep2(false)
    setIsLoadingStep3(false)
    setStep1CheckCount(0)
    setStep2CheckCount(0)
    setStep1SlotValues(initSlotRows(question.step1Hints))
    setStep2SlotValues(initEmptyStep2Slots(question))
  }, [question.id])

  const displayStep1Hint = useMemo(() => {
    if (condition === 'fading' && fadingStage === 'minimal' && step1Hint) {
      return firstSentenceZh(step1Hint)
    }
    return step1Hint
  }, [condition, fadingStage, step1Hint])

  const displayStep2Hint = useMemo(() => {
    if (condition === 'fading' && fadingStage === 'minimal' && step2Hint) {
      return firstSentenceZh(step2Hint)
    }
    return step2Hint
  }, [condition, fadingStage, step2Hint])

  const displayStep3Hint = useMemo(() => {
    if (condition === 'fading' && fadingStage === 'minimal' && step3Hint) {
      return firstSentenceZh(step3Hint)
    }
    return step3Hint
  }, [condition, fadingStage, step3Hint])

  const updateStep1Slot = (lineIndex: number, slotIndex: number, value: string) => {
    setStep1SlotValues((rows) =>
      rows.map((row, i) =>
        i === lineIndex ? row.map((cell, j) => (j === slotIndex ? value : cell)) : row,
      ),
    )
  }

  const updateStep2Slot = (lineIndex: number, slotIndex: number, value: string) => {
    setStep2SlotValues((rows) =>
      rows.map((row, i) =>
        i === lineIndex ? row.map((cell, j) => (j === slotIndex ? value : cell)) : row,
      ),
    )
  }

  const submit = () => {
    if (submitted) return
    const n = Number.parseFloat(numericAnswer.trim())
    if (!Number.isFinite(n)) return
    setSubmitted(true)
    onSubmit(n)
  }

  return (
    <div className="space-y-4">
      <div className="app-card p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="inline-flex rounded-full bg-[#FF9BB3]/30 px-3 py-1 text-l3 font-medium text-[#2D2D2D] border border-[#FF9BB3]/40 border-1">
              {question.subject}
            </div>
            <div className="text-question mt-3 text-[#2D2D2D]">{question.content}</div>
          </div>
        </div>

        {/* Step 1 */}
        <div className="rounded-2xl border border-[#C8C9E8] bg-white p-4">
          <div className="text-l2 text-[#2D2D2D]">Step 1 — 读题理解</div>
          <FillableHintRows
            lines={question.step1Hints}
            values={step1SlotValues}
            onSlotChange={updateStep1Slot}
          />

          {showAi ? (
            <AiHintPanel meta={meta} isLoading={isLoadingStep1} displayText={displayStep1Hint} />
          ) : null}

          {showAi ? (
            <div className="mt-3">
              <button
                type="button"
                className="rounded-2xl bg-[#FF9BB3]/30 px-4 py-2 text-l3 font-semibold text-[#2D2D2D]/60 hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50 border border-[#FF9BB3]/40 border-1"
                onClick={() => void runCheckStep1()}
                disabled={isLoadingStep1}
              >
                {step1CheckCount > 0 ? '重新检查' : '检查一下'}
              </button>
            </div>
          ) : null}
        </div>

        {/* Step 2 — 列框架：固定公式填空 */}
        <div className="mt-4 rounded-2xl border border-[#C8C9E8] bg-white p-4">
          <div className="text-l2 text-[#2D2D2D]">Step 2 — 列框架</div>
          <Step2FrameworkPanel
            question={question}
            values={step2SlotValues}
            onSlotChange={updateStep2Slot}
          />

          {showStep2Ai ? (
            <AiHintPanel meta={meta} isLoading={isLoadingStep2} displayText={displayStep2Hint} />
          ) : null}

          {showStep2Ai ? (
            <div className="mt-3">
              <button
                type="button"
                className="rounded-2xl bg-[#FF9BB3]/30 px-4 py-2 text-l3 font-semibold text-[#2D2D2D]/60 hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50 border border-[#FF9BB3]/40 border-1"
                onClick={() => void runCheckStep2()}
                disabled={isLoadingStep2}
              >
                {step2CheckCount > 0 ? '重新检查' : '检查一下'}
              </button>
            </div>
          ) : null}
        </div>

        {/* Step 3 — 草稿计算 */}
        <div className="mt-4 rounded-2xl border border-[#C8C9E8] bg-white p-4">
          <div className="text-l2 text-[#2D2D2D]">Step 3 — 草稿计算</div>
          <div className="mt-3 rounded-2xl bg-[#FF9BB3]/30 px-4 py-3 text-l3 text-[#2D2D2D]/60 border border-[#FF9BB3]/40 border-1">
            请在草稿纸上完成计算
          </div>

          {showAi ? (
            <AiHintPanel meta={meta} isLoading={isLoadingStep3} displayText={displayStep3Hint} />
          ) : null}
        </div>

        {/* Step 4 — 填写答案 */}
        <div className="mt-4 rounded-2xl border border-[#C8C9E8] bg-white p-4">
          <div className="text-l2 text-[#2D2D2D]">Step 4 — 填写答案</div>
          <p className="mt-2 text-l3 leading-relaxed text-[#2D2D2D]">{question.answerLabel}</p>
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <label className="text-l3 text-[#2D2D2D]">
              <span className="sr-only">答案数值</span>
              <input
                type="number"
                inputMode="decimal"
                className="mt-1 w-36 rounded-2xl border border-[#9F9DF3] px-3 py-2 text-l3 text-[#2D2D2D] outline-none focus:border-[#6353AC] focus:ring-2 focus:ring-[#9F9DF3]/30"
                value={numericAnswer}
                onChange={(e) => setNumericAnswer(e.target.value)}
                disabled={submitted}
                placeholder="填写数字"
              />
            </label>
            <span className="pb-2 text-l4 font-medium text-[#6353AC]">{question.answerUnit}</span>
          </div>

          <div className="mt-4 flex items-center justify-end">
            <button
              type="button"
              className="app-btn-primary rounded-2xl px-5 py-2.5 disabled:opacity-50"
              disabled={submitted || !numericAnswer.trim()}
              onClick={submit}
            >
              提交答案
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
