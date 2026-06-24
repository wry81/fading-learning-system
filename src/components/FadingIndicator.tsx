import { useMemo } from 'react'

import { useLearningStore, ensureSkillStates } from '../store/learningStore'
import type { FadingStage } from '../types'

type StageMeta = {
  label: string
  description: string
  segmentColor: string
}

const STAGES: FadingStage[] = ['full_support', 'partial', 'minimal', 'none']

const STAGE_META: Record<FadingStage, StageMeta> = {
  full_support: {
    label: 'AI 全力辅助',
    segmentColor: '#9F9DF3',
    description: 'AI 提供完整提示、分步引导与纠错，帮助你建立正确解题流程。',
  },
  partial: {
    label: 'AI 部分辅助',
    segmentColor: '#9F9DF3',
    description: 'AI 只在关键步骤提供提示；你需要补全更多推理与计算。',
  },
  minimal: {
    label: 'AI 少量辅助',
    segmentColor: '#9F9DF3',
    description: 'AI 仅在卡住时提供轻量提示；主要由你独立完成。',
  },
  none: {
    label: '自主作答',
    segmentColor: '#9F9DF3',
    description: '不再提供 AI 辅助；请独立完成并检验你的掌握程度。',
  },
}

const FILLED_COUNT: Record<FadingStage, number> = {
  full_support: 1,
  partial: 2,
  minimal: 3,
  none: 4,
}

const SKILL_LABELS: Record<string, string> = {
  求时间: '求相遇时间',
  求路程: '求总路程',
}

export default function FadingIndicator({
  skill,
  skillKey,
}: {
  skill?: string
  skillKey?: string
}) {
  const rawSkillStates = useLearningStore((s) => s.skillStates)
  const skillStates = ensureSkillStates(rawSkillStates)
  const activeSkill = useLearningStore((s) => s.activeSkill)
  const globalFadingStage = useLearningStore((s) => s.fadingStage)

  const resolvedKey = skillKey ?? activeSkill ?? skill
  const skillState = resolvedKey ? skillStates[resolvedKey] : null
  const fadingStage = skillState?.fadingStage ?? globalFadingStage

  const skillLabel = resolvedKey
    ? `${SKILL_LABELS[resolvedKey] ?? resolvedKey}进度`
    : skill
      ? `${skill}进度`
      : null

  const stage = STAGE_META[fadingStage]
  const filledCount = FILLED_COUNT[fadingStage]

  const segments = useMemo(() => STAGES.map((s, i) => ({ stage: s, index: i })), [])

  return (
    <div className="w-full">
      {skillLabel ? (
        <div className="mb-1.5 text-l4 font-semibold text-[#6353AC]">{skillLabel}</div>
      ) : null}
      <div className="app-card flex w-full flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            {segments.map(({ stage: segmentStage, index }) => {
              const filled = index < filledCount
              return (
                <span
                  key={segmentStage}
                  className="h-3 w-7 rounded-md ring-1 ring-inset"
                  style={{
                    backgroundColor: filled
                      ? STAGE_META[segmentStage].segmentColor
                      : '#D5D6F2',
                    borderColor: filled ? STAGE_META[segmentStage].segmentColor : '#C8C9E8',
                  }}
                  aria-hidden="true"
                />
              )
            })}
          </div>
          <span className="text-l3 font-semibold text-[#3D2E7C]">{stage.label}</span>
        </div>

        <div className="hidden h-5 w-px bg-[#C8C9E8] sm:block" aria-hidden="true" />

        <p className="min-w-0 flex-1 text-l4 leading-snug text-[#3D2E7C]">
          {stage.description}
        </p>
      </div>
    </div>
  )
}
