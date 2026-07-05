import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import StepScaffold from '../components/StepScaffold'
import { getTutorialQuestion } from '../data/questions'

export default function Tutorial() {
  const navigate = useNavigate()
  const tutorialQuestion = useMemo(() => getTutorialQuestion(), [])

  const [step1Hint] = useState(
    '找找题目里有几个数字？哪个是铅笔的数量，哪个是总价格？',
  )
  const [step2Hint] = useState(
    '先用总价格 ÷ 铅笔数量，算出每支铅笔的价格。再用每支价格 × 要买的数量，就是所求总价。',
  )
  const [step3Hint] = useState(
    '用每支铅笔的价格乘以16，在草稿纸上算出总共需要多少钱。',
  )

  const [scaffoldKey, setScaffoldKey] = useState(0)
  const [completed, setCompleted] = useState(false)
  const [lastWrong, setLastWrong] = useState(false)

  const handleSubmit = (answer: number) => {
    if (answer === tutorialQuestion.correctAnswer) {
      setLastWrong(false)
      setCompleted(true)
      return
    }
    setLastWrong(true)
    setScaffoldKey((k) => k + 1)
  }

  if (completed) {
    return (
      <div className="app-page py-4">
        <div className="app-container">
          <div className="rounded-2xl border border-[#C9EBCA] bg-[#C9EBCA] p-6 text-center">
            <div className="text-l2 font-semibold text-[#2D5E30]">
              🎉 很棒！你已经掌握答题步骤了！
            </div>
            <p className="mt-2 text-l3 text-[#2D5E30]">现在开始正式练习吧</p>
            <button
              type="button"
              className="app-btn-primary mt-5 px-5 py-2.5"
              onClick={() => navigate('/home')}
            >
              开始正式练习 →
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app-page py-4">
      <div className="app-container space-y-4">
        <header className="rounded-2xl border border-[#FFD93D] bg-[#FFF4CC] p-5">
          <h1 className="text-l1 text-[#3D2E7C]">📖 先来练习一下</h1>
          <p className="mt-2 text-l3 leading-relaxed text-[#6353AC]">
            做一道练习题，熟悉答题步骤，练习题不计入正式实验
          </p>
        </header>

        <div className="rounded-2xl border border-[#FFD93D] bg-[#FFF9E6] px-4 py-3 text-l3 text-[#6353AC]">
          💡 按照步骤一步一步来，不会的地方可以看AI提示
        </div>

        <StepScaffold
          key={scaffoldKey}
          question={tutorialQuestion}
          condition="fading"
          forcedFadingStage="full_support"
          fixedHints={{
            step1: step1Hint,
            step2: step2Hint,
            step3: step3Hint,
          }}
          onSubmit={handleSubmit}
        />

        {lastWrong ? (
          <div className="rounded-2xl bg-[#FF9BB3]/40 px-4 py-3 text-l3 font-semibold text-[#8B2040]">
            答案不对，再试一次 💪
          </div>
        ) : null}

        <div className="pt-2 text-center">
          <button
            type="button"
            className="text-l4 text-[#6353AC]/70 underline-offset-2 hover:underline"
            onClick={() => navigate('/home')}
          >
            跳过练习，直接开始 →
          </button>
        </div>
      </div>
    </div>
  )
}
