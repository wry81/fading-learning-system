import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { QuestionData } from '../data/questions'
import { useLearningStore } from '../store/learningStore'
import { checkHintInputs } from '../utils/hintCheck'
import {
  EMPTY_CHECK_HINT,
  generateStep1Hint,
  generateStep1InitialFullSupport,
  generateStep2Hint,
  generateStep2InitialHint,
  generateStep3Hint,
} from '../utils/aiHints'
import { getExpectedPartCount, getPartRelationshipLabel } from '../utils/step2Formula'
import type {
  FadingStage,
  HintExposureRecord,
  ProblemTimingRecord,
  StepProcessRecord,
  StudyCondition,
  SupportEscalationRecord,
} from '../types'

export type FixedTutorialHints = { step1: string; step2: string; step3?: string }

export type StepSubmitMeta = {
  step1Escalations: number
  step2Escalations: number
  step3Escalations: number
  steps: {
    step1: StepProcessRecord
    step2: StepProcessRecord
    step3: StepProcessRecord
  }
  timing: ProblemTimingRecord
}

export type StepScaffoldProps = {
  question: QuestionData
  condition: StudyCondition
  onSubmit: (answers: number[], meta: StepSubmitMeta) => void
  forcedFadingStage?: FadingStage
  fixedHints?: FixedTutorialHints
}

const inputClass =
  'h-10 min-w-[90px] rounded-xl border border-[#9F9DF3] bg-white px-3 text-center text-l3 text-[#2D2D2D] outline-none focus:border-[#6353AC] focus:ring-2 focus:ring-[#9F9DF3]/30'

function escalateStage(stage: FadingStage): FadingStage | null {
  if (stage === 'none') return 'minimal'
  if (stage === 'minimal') return 'partial'
  if (stage === 'partial') return 'full_support'
  return null
}

function firstSentenceZh(text: string): string {
  const match = text.trim().match(/^[^。！？\n]+[。！？]?/)
  return match?.[0]?.trim() ?? text.trim()
}

const elapsedSeconds = (start: number, end: number) =>
  Math.max(0, Math.round((end - start) / 1000))

function HintPanel({ loading, text }: { loading: boolean; text: string }) {
  return (
    <div className="mt-4 min-h-[3.5rem] rounded-2xl border border-[#C8C9E8] border-l-[3px] border-l-[#9F9DF3] bg-[#D5D6F2] p-4">
      <div className="text-l2 text-[#2D2D2D]">提示</div>
      <div className="mt-3 whitespace-pre-wrap text-l3 text-[#2D2D2D]">
        {loading ? 'AI思考中...' : text}
      </div>
    </div>
  )
}

function HintActions({
  canEscalate,
  loading,
  onEscalate,
  onCheck,
  checkLabel,
}: {
  canEscalate: boolean
  loading: boolean
  onEscalate: () => void
  onCheck?: () => void
  checkLabel?: string
}) {
  if (!canEscalate && !onCheck) return null
  return (
    <div className="mt-3 flex items-center gap-3">
      {canEscalate ? (
        <button
          type="button"
          className="rounded-[20px] border border-[#9F9DF3] px-3 py-1 text-xs text-[#9F9DF3] disabled:opacity-50"
          disabled={loading}
          onClick={onEscalate}
        >
          我需要更多提示 ↑
        </button>
      ) : null}
      {onCheck ? (
        <button
          type="button"
          className="ml-auto rounded-2xl border border-[#FF9BB3]/40 bg-[#FF9BB3]/30 px-4 py-2 text-l3 font-semibold text-[#2D2D2D]/60 disabled:opacity-50"
          disabled={loading}
          onClick={onCheck}
        >
          {checkLabel}
        </button>
      ) : null}
    </div>
  )
}

export default function StepScaffold({
  question,
  condition,
  onSubmit,
  forcedFadingStage,
  fixedHints,
}: StepScaffoldProps) {
  const storeStage = useLearningStore((state) => state.fadingStage)
  const fadingStage = forcedFadingStage ?? storeStage
  const expectedParts = getExpectedPartCount(question)

  const [step1Values, setStep1Values] = useState(['', '', ''])
  const [step2Values, setStep2Values] = useState(() =>
    condition === 'no_ai' ? ['', '', ''] : ['1', String(question.factor), ''],
  )
  const [answers, setAnswers] = useState(() => question.correctAnswers.map(() => ''))
  const [submitted, setSubmitted] = useState(false)

  const [step1Hint, setStep1Hint] = useState(fixedHints?.step1 ?? '')
  const [step2Hint, setStep2Hint] = useState(fixedHints?.step2 ?? '')
  const [step3Hint, setStep3Hint] = useState(fixedHints?.step3 ?? '')
  const [loadingStep, setLoadingStep] = useState<1 | 2 | 3 | null>(null)
  const [step1Checks, setStep1Checks] = useState(0)
  const [step2Checks, setStep2Checks] = useState(0)

  const [escalatedStages, setEscalatedStages] = useState<Array<FadingStage | null>>([
    null,
    null,
    null,
  ])
  const [escalations, setEscalations] = useState([0, 0, 0])

  const problemStartedAtRef = useRef(0)
  const firstInteractionAtRef = useRef<number | null>(null)
  const firstHelpRequestAtRef = useRef<number | null>(null)
  const stepStartedAtRef = useRef<Array<number | null>>([null, null, null])
  const stepLastInteractionAtRef = useRef<Array<number | null>>([null, null, null])
  const escalationEventsRef = useRef<SupportEscalationRecord[][]>([[], [], []])
  const hintExposuresRef = useRef<HintExposureRecord[]>([])

  const canUseAi = condition !== 'no_ai'
  const canRecover = condition === 'fading' && !fixedHints
  const initialSupportLevel: FadingStage =
    condition === 'fixed' ? 'full_support' : condition === 'no_ai' ? 'none' : fadingStage
  const effectiveStages = escalatedStages.map((stage) => stage ?? initialSupportLevel)

  const displayedHintText = useCallback(
    (text: string, stage: FadingStage) =>
      condition === 'fading' && stage === 'minimal' ? firstSentenceZh(text) : text,
    [condition],
  )

  const recordInteraction = useCallback((step: 1 | 2 | 3) => {
    const now = Date.now()
    if (!problemStartedAtRef.current) problemStartedAtRef.current = now
    if (firstInteractionAtRef.current == null) firstInteractionAtRef.current = now
    const index = step - 1
    if (stepStartedAtRef.current[index] == null) stepStartedAtRef.current[index] = now
    stepLastInteractionAtRef.current[index] = now
  }, [])

  const recordHintExposure = useCallback(
    (
      step: 1 | 2 | 3,
      stage: FadingStage,
      text: string,
      source: HintExposureRecord['source'],
      generatedAt = Date.now(),
    ) => {
      const visibleText = displayedHintText(text, stage).trim()
      if (!visibleText) return
      hintExposuresRef.current.push({
        step,
        supportLevel: stage,
        hintText: visibleText,
        source,
        generatedAt,
        shownAt: Date.now(),
      })
    },
    [displayedHintText],
  )

  const displayedHints = useMemo(
    () =>
      [step1Hint, step2Hint, step3Hint].map((hint, index) =>
        displayedHintText(hint, effectiveStages[index]!),
      ),
    [displayedHintText, effectiveStages, step1Hint, step2Hint, step3Hint],
  )

  useEffect(() => {
    const now = Date.now()
    problemStartedAtRef.current = now
    stepStartedAtRef.current[0] = now
  }, [question.id])

  useEffect(() => {
    if (fixedHints || !canUseAi || (condition === 'fading' && fadingStage === 'none')) return
    let cancelled = false
    void Promise.all([
      condition === 'fading' && fadingStage === 'full_support'
        ? generateStep1InitialFullSupport(question)
        : generateStep1Hint(question, fadingStage, ['', '', ''], [false, false, false], condition),
      generateStep2InitialHint(question, fadingStage, condition),
      generateStep3Hint(question, fadingStage, condition),
    ]).then(([hint1, hint2, hint3]) => {
      if (cancelled) return
      const generatedAt = Date.now()
      setStep1Hint(hint1)
      setStep2Hint(hint2)
      setStep3Hint(hint3)
      recordHintExposure(1, initialSupportLevel, hint1, 'initial', generatedAt)
      recordHintExposure(2, initialSupportLevel, hint2, 'initial', generatedAt)
      recordHintExposure(3, initialSupportLevel, hint3, 'initial', generatedAt)
      setLoadingStep(null)
    })
    return () => {
      cancelled = true
    }
  }, [canUseAi, condition, fadingStage, fixedHints, initialSupportLevel, question, recordHintExposure])

  const regenerateHint = useCallback(
    async (step: 1 | 2 | 3, stage: FadingStage, checking = false) => {
      setLoadingStep(step)
      try {
        if (fixedHints) {
          const hint = [fixedHints.step1, fixedHints.step2, fixedHints.step3 ?? ''][step - 1]!
          if (step === 1) setStep1Hint(hint)
          if (step === 2) setStep2Hint(hint)
          if (step === 3) setStep3Hint(hint)
          return
        }
        let hint = ''
        if (step === 1) {
          const expected = [question.largerLabel, String(question.factor), String(question.knownAmount)]
          if (!checking) {
            hint = stage === 'full_support'
              ? await generateStep1InitialFullSupport(question)
              : await generateStep1Hint(
                  question,
                  stage,
                  ['', '', ''],
                  [false, false, false],
                  condition,
                )
          } else {
            hint = step1Values.every((value) => !value.trim())
              ? EMPTY_CHECK_HINT
              : await generateStep1Hint(
                  question,
                  stage,
                  step1Values,
                  checkHintInputs(step1Values, expected),
                  condition,
                )
          }
        } else if (step === 2) {
          if (!checking) {
            hint = await generateStep2InitialHint(question, stage, condition)
          } else {
            const expected = ['1', String(question.factor), String(expectedParts)]
            hint = step2Values.every((value) => !value.trim())
              ? EMPTY_CHECK_HINT
              : await generateStep2Hint(
                  question,
                  stage,
                  step2Values,
                  checkHintInputs(step2Values, expected),
                  condition,
                )
          }
        } else {
          hint = await generateStep3Hint(question, stage, condition)
        }
        if (step === 1) setStep1Hint(hint)
        if (step === 2) setStep2Hint(hint)
        if (step === 3) setStep3Hint(hint)
        recordHintExposure(step, stage, hint, checking ? 'check_feedback' : 'help_request')
      } finally {
        setLoadingStep(null)
      }
    },
    [condition, expectedParts, fixedHints, question, recordHintExposure, step1Values, step2Values],
  )

  const escalate = (step: 1 | 2 | 3) => {
    const index = step - 1
    const next = escalateStage(effectiveStages[index]!)
    if (!next) return
    const now = Date.now()
    recordInteraction(step)
    if (firstHelpRequestAtRef.current == null) firstHelpRequestAtRef.current = now
    escalationEventsRef.current[index]!.push({
      fromLevel: effectiveStages[index]!,
      toLevel: next,
      timestamp: now,
    })
    setEscalatedStages((stages) => stages.map((stage, i) => (i === index ? next : stage)))
    setEscalations((counts) => counts.map((count, i) => (i === index ? count + 1 : count)))
    void regenerateHint(step, next)
  }

  const checkStep1 = () => {
    recordInteraction(1)
    setStep1Checks((count) => count + 1)
    void regenerateHint(1, effectiveStages[0]!, true)
  }
  const checkStep2 = () => {
    recordInteraction(2)
    setStep2Checks((count) => count + 1)
    void regenerateHint(2, effectiveStages[1]!, true)
  }

  const submit = () => {
    const numericAnswers = answers.map((value) => Number.parseFloat(value.trim()))
    if (submitted || numericAnswers.some((value) => !Number.isFinite(value))) return
    recordInteraction(3)
    const completedAt = Date.now()
    const problemStartedAt = problemStartedAtRef.current || completedAt
    const step1Correctness = checkHintInputs(step1Values, [
      question.largerLabel,
      String(question.factor),
      String(question.knownAmount),
    ])
    const step2Correctness = checkHintInputs(step2Values, [
      '1',
      String(question.factor),
      String(expectedParts),
    ])
    const step3Values = answers.map((value) => value.trim())
    const step3Correctness = checkHintInputs(
      step3Values,
      question.correctAnswers.map(String),
    )
    const enteredByStep = [step1Values, step2Values, step3Values]
    const correctnessByStep = [step1Correctness, step2Correctness, step3Correctness]
    const checkCounts = [step1Checks, step2Checks, 0]

    const makeStepRecord = (step: 1 | 2 | 3): StepProcessRecord => {
      const index = step - 1
      const startedAt = stepStartedAtRef.current[index] ?? problemStartedAt
      const endedAt = stepLastInteractionAtRef.current[index] ?? completedAt
      const displayedHintsForStep = hintExposuresRef.current.filter((hint) => hint.step === step)
      return {
        enteredValues: [...enteredByStep[index]!],
        fieldCorrectness: [...correctnessByStep[index]!],
        isCorrect: correctnessByStep[index]!.every(Boolean),
        checkCount: checkCounts[index]!,
        stepStartedAt: startedAt,
        stepCompletedAt: endedAt,
        stepTime: elapsedSeconds(startedAt, endedAt),
        initialSupportLevel,
        actualSupportLevelShown: effectiveStages[index]!,
        aiSupportShown: displayedHintsForStep.length > 0,
        helpRequestCount: escalations[index]!,
        supportEscalations: [...escalationEventsRef.current[index]!],
        displayedHints: displayedHintsForStep,
      }
    }

    setSubmitted(true)
    onSubmit(numericAnswers, {
      step1Escalations: escalations[0]!,
      step2Escalations: escalations[1]!,
      step3Escalations: escalations[2]!,
      steps: {
        step1: makeStepRecord(1),
        step2: makeStepRecord(2),
        step3: makeStepRecord(3),
      },
      timing: {
        problemStartedAt,
        problemCompletedAt: completedAt,
        totalProblemTime: elapsedSeconds(problemStartedAt, completedAt),
        timeToFirstInteraction:
          firstInteractionAtRef.current == null
            ? null
            : elapsedSeconds(problemStartedAt, firstInteractionAtRef.current),
        timeBeforeFirstHelpRequest:
          firstHelpRequestAtRef.current == null
            ? null
            : elapsedSeconds(problemStartedAt, firstHelpRequestAtRef.current),
      },
    })
  }

  const unit = question.answerUnits[0] ?? ''
  const isRibbonLengthQuestion = question.id === 'm004'
  const showRecovery = (index: number) =>
    canRecover && escalateStage(effectiveStages[index]!) !== null

  return (
    <div className="app-card p-5">
      <div className="inline-flex rounded-full border border-[#FF9BB3]/40 bg-[#FF9BB3]/30 px-3 py-1 text-l3 font-medium text-[#2D2D2D]">
        {question.subject}
      </div>
      <div className="text-question mt-3 text-[#2D2D2D]">{question.content}</div>

      <section className="mt-4 rounded-2xl border border-[#C8C9E8] bg-white p-4">
        <div className="text-l2 text-[#2D2D2D]">Step 1 — 读题理解</div>
        <div className="mt-3 space-y-3 text-l3 text-[#2D2D2D]">
          <label className="flex flex-wrap items-center gap-2">
            <select
              className={inputClass}
              value={step1Values[0]}
              onChange={(event) => {
                recordInteraction(1)
                setStep1Values((values) => [event.target.value, values[1]!, values[2]!])
              }}
            >
              <option value="">请选择</option>
              <option value={question.baseLabel}>{question.baseLabel}</option>
              <option value={question.largerLabel}>{question.largerLabel}</option>
            </select>
            <span>{isRibbonLengthQuestion ? '的长度更长' : '的数量更多'}</span>
          </label>
          <label className="flex flex-wrap items-center gap-2">
            <span>
              {question.largerLabel}{isRibbonLengthQuestion ? '的长度是' : '的数量是'}
              {question.baseLabel}的
            </span>
            <input
              className={inputClass}
              type="number"
              inputMode="decimal"
              aria-label="倍数"
              value={step1Values[1]}
              onChange={(event) => {
                recordInteraction(1)
                setStep1Values((values) => [values[0]!, event.target.value, values[2]!])
              }}
            />
            <span>倍</span>
          </label>
          <label className="flex flex-wrap items-center gap-2">
            <span>{question.subtype === 'sum' ? '总数是' : '数量差是'}</span>
            <input
              className={inputClass}
              type="number"
              inputMode="decimal"
              aria-label={question.subtype === 'sum' ? '总数' : '差'}
              value={step1Values[2]}
              onChange={(event) => {
                recordInteraction(1)
                setStep1Values((values) => [values[0]!, values[1]!, event.target.value])
              }}
            />
            <span>{unit}</span>
          </label>
        </div>
        {canUseAi ? (
          <>
            <HintPanel loading={loadingStep === 1} text={displayedHints[0] ?? ''} />
            <HintActions
              canEscalate={showRecovery(0)} loading={loadingStep === 1}
              onEscalate={() => escalate(1)} onCheck={checkStep1}
              checkLabel={step1Checks ? '重新检查' : '检查一下'}
            />
          </>
        ) : null}
      </section>

      <section className="mt-4 rounded-2xl border border-[#C8C9E8] bg-white p-4">
        <div className="text-l2 text-[#2D2D2D]">Step 2 — 列份数关系</div>
        <div className="mt-3 space-y-2 text-l3 text-[#2D2D2D]">
          <div className="mb-3">请用“份”表示两个数量之间的关系：</div>
          {condition === 'no_ai' ? (
            <>
              <label className="flex flex-wrap items-center gap-2">
                <span>{question.baseLabel}：</span>
                <input
                  className={inputClass}
                  type="number"
                  inputMode="decimal"
                  aria-label={`${question.baseLabel}的份数`}
                  value={step2Values[0]}
                  onChange={(event) => {
                    recordInteraction(2)
                    setStep2Values((values) => [event.target.value, values[1]!, values[2]!])
                  }}
                />
                <span>份</span>
              </label>
              <label className="flex flex-wrap items-center gap-2">
                <span>{question.largerLabel}：</span>
                <input
                  className={inputClass}
                  type="number"
                  inputMode="decimal"
                  aria-label={`${question.largerLabel}的份数`}
                  value={step2Values[1]}
                  onChange={(event) => {
                    recordInteraction(2)
                    setStep2Values((values) => [values[0]!, event.target.value, values[2]!])
                  }}
                />
                <span>份</span>
              </label>
            </>
          ) : (
            <>
              <div>{question.baseLabel}：1份</div>
              <div>{question.largerLabel}：{question.factor}份</div>
            </>
          )}
          <label className="flex flex-wrap items-center gap-2 font-semibold">
            <span>{getPartRelationshipLabel(question)}：</span>
            <input
              className={inputClass}
              type="number"
              inputMode="decimal"
              aria-label={question.subtype === 'sum' ? '总份数' : '相差份数'}
              value={step2Values[2]}
              onChange={(event) => {
                recordInteraction(2)
                setStep2Values((values) => [values[0]!, values[1]!, event.target.value])
              }}
            />
            <span>份</span>
          </label>
        </div>
        {canUseAi ? (
          <>
            <HintPanel loading={loadingStep === 2} text={displayedHints[1] ?? ''} />
            <HintActions
              canEscalate={showRecovery(1)} loading={loadingStep === 2}
              onEscalate={() => escalate(2)} onCheck={checkStep2}
              checkLabel={step2Checks ? '重新检查' : '检查一下'}
            />
          </>
        ) : null}
      </section>

      <section className="mt-4 rounded-2xl border border-[#C8C9E8] bg-white p-4">
        <div className="text-l2 text-[#2D2D2D]">Step 3 — 计算并作答</div>
        <div className="mt-3 space-y-4 text-l3 text-[#2D2D2D]">
          <label className="block">
            <span className="block font-semibold">
              {condition === 'no_ai' ? `${question.baseLabel}：` : `${question.baseLabel}（1份）：`}
            </span>
            <span className="mt-1 flex flex-wrap items-center gap-2">
              <span>
                {question.subtype === 'sum' ? '总数 ÷ 总份数' : '数量差 ÷ 相差份数'} ={' '}
                {condition === 'no_ai'
                  ? null
                  : `${question.knownAmount} ÷ ${step2Values[2] || '？'} =`}
              </span>
              <input
                className={inputClass}
                type="number"
                inputMode="decimal"
                aria-label={`${question.baseLabel}的答案`}
                value={answers[0] ?? ''}
                onChange={(event) => {
                  recordInteraction(3)
                  setAnswers((values) => [event.target.value, values[1] ?? ''])
                }}
                disabled={submitted}
              />
              <span>{question.answerUnits[0]}</span>
            </span>
          </label>
          <label className="block">
            <span className="block font-semibold">
              {condition === 'no_ai'
                ? `${question.largerLabel}：`
                : `${question.largerLabel}（${question.factor}份）：`}
            </span>
            <span className="mt-1 flex flex-wrap items-center gap-2">
              <span>
                1份的数量 × 倍数 ={' '}
                {condition === 'no_ai'
                  ? null
                  : `${answers[0] || '？'} × ${question.factor} =`}
              </span>
              <input
                className={inputClass}
                type="number"
                inputMode="decimal"
                aria-label={`${question.largerLabel}的答案`}
                value={answers[1] ?? ''}
                onChange={(event) => {
                  recordInteraction(3)
                  setAnswers((values) => [values[0] ?? '', event.target.value])
                }}
                disabled={submitted}
              />
              <span>{question.answerUnits[1]}</span>
            </span>
          </label>
        </div>
        {canUseAi ? (
          <>
            <HintPanel loading={loadingStep === 3} text={displayedHints[2] ?? ''} />
            <HintActions
              canEscalate={showRecovery(2)} loading={loadingStep === 3}
              onEscalate={() => escalate(3)}
            />
          </>
        ) : null}
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            className="app-btn-primary rounded-2xl px-5 py-2.5 disabled:opacity-50"
            disabled={submitted || answers.some((value) => !value.trim())}
            onClick={submit}
          >
            提交答案
          </button>
        </div>
      </section>
    </div>
  )
}
