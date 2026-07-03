import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import AbilityHistory from '../components/AbilityHistory'
import FadingIndicator from '../components/FadingIndicator'
import { questions } from '../data/questions'
import distanceIcon from '../assets/distance.svg'
import timeIcon from '../assets/time.svg'
import skillIcon from '../assets/skill.svg'
import { useLearningStore, ensureSkillStates } from '../store/learningStore'
import { useParticipantStore } from '../store/participantStore'
import type { SkillType } from '../types'

const QUESTIONS_PER_SKILL: Record<SkillType, number> = {
  求时间: questions.filter((q) => q.skillType === '求时间').length,
  求路程: questions.filter((q) => q.skillType === '求路程').length,
}

type SkillModule = {
  skillType: SkillType
  title: string
  iconSrc: string
  borderColor: string
  iconBg: string
}

const SKILL_MODULES: SkillModule[] = [
  {
    skillType: '求时间',
    title: '求相遇时间',
    iconSrc: timeIcon,
    borderColor: '#9F9DF3',
    iconBg: 'bg-[#9F9DF3]/30',
  },
  {
    skillType: '求路程',
    title: '求总路程',
    iconSrc: distanceIcon,
    borderColor: '#C9EBCA',
    iconBg: 'bg-[#C9EBCA]/50',
  },
]

function formatYmd(dateLike: string) {
  const d = new Date(dateLike)
  if (Number.isNaN(d.getTime())) return dateLike
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })
}

function todayYmd() {
  return new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })
}

function SkillModuleCard({
  module,
  pL,
  totalQuestions,
  completed,
  onStart,
}: {
  module: SkillModule
  pL: number
  totalQuestions: number
  completed: boolean
  onStart: () => void
}) {
  const progress = Math.round(Math.min(1, Math.max(0, pL)) * 100)
  const borderColor = completed ? '#C9EBCA' : module.borderColor

  return (
    <div
      className={[
        'app-card flex flex-col p-5 shadow-sm transition-colors',
        completed ? 'ring-2 ring-[#C9EBCA]/60' : '',
      ].join(' ')}
      style={{ borderLeft: `4px solid ${borderColor}` }}
    >
      <div className="flex items-start gap-3">
        <div
          className={[
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl',
            completed ? 'bg-[#C9EBCA]/50' : module.iconBg,
          ].join(' ')}
        >
          {completed ? (
            <span
              className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2D5E30] text-lg text-white"
              aria-hidden
            >
              ✓
            </span>
          ) : (
            <img
              src={module.iconSrc}
              width={28}
              height={28}
              alt=""
              aria-hidden
              className="h-7 w-7 object-contain"
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-l2 text-[#3D2E7C]">{module.title}</h3>
            {completed ? (
              <span className="rounded-full bg-[#C9EBCA] px-2.5 py-0.5 text-l4 font-semibold text-[#2D5E30]">
                已完成
              </span>
            ) : null}
          </div>

          {completed ? (
            <p className="mt-2 text-l3 font-semibold text-[#2D5E30]">
              已完成 {totalQuestions}/{totalQuestions} 题
            </p>
          ) : (
            <div className="mt-2">
              <div className="flex items-center justify-between text-l4 text-[#6353AC]">
                <span>掌握度 P(L)</span>
                <span>{progress}%</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#D5D6F2]">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${progress}%`, backgroundColor: module.borderColor }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
      <button
        type="button"
        className={[
          'mt-4 w-full px-4 py-2.5',
          completed ? 'app-btn-outline border-[#C9EBCA] text-[#2D5E30]' : 'app-btn-primary',
        ].join(' ')}
        onClick={onStart}
      >
        {completed ? '再次练习' : '开始练习'}
      </button>
    </div>
  )
}

export default function Home() {
  const navigate = useNavigate()

  const currentParticipantId = useLearningStore((s) => s.currentParticipantId)
  const condition = useLearningStore((s) => s.condition)
  const questionHistory = useLearningStore((s) => s.questionHistory)
  const rawSkillStates = useLearningStore((s) => s.skillStates)
  const completedSkills = useLearningStore((s) => s.completedSkills)
  const skillStates = useMemo(() => ensureSkillStates(rawSkillStates), [rawSkillStates])
  const setCurrentSkillType = useLearningStore((s) => s.setCurrentSkillType)

  const repairSkillStates = useLearningStore((s) => s.repairSkillStates)

  useEffect(() => {
    repairSkillStates()
  }, [repairSkillStates])

  const getParticipant = useParticipantStore((s) => s.getParticipant)
  const participant = currentParticipantId
    ? getParticipant(currentParticipantId)
    : null

  const sessions = participant?.sessions ?? []
  const sessionCount = Math.max(1, sessions.length)

  const historyItems = useMemo(() => {
    if (sessions.length <= 1) return []
    return sessions.map((s, idx) => ({
      label: `第${idx + 1}次学习`,
      date: s.date,
      count: s.answers.length,
    }))
  }, [sessions])

  const startSkill = (skillType: SkillType) => {
    setCurrentSkillType(skillType)
    navigate('/learning')
  }

  return (
    <div className="app-page py-6">
      <div className="app-container space-y-5">
        <header className="app-card flex items-center gap-4 border-2 border-[#FF9BB3]/50 bg-[#FF9BB3] p-5">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#FFFFFF]/60 text-3xl">
            🥳
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-l1 text-[#FFFFFF]/90">
              你好，参与者 {currentParticipantId ?? '—'}！
            </h1>
            <p className="mt-1 text-l4 text-[#FFFFFF]/60">{todayYmd()}</p>
          </div>
        </header>

        <section className="rounded-2xl bg-[#FFFFFF]/80 p-5 shadow-sm">
          <h2 className="text-l2 flex items-center gap-2 text-[#2D2D2D]">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#9F9DF3]/50">
              <img src={skillIcon} width="35" height="35" alt="能力" />
            </span>
            当前能力
          </h2>
          <div className="mt-4 space-y-4">
            <FadingIndicator />

            <div className="flex flex-wrap items-center justify-between gap-3 text-l3 font-semibold text-[#2D2D2D]">
              <span> 已完成 {questionHistory.length} 题</span>
              <span> 第 {sessionCount} 次学习</span>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {SKILL_MODULES.map((module) => {
            const state = skillStates[module.skillType]
            const total = QUESTIONS_PER_SKILL[module.skillType]
            const completed = completedSkills[module.skillType] === true
            return (
              <SkillModuleCard
                key={module.skillType}
                module={module}
                pL={state?.pL ?? 0.05}
                totalQuestions={total}
                completed={completed}
                onStart={() => startSkill(module.skillType)}
              />
            )
          })}
        </section>

        {condition === 'fading' ? (
          <div className="app-card bg-[#9F9DF3]/30 p-5">
            <AbilityHistory />
          </div>
        ) : null}

        {historyItems.length > 0 ? (
          <section className="app-card bg-[#FFFFFF] p-5">
            <h2 className="text-l2 text-[#3D2E7C]">历史记录</h2>
            <div className="mt-4 space-y-3">
              {historyItems.map((h, idx) => (
                <div
                  key={idx}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-[#D5D6F2] px-4 py-3"
                >
                  <span className="text-l3 font-semibold text-[#3D2E7C]">
                    {h.label}
                  </span>
                  <span className="text-l4 text-[#6353AC]">
                    {formatYmd(h.date)} · 完成 {h.count} 题
                  </span>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  )
}
