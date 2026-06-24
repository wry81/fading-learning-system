import { useMemo } from 'react'

import { useLearningStore } from '../store/learningStore'
import type { FadingEvent, FadingStage } from '../types'

const STAGE_LABELS: Record<FadingStage, string> = {
  full_support: '全力辅助',
  partial: '部分辅助',
  minimal: '少量辅助',
  none: '自主作答',
}

const STAGE_COLORS: Record<FadingStage, { badge: string; dot: string; line: string }> = {
  full_support: {
    badge: 'bg-[#FF9BB3]/40 text-[#3D2E7C]',
    dot: 'bg-[#FF9BB3] ring-[#FF9BB3]/30',
    line: 'bg-[#FF9BB3]/40',
  },
  partial: {
    badge: 'bg-[#9F9DF3]/40 text-[#3D2E7C]',
    dot: 'bg-[#9F9DF3] ring-[#9F9DF3]/30',
    line: 'bg-[#9F9DF3]/40',
  },
  minimal: {
    badge: 'bg-[#C9EBCA] text-[#2D5E30]',
    dot: 'bg-[#C9EBCA] ring-[#C9EBCA]/50',
    line: 'bg-[#C9EBCA]',
  },
  none: {
    badge: 'bg-[#6353AC] text-white',
    dot: 'bg-[#6353AC] ring-[#6353AC]/30',
    line: 'bg-[#6353AC]/40',
  },
}

function fmtTs(ms: number) {
  const d = new Date(ms)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${mm}/${dd} ${hh}:${min}`
}

function stageArrow(fromStage: FadingStage, toStage: FadingStage) {
  return `${STAGE_LABELS[fromStage]} → ${STAGE_LABELS[toStage]}`
}

export default function AbilityHistory() {
  const abilityLevel = useLearningStore((s) => s.abilityLevel)
  const fadingStage = useLearningStore((s) => s.fadingStage)
  const questionHistory = useLearningStore((s) => s.questionHistory)
  const fadingHistory = useLearningStore((s) => s.fadingHistory)

  const safeAbility = Math.min(4, Math.max(1, abilityLevel))

  const timeline = useMemo(() => {
    const sorted = [...fadingHistory].sort((a, b) => a.timestamp - b.timestamp)
    return sorted
  }, [fadingHistory])

  return (
    <section>
      <h2 className="text-l2 text-[#3D2E7C]">能力成长记录</h2>

      <div className="mt-4 rounded-2xl bg-[#FFFFFF] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-l4 text-[#6353AC]">当前能力</div>
            <div className="mt-1 text-l1 text-[#3D2E7C]">
              {safeAbility}
              <span className="text-l4 font-semibold text-[#6353AC]">/4</span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <span
              className={[
                'inline-flex rounded-full px-3 py-1 text-l3 font-semibold',
                STAGE_COLORS[fadingStage].badge,
              ].join(' ')}
            >
              {STAGE_LABELS[fadingStage]}
            </span>
            <div className="text-l3 text-[#3D2E7C]">
              已完成 {questionHistory.length} 题
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div className="text-l3 font-semibold text-[#3D2E7C]">成长时间线</div>

        {timeline.length === 0 ? (
          <div className="mt-3 rounded-2xl bg-[#FFFFFF] px-4 py-3 text-l4 text-[#6353AC]">
            还没有等级变化记录，继续学习吧！
          </div>
        ) : (
          <div className="mt-4">
            <div className="relative pl-6">
              <div
                className={[
                  'absolute left-2 top-0 h-full w-0.5',
                  STAGE_COLORS[fadingStage].line,
                ].join(' ')}
                aria-hidden="true"
              />

              <div className="space-y-4">
                {timeline.map((e: FadingEvent, idx: number) => {
                  const colors = STAGE_COLORS[e.toStage]
                  return (
                    <div key={idx} className="relative">
                      <div
                        className={[
                          'absolute left-0 top-1.5 h-3 w-3 rounded-full ring-4',
                          colors.dot,
                        ].join(' ')}
                        aria-hidden="true"
                      />
                      <div className="app-card px-4 py-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="text-l3 font-semibold text-[#3D2E7C]">
                            {stageArrow(e.fromStage, e.toStage)}
                          </div>
                          <div className="text-l4 text-[#6353AC]">
                            {fmtTs(e.timestamp)}
                          </div>
                        </div>
                        <div className="mt-1 text-l4 text-[#6353AC]">
                          等级 {e.abilityLevelAtChange}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* <div className="mt-6 app-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-l3 font-semibold text-[#3D2E7C]">进度</div>
          <div className="text-l3 text-[#6353AC]">
            {safeAbility === 4 ? '🎉 你已经达到完全独立！' : `距离完全独立还有 ${remaining} 级`}
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <div className="flex items-center gap-1">
            {segments.map((n) => {
              const filled = n <= safeAbility
              return (
                <span
                  key={n}
                  className="h-2.5 w-8 rounded-md ring-1 ring-inset"
                  style={{
                    backgroundColor: filled ? SEGMENT_COLORS[n - 1] : '#D5D6F2',
                    borderColor: filled ? SEGMENT_COLORS[n - 1] : '#C8C9E8',
                  }}
                  aria-hidden="true"
                />
              )
            })}
          </div>
          <span className="text-l3 tabular-nums text-[#6353AC]">
            {safeAbility}/4
          </span>
        </div>
      </div> */}
    </section>
  )
}
