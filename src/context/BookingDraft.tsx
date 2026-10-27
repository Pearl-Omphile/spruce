import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { todayISO } from '../lib/format'

export interface Draft {
  service: string | null
  bedrooms: number
  bathrooms: number
  addons: string[]
  date: string
  time: string
  address: string
  city: string
  coords: [number, number] | null
  notes: string
  cleanerId: string | null
}

const fresh = (): Draft => ({
  service: null, bedrooms: 2, bathrooms: 1, addons: [], date: todayISO(1), time: '09:00',
  address: '', city: 'Johannesburg', coords: null, notes: '', cleanerId: null,
})

const KEY = 'spruce-draft'
const load = (): Draft => {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (raw) return { ...fresh(), ...JSON.parse(raw) }
  } catch { /* storage unavailable */ }
  return fresh()
}

interface Ctx { draft: Draft; set: (patch: Partial<Draft>) => void; reset: () => void }
const DraftContext = createContext<Ctx | null>(null)

/** The booking in progress. Kept in sessionStorage so signing in mid-flow doesn't lose it. */
export function BookingDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<Draft>(load)
  useEffect(() => {
    try { sessionStorage.setItem(KEY, JSON.stringify(draft)) } catch { /* ignore */ }
  }, [draft])
  return (
    <DraftContext.Provider value={{ draft, set: (p) => setDraft((d) => ({ ...d, ...p })), reset: () => setDraft(fresh()) }}>
      {children}
    </DraftContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useDraft() {
  const ctx = useContext(DraftContext)
  if (!ctx) throw new Error('useDraft must be used inside BookingDraftProvider')
  return ctx
}
