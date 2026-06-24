import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { detectCondition, useParticipantStore } from '../store/participantStore'
import { useLearningStore } from '../store/learningStore'
import type { StudyCondition } from '../types'

function formatDate(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('zh-CN')
}

function ConditionBadge({ condition }: { condition: StudyCondition }) {
  const meta = {
    fading: {
      label: '实验组：AI自适应脚手架',
      cls: 'bg-[#FF9BB3]/40 text-[#3D2E7C]',
    },
    fixed: {
      label: '对照组：固定AI脚手架',
      cls: 'bg-[#C9EBCA] text-[#2D5E30]',
    },
    no_ai: {
      label: '对照组：无AI支持',
      cls: 'bg-[#D5D6F2] text-[#6353AC]',
    },
  }[condition]

  return (
    <div className="pt-1">
      <span className={['inline-flex rounded-full px-3 py-1 text-l3 font-semibold', meta.cls].join(' ')}>
        {meta.label}
      </span>
    </div>
  )
}

export default function Login() {
  const isResearcher =
    new URLSearchParams(window.location.search).get('researcher') === 'true'

  const navigate = useNavigate()
  const participants = useParticipantStore((s) => s.participants)
  const getParticipant = useParticipantStore((s) => s.getParticipant)
  const createParticipant = useParticipantStore((s) => s.createParticipant)
  const exportAllDataFromStore = useParticipantStore((s) => s.exportAllData)

  const setCurrentParticipantId = useLearningStore((s) => s.setCurrentParticipantId)
  const setCondition = useLearningStore((s) => s.setCondition)
  const startLearningSession = useLearningStore((s) => s.startSession)
  const initBKT = useLearningStore((s) => s.initBKT)

  const [participantId, setParticipantId] = useState('')
  const trimmedId = participantId.trim()

  const validationError = useMemo(() => {
    if (!trimmedId) return '请输入参与者编号'
    if (getParticipant(trimmedId)) return '该参与者编号已存在'
    return null
  }, [trimmedId, getParticipant])

  const startNew = () => {
    if (validationError) return
    const p = createParticipant(trimmedId)
    setCurrentParticipantId(p.id)
    setCondition(p.condition)
    initBKT(0)
    startLearningSession()
    navigate('/home')
  }

  const startReturning = (id: string) => {
    const p = getParticipant(id)
    if (p) setCondition(p.condition)
    setCurrentParticipantId(id)
    startLearningSession()
    navigate('/home')
  }

  const exportAllData = () => {
    exportAllDataFromStore()
  }

  return (
    <div className="app-page min-h-screen">
      <div className={`app-container space-y-8 py-4 ${isResearcher ? 'pb-24' : 'pb-6'}`}>
        <header className="space-y-2">
          <h1 className="text-l1 text-[#3D2E7C]">Fading Learning System</h1>
        </header>

        <section className="app-card p-5">

          <div className="mt-4 space-y-2">
            <label className="block text-l3 font-medium text-[#3D2E7C]">
              参与者编号
            </label>
            <input
              className="w-full rounded-2xl border border-[#9F9DF3] px-3 py-2 text-l3 text-[#3D2E7C] outline-none transition placeholder:text-[#BABABA] focus:border-[#6353AC] focus:ring-2 focus:ring-[#9F9DF3]/30"
              placeholder="如：A1、B1"
              value={participantId}
              onChange={(e) => setParticipantId(e.target.value)}
            />
            {trimmedId ? <ConditionBadge condition={detectCondition(trimmedId)} /> : null}
            {validationError ? (
              <div className="text-l4 text-[#BABABA]">{validationError}</div>
            ) : (
              <div className="text-l4 text-[#6353AC]">编号可自定义，但不可重复</div>
            )}
          </div>

          <div className="mt-4">
            <button
              type="button"
              className="app-btn-primary px-5 py-2.5 disabled:opacity-50"
              disabled={!!validationError}
              onClick={startNew}
            >
              开始实验
            </button>
          </div>
        </section>

        <section className="app-card p-5 bg-[#9F9DF3]">
          <h2 className="text-l2 text-[#FFFFFF]">已有参与者</h2>
          <p className="mt-1 text-l4 text-[#EAE8FF]">选择参与者编号继续实验</p>

          <div className="mt-4 space-y-2">
            {participants.length === 0 ? (
              <div className="app-card p-4 text-l4 text-[#6353AC]">暂无记录</div>
            ) : (
              participants.map((p) => {
                const lastSession =
                  p.sessions.length > 0 ? p.sessions[p.sessions.length - 1]!.date : null
                return (
                  <div
                    key={p.id}
                    className="app-card flex flex-wrap items-center justify-between gap-3 p-4 transition-colors hover:bg-[#D5D6F2]"
                  >
                    <div className="min-w-0">
                      <div className="text-l3 font-semibold text-[#3D2E7C]">
                        参与者 #{p.id}
                      </div>
                      <div className="mt-0.5 text-l4 text-[#6353AC]">
                        最近一次：{lastSession ? formatDate(lastSession) : '—'}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="app-btn-primary px-4 py-2"
                      onClick={() => startReturning(p.id)}
                    >
                      继续
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </section>
      </div>

      {isResearcher && (
        <div className="researcher-tools-bar fixed inset-x-0 bottom-0 border-t border-[#C8C9E8] bg-[#D5D6F2]/95 backdrop-blur">
          <div className="app-container flex items-center justify-between gap-3 py-3">
            <div className="text-l4 text-[#6353AC]">研究者工具</div>
            <button
              type="button"
              className="app-btn-dark px-4 py-2"
              onClick={exportAllData}
            >
              导出所有数据
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
