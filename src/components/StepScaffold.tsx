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

export type FixedTutorialHints = {
  step1: string
  step2: string
  step3?: string
}

export type StepSubmitMeta = {
  step1Escalations: number
  step2Escalations: number
  step3Escalations: number
}

export type StepScaffoldProps = {
  question: QuestionData
  condition: StudyCondition
  onSubmit: (answer: number, meta: StepSubmitMeta) => void
  forcedFadingStage?: FadingStage
  fixedHints?: FixedTutorialHints
}

type HintCardMeta = {
  accentClass: string
  title: string
  containerClass: string
}

function escalateStage(current: FadingStage): FadingStage | null {
  if (current === 'none') return 'minimal'
  if (current === 'minimal') return 'partial'
  if (current === 'partial') return 'full_support'
  if (current === 'full_support') return null
  return null
}

function effectiveStage(
  base: FadingStage,
  escalated: FadingStage | null,
): FadingStage {
  return escalated ?? base
}

function escalationBadgeStage(
  escalated: FadingStage | null,
): 'partial' | 'full_support' | null {
  if (escalated === 'partial') return 'partial'
  if (escalated === 'full_support') return 'full_support'
  return null
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
  'h-8 w-[70px] min-w-[70px] shrink-0 border-0 border-b-2 border-[#9F9DF3] bg-transparent px-0.5 text-center text-l3 text-[#2D2D2D] outline-none focus:border-[#6353AC] focus:ring-0'

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
        inputMode="decimal"
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
        inputMode="decimal"
        className={step2InputClass}
        placeholder=""
        value={values[1] ?? ''}
        onChange={(e) => onChange(1, e.target.value)}
        aria-label={`${leftLabel}第二个量`}
      />
      <span>）</span>
      <span>=</span>
      <span>（</span>
      <input
        type="text"
        inputMode="decimal"
        className={step2InputClass}
        placeholder=""
        value={values[2] ?? ''}
        onChange={(e) => onChange(2, e.target.value)}
        aria-label={`${leftLabel}结果`}
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
          values={values[lineIndex] ?? ['', '', '']}
          onChange={(slotIndex, value) => onSlotChange(lineIndex, slotIndex, value)}
        />
      ))}
      <p className="text-l4 text-[#6353AC]/70">{STEP2_REMINDER}</p>
    </div>
  )
}

function EscalationBadge({ stage }: { stage: 'partial' | 'full_support' }) {
  if (stage === 'partial') {
    return (
      <span className="mb-2 inline-flex rounded-full bg-[#C9EBCA] px-2.5 py-0.5 text-xs font-medium text-[#2D5E30]">
        部分辅助
      </span>
    )
  }
  return (
    <span className="mb-2 inline-flex rounded-full bg-[#9F9DF3] px-2.5 py-0.5 text-xs font-medium text-white">
      全力辅助
    </span>
  )
}

function MoreHintButton({
  onClick,
  disabled,
}: {
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      className="rounded-[20px] border border-[#9F9DF3] bg-transparent px-3 py-1 text-xs text-[#9F9DF3] hover:bg-[#9F9DF3]/10 disabled:cursor-not-allowed disabled:opacity-50"
      onClick={onClick}
      disabled={disabled}
    >
      我需要更多提示 ↑
    </button>
  )
}

const checkHintButtonClass =
  'rounded-2xl bg-[#FF9BB3]/30 px-4 py-2 text-l3 font-semibold text-[#2D2D2D]/60 hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50 border border-[#FF9BB3]/40 border-1'

function HintActionRow({
  showEscalation,
  onEscalate,
  escalateDisabled,
  showCheck,
  onCheck,
  checkDisabled,
  checkLabel,
}: {
  showEscalation: boolean
  onEscalate: () => void
  escalateDisabled?: boolean
  showCheck?: boolean
  onCheck?: () => void
  checkDisabled?: boolean
  checkLabel?: string
}) {
  if (!showEscalation && !showCheck) return null

  return (
    <div className="mt-3 flex items-center gap-3">
      {showEscalation ? (
        <MoreHintButton onClick={onEscalate} disabled={escalateDisabled} />
      ) : null}
      {showCheck ? (
        <button
          type="button"
          className={[checkHintButtonClass, 'ml-auto'].join(' ')}
          onClick={onCheck}
          disabled={checkDisabled}
        >
          {checkLabel}
        </button>
      ) : null}
    </div>
  )
}

function AiHintPanel({
  meta,
  isLoading,
  displayText,
  badge,
}: {
  meta: HintCardMeta
  isLoading: boolean
  displayText: string
  badge?: 'partial' | 'full_support' | null
}) {
  return (
    <div className="mt-4">
      {badge ? <EscalationBadge stage={badge} /> : null}
      <div
        className={[
          'min-h-[3.5rem] rounded-2xl border border-[#C8C9E8] p-4',
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

export default function StepScaffold({
  question,
  condition,
  onSubmit,
  forcedFadingStage,
  fixedHints,
}: StepScaffoldProps) {
  const storeFadingStage = useLearningStore((s) => s.fadingStage)
  const fadingStage = forcedFadingStage ?? storeFadingStage

  const [numericAnswer, setNumericAnswer] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const [step1SlotValues, setStep1SlotValues] = useState<string[][]>(() =>
    initSlotRows(question.step1Hints),
  )
  const [step2SlotValues, setStep2SlotValues] = useState<string[][]>(() =>
    initEmptyStep2Slots(question),
  )

  const [step1Hint, setStep1Hint] = useState(fixedHints?.step1 ?? '')
  const [step2Hint, setStep2Hint] = useState(fixedHints?.step2 ?? '')
  const [step3Hint, setStep3Hint] = useState(fixedHints?.step3 ?? '')
  const [isLoadingStep1, setIsLoadingStep1] = useState(false)
  const [isLoadingStep2, setIsLoadingStep2] = useState(false)
  const [isLoadingStep3, setIsLoadingStep3] = useState(false)

  const [step1CheckCount, setStep1CheckCount] = useState(0)
  const [step2CheckCount, setStep2CheckCount] = useState(0)

  const [step1EscalatedStage, setStep1EscalatedStage] = useState<FadingStage | null>(null)
  const [step2EscalatedStage, setStep2EscalatedStage] = useState<FadingStage | null>(null)
  const [step3EscalatedStage, setStep3EscalatedStage] = useState<FadingStage | null>(null)
  const [step1Escalations, setStep1Escalations] = useState(0)
  const [step2Escalations, setStep2Escalations] = useState(0)
  const [step3Escalations, setStep3Escalations] = useState(0)

  const canUseAi = condition !== 'no_ai'
  const canEscalateHints = condition === 'fading' && !fixedHints
  const showHintSection = canUseAi

  const step1EffectiveStage = effectiveStage(fadingStage, step1EscalatedStage)
  const step2EffectiveStage = effectiveStage(fadingStage, step2EscalatedStage)
  const step3EffectiveStage = effectiveStage(fadingStage, step3EscalatedStage)

  const shouldLoadInitialHints =
    !fixedHints && showHintSection && (condition !== 'fading' || fadingStage !== 'none')

  const step2ExpectedValues = useMemo(() => getStep2ExpectedValues(question), [question])

  const stageForMeta: FadingStage = condition === 'fading' ? fadingStage : 'partial'
  const meta = hintMetaFor(condition, stageForMeta)

  useEffect(() => {
    if (fixedHints) return
    if (!shouldLoadInitialHints) return

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
  }, [question.id, shouldLoadInitialHints, fadingStage, condition, fixedHints, question])

  const regenerateStep1Hint = useCallback(
    async (stage: FadingStage) => {
      if (fixedHints) {
        setStep1Hint(fixedHints.step1)
        return
      }
      setIsLoadingStep1(true)
      try {
        const flat = alignStudentToExpected(
          step1SlotValues.flatMap((row) => [...row]),
          question.expectedStep1Values.length,
        )
        const hasInput = flat.some((s) => String(s).trim())
        if (hasInput) {
          const flags = checkHintInputs(flat, question.expectedStep1Values)
          const text = await generateStep1Hint(question, stage, flat, flags, condition)
          setStep1Hint(text)
        } else {
          const text = await fetchInitialStep1Hint(question, stage, condition)
          setStep1Hint(text)
        }
      } finally {
        setIsLoadingStep1(false)
      }
    },
    [condition, fixedHints, question, step1SlotValues],
  )

  const regenerateStep2Hint = useCallback(
    async (stage: FadingStage) => {
      if (fixedHints) {
        setStep2Hint(fixedHints.step2)
        return
      }
      setIsLoadingStep2(true)
      try {
        const flat = alignStudentToExpected(
          step2SlotValues.flatMap((row) => [...row]),
          step2ExpectedValues.length,
        )
        const hasInput = flat.some((s) => String(s).trim())
        if (hasInput) {
          const flags = checkHintInputs(flat, step2ExpectedValues)
          const text = await generateStep2Hint(question, stage, flat, flags, condition)
          setStep2Hint(text)
        } else {
          const text = await fetchInitialStep2Hint(question, stage, condition)
          setStep2Hint(text)
        }
      } finally {
        setIsLoadingStep2(false)
      }
    },
    [condition, fixedHints, question, step2ExpectedValues, step2SlotValues],
  )

  const regenerateStep3Hint = useCallback(
    async (stage: FadingStage) => {
      if (fixedHints) {
        setStep3Hint(fixedHints.step3 ?? '')
        return
      }
      setIsLoadingStep3(true)
      try {
        const text = await generateStep3Hint(question, stage, condition)
        setStep3Hint(text)
      } finally {
        setIsLoadingStep3(false)
      }
    },
    [condition, fixedHints, question],
  )

  const escalateStep1Hint = useCallback(async () => {
    const next = escalateStage(step1EffectiveStage)
    if (!next) return
    setStep1EscalatedStage(next)
    setStep1Escalations((c) => c + 1)
    await regenerateStep1Hint(next)
  }, [regenerateStep1Hint, step1EffectiveStage])

  const escalateStep2Hint = useCallback(async () => {
    const next = escalateStage(step2EffectiveStage)
    if (!next) return
    setStep2EscalatedStage(next)
    setStep2Escalations((c) => c + 1)
    await regenerateStep2Hint(next)
  }, [regenerateStep2Hint, step2EffectiveStage])

  const escalateStep3Hint = useCallback(async () => {
    const next = escalateStage(step3EffectiveStage)
    if (!next) return
    setStep3EscalatedStage(next)
    setStep3Escalations((c) => c + 1)
    await regenerateStep3Hint(next)
  }, [regenerateStep3Hint, step3EffectiveStage])

  const runCheckStep1 = useCallback(async () => {
    setIsLoadingStep1(true)
    try {
      if (fixedHints) {
        setStep1Hint(fixedHints.step1)
        return
      }
      const flat = alignStudentToExpected(
        step1SlotValues.flatMap((row) => [...row]),
        question.expectedStep1Values.length,
      )
      if (flat.every((s) => !String(s).trim())) {
        setStep1Hint(EMPTY_CHECK_HINT)
        return
      }
      const flags = checkHintInputs(flat, question.expectedStep1Values)
      const text = await generateStep1Hint(
        question,
        step1EffectiveStage,
        flat,
        flags,
        condition,
      )
      setStep1Hint(text)
    } finally {
      setStep1CheckCount((c) => c + 1)
      setIsLoadingStep1(false)
    }
  }, [condition, step1EffectiveStage, question, step1SlotValues, fixedHints])

  const runCheckStep2 = useCallback(async () => {
    setIsLoadingStep2(true)
    try {
      if (fixedHints) {
        setStep2Hint(fixedHints.step2)
        return
      }
      const flat = alignStudentToExpected(
        step2SlotValues.flatMap((row) => [...row]),
        step2ExpectedValues.length,
      )
      if (flat.every((s) => !String(s).trim())) {
        setStep2Hint(EMPTY_CHECK_HINT)
        return
      }
      const flags = checkHintInputs(flat, step2ExpectedValues)
      const text = await generateStep2Hint(
        question,
        step2EffectiveStage,
        flat,
        flags,
        condition,
      )
      setStep2Hint(text)
    } finally {
      setStep2CheckCount((c) => c + 1)
      setIsLoadingStep2(false)
    }
  }, [condition, step2EffectiveStage, question, step2ExpectedValues, step2SlotValues, fixedHints])

  useEffect(() => {
    setNumericAnswer('')
    setSubmitted(false)
    setStep1Hint(fixedHints?.step1 ?? '')
    setStep2Hint(fixedHints?.step2 ?? '')
    setStep3Hint(fixedHints?.step3 ?? '')
    setIsLoadingStep1(false)
    setIsLoadingStep2(false)
    setIsLoadingStep3(false)
    setStep1CheckCount(0)
    setStep2CheckCount(0)
    setStep1EscalatedStage(null)
    setStep2EscalatedStage(null)
    setStep3EscalatedStage(null)
    setStep1Escalations(0)
    setStep2Escalations(0)
    setStep3Escalations(0)
    setStep1SlotValues(initSlotRows(question.step1Hints))
    setStep2SlotValues(initEmptyStep2Slots(question))
  }, [question.id, fixedHints])

  const displayStep1Hint = useMemo(() => {
    if (condition === 'fading' && step1EffectiveStage === 'minimal' && step1Hint) {
      return firstSentenceZh(step1Hint)
    }
    return step1Hint
  }, [condition, step1EffectiveStage, step1Hint])

  const displayStep2Hint = useMemo(() => {
    if (condition === 'fading' && step2EffectiveStage === 'minimal' && step2Hint) {
      return firstSentenceZh(step2Hint)
    }
    return step2Hint
  }, [condition, step2EffectiveStage, step2Hint])

  const displayStep3Hint = useMemo(() => {
    if (condition === 'fading' && step3EffectiveStage === 'minimal' && step3Hint) {
      return firstSentenceZh(step3Hint)
    }
    return step3Hint
  }, [condition, step3EffectiveStage, step3Hint])

  const step1EscalationBadge = escalationBadgeStage(step1EscalatedStage)
  const step2EscalationBadge = escalationBadgeStage(step2EscalatedStage)
  const step3EscalationBadge = escalationBadgeStage(step3EscalatedStage)

  const showStep1EscalationButton =
    canEscalateHints && escalateStage(step1EffectiveStage) !== null
  const showStep2EscalationButton =
    canEscalateHints && escalateStage(step2EffectiveStage) !== null
  const showStep3EscalationButton =
    canEscalateHints && escalateStage(step3EffectiveStage) !== null

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
    onSubmit(n, {
      step1Escalations,
      step2Escalations,
      step3Escalations,
    })
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

          {showHintSection ? (
            <>
              <AiHintPanel
                meta={meta}
                isLoading={isLoadingStep1}
                displayText={displayStep1Hint}
                badge={step1EscalationBadge}
              />
              <HintActionRow
                showEscalation={showStep1EscalationButton}
                onEscalate={() => void escalateStep1Hint()}
                escalateDisabled={isLoadingStep1}
                showCheck
                onCheck={() => void runCheckStep1()}
                checkDisabled={isLoadingStep1}
                checkLabel={step1CheckCount > 0 ? '重新检查' : '检查一下'}
              />
            </>
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

          {showHintSection ? (
            <>
              <AiHintPanel
                meta={meta}
                isLoading={isLoadingStep2}
                displayText={displayStep2Hint}
                badge={step2EscalationBadge}
              />
              <HintActionRow
                showEscalation={showStep2EscalationButton}
                onEscalate={() => void escalateStep2Hint()}
                escalateDisabled={isLoadingStep2}
                showCheck
                onCheck={() => void runCheckStep2()}
                checkDisabled={isLoadingStep2}
                checkLabel={step2CheckCount > 0 ? '重新检查' : '检查一下'}
              />
            </>
          ) : null}
        </div>

        {/* Step 3 — 草稿计算 */}
        <div className="mt-4 rounded-2xl border border-[#C8C9E8] bg-white p-4">
          <div className="text-l2 text-[#2D2D2D]">Step 3 — 草稿计算</div>
          <div className="mt-3 rounded-2xl bg-[#FF9BB3]/30 px-4 py-3 text-l3 text-[#2D2D2D]/60 border border-[#FF9BB3]/40 border-1">
            请在草稿纸上完成计算
          </div>

          {showHintSection ? (
            <>
              <AiHintPanel
                meta={meta}
                isLoading={isLoadingStep3}
                displayText={displayStep3Hint}
                badge={step3EscalationBadge}
              />
              <HintActionRow
                showEscalation={showStep3EscalationButton}
                onEscalate={() => void escalateStep3Hint()}
                escalateDisabled={isLoadingStep3}
              />
            </>
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
