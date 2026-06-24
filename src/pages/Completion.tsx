import { useNavigate } from 'react-router-dom'

import { useLearningStore } from '../store/learningStore'

function todayLabel() {
  return new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })
}

export default function Completion() {
  const navigate = useNavigate()
  const questionHistory = useLearningStore((s) => s.questionHistory)

  return (
    <div className="app-page flex min-h-screen items-center justify-center py-4">
      <div className="app-container app-container--narrow w-full space-y-6 text-center">
        <div className="text-6xl">🎉</div>

        <header className="space-y-2">
          <h1 className="text-l1 text-[#3D2E7C]">今日练习完成！</h1>
          <p className="text-l4 text-[#6353AC]">你已经完成了今天的全部题目，真棒！</p>
        </header>

        <section className="app-card p-5 text-left">
          <div className="text-l4 font-medium text-[#6353AC]">📚 完成题数</div>
          <div className="mt-1 text-l1 text-[#3D2E7C]">
            {questionHistory.length} 题
          </div>
        </section>

        <section className="rounded-2xl bg-[#9F9DF3] p-6 shadow-md">
          <div className="text-l4 font-medium text-white/90">📅 完成日期</div>
          <div className="mt-2 text-l2 text-white">{todayLabel()}</div>
        </section>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            className="app-btn-primary w-full px-6 py-4 shadow-md"
            onClick={() => navigate('/home')}
          >
            返回主页 🏠
          </button>
          <button
            type="button"
            className="app-btn-outline w-full px-6 py-4"
            onClick={() => navigate('/')}
          >
            退出登录
          </button>
        </div>
      </div>
    </div>
  )
}
