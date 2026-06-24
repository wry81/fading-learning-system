import { create } from 'zustand'

import type { Participant, StudyCondition } from '../types'

type ParticipantStore = {
  participants: Participant[]
  getAllParticipants: () => Participant[]
  getParticipant: (id: string) => Participant | null
  createParticipant: (id: string) => Participant
  saveParticipant: (participant: Participant) => void
  exportAllData: () => void
}

const nowIso = () => new Date().toISOString()

export function detectCondition(id: string): StudyCondition {
  const prefix = id.trim().charAt(0).toUpperCase()
  if (prefix === 'A') return 'fading'
  if (prefix === 'B') return 'fixed'
  if (prefix === 'C') return 'no_ai'
  return 'fading'
}

export const useParticipantStore = create<ParticipantStore>((set, get) => ({
  participants: [],

  getAllParticipants: () => get().participants,

  getParticipant: (id: string) => {
    const trimmed = id.trim()
    return get().participants.find((p) => p.id === trimmed) ?? null
  },

  createParticipant: (id: string) => {
    const trimmed = id.trim()
    const existing = get().participants.find((p) => p.id === trimmed)
    if (existing) return existing

    const p: Participant = {
      id: trimmed,
      condition: detectCondition(trimmed),
      createdAt: nowIso(),
      sessions: [],
    }

    set((state) => ({ participants: [p, ...state.participants] }))
    return p
  },

  saveParticipant: (participant: Participant) => {
    set((state) => ({
      participants: state.participants.some((p) => p.id === participant.id)
        ? state.participants.map((p) => (p.id === participant.id ? participant : p))
        : [participant, ...state.participants],
    }))
  },

  exportAllData: () => {
    const payload = {
      exportedAt: nowIso(),
      participants: get().participants,
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `fading-learning-system_export_${payload.exportedAt}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  },
}))

