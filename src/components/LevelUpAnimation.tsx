import { useMemo } from 'react'

import type { FadingStage } from '../types'

export interface LevelUpAnimationProps {
  show: boolean
  previousLevel: number
  newLevel: number
  previousStage: FadingStage
  newStage: FadingStage
  onDismiss: () => void
}

type StageMeta = { label: string }

const STAGE_LABELS: Record<FadingStage, StageMeta> = {
  full_support: { label: 'AI 全力辅助' },
  partial: { label: 'AI 部分辅助' },
  minimal: { label: 'AI 少量辅助' },
  none: { label: '自主作答' },
}

function encouragementForLevel(level: number) {
  if (level >= 4) return '你已经可以独立解题了！'
  if (level === 3) return '太棒了！AI开始减少提示了'
  if (level === 2) return '你已经掌握了基本思路，继续加油！'
  return '继续加油！'
}

export default function LevelUpAnimation(props: LevelUpAnimationProps) {
  const {
    show,
    previousLevel,
    newLevel,
    previousStage,
    newStage,
    onDismiss,
  } = props

  const stageChanged = previousStage !== newStage
  const encouragement = useMemo(() => encouragementForLevel(newLevel), [newLevel])

  if (!show) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6 transition-opacity duration-300"
      style={{ backgroundColor: 'rgba(99, 83, 172, 0.7)' }}
      role="dialog"
      aria-modal="true"
      onClick={onDismiss}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl transition-transform duration-300 ease-out animate-[levelUpPop_0.4s_ease-out_both]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center text-center">
          <div className="text-[64px] leading-none text-[#FF9BB3]"><img src="/src/assets/success.png"width="200" height="200" alt="目标" /></div>
          <div className="mt-2 text-l1 text-[#6353AC]">能力提升了！</div>
          <div className="mt-1 text-l4 font-medium text-[#6353AC]">
            等级 {previousLevel} → 等级 {newLevel}
          </div>

          {stageChanged ? (
            <div className="mt-3 rounded-2xl bg-[#D5D6F2] px-3 py-2 text-l3 text-[#3D2E7C]">
              AI 辅助已减少：{STAGE_LABELS[previousStage].label} →{' '}
              {STAGE_LABELS[newStage].label}
            </div>
          ) : null}

          <div className="mt-4 rounded-2xl bg-[#FF9BB3]/50 px-3 py-2 text-l3 text-[#2D2D2D]">
            {encouragement}
          </div>

          <div className="mt-4 text-l4 text-[#2D2D2D]/60">点击任意位置关闭</div>
        </div>
      </div>

      <style>{`
@keyframes levelUpPop {
  0% { transform: scale(0.5); opacity: 0; }
  70% { transform: scale(1.05); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
`}</style>
    </div>
  )
}
