import { useLearningStore } from '../store/learningStore'
import type { FadingStage, Question } from '../types'

export type AIOverlayProps = {
  question: Question
  onClose: () => void
}

type OverlayMeta = {
  title: string
  accentClass: string
  closeText: string
  lines: string[]
}

const META: Record<Exclude<FadingStage, 'none'>, OverlayMeta> = {
  full_support: {
    title: 'AI 辅助提示',
    accentClass: 'border-l-[#FF9BB3]',
    closeText: '我知道了',
    lines: [
      '第一步：观察函数结构，f(x) = x² - 2x + 3 是一个二次函数',
      '第二步：二次函数 ax² + bx + c，当 a > 0 时开口向上，有最小值',
      '第三步：顶点 x = -b/2a = 1，代入得 f(1) = 1 - 2 + 3 = 2，但等等——请自己验算一下选项A',
    ],
  },
  partial: {
    title: 'AI 提示',
    accentClass: 'border-l-[#9F9DF3]',
    closeText: '我来试试',
    lines: [
      '提示：这道题考查二次函数的顶点公式。',
      '回忆一下顶点坐标的计算方法，试着自己推导。',
    ],
  },
  minimal: {
    title: '小提示',
    accentClass: 'border-l-[#C9EBCA]',
    closeText: '好的',
    lines: ['想想二次函数的对称轴在哪里。'],
  },
}

export default function AIOverlay({ question, onClose }: AIOverlayProps) {
  const fadingStage = useLearningStore((s) => s.fadingStage)

  // eslint-disable-next-line no-console
  console.log('[AIOverlay] render', { fadingStage, questionId: question.id })

  if (fadingStage === 'none') return null

  const meta = META[fadingStage]
  if (!meta) {
    // eslint-disable-next-line no-console
    console.warn('[AIOverlay] unknown fadingStage', fadingStage)
    return null
  }

  return (
    <div className="transition-opacity duration-300 ease-out">
      <div
        className={[
          'app-card border-l-4 bg-[#D5D6F2] p-4',
          meta.accentClass,
        ].join(' ')}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-l2 text-[#3D2E7C]">
              {meta.title}
            </div>
            <div className="mt-0.5 text-l4 text-[#6353AC]">
              针对题目：{question.subject} · {question.id}
            </div>
          </div>
          <button
            type="button"
            className="app-btn-primary shrink-0 px-3 py-1.5"
            onClick={onClose}
          >
            {meta.closeText}
          </button>
        </div>

        <div className="mt-3 space-y-2 text-l3 text-[#3D2E7C]">
          {meta.lines.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
      </div>
    </div>
  )
}
