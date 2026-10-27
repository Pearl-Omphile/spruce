import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { Cleaner } from './types'

export interface Busy { cleaner_id: string; start_time: string; hours: number }

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const mins = (t: string) => { const [h, m] = t.split(':').map(Number); return h! * 60 + (m ?? 0) }
const hhmm = (t: string) => t.slice(0, 5)

/** Booked times for one day, for every cleaner (times only, from busy_slots() in the database). */
export function useBusy(date: string) {
  const [busy, setBusy] = useState<Busy[] | null>(null)
  useEffect(() => {
    let alive = true
    setBusy(null)
    supabase.rpc('busy_slots', { day: date }).then(({ data }) => { if (alive) setBusy((data ?? []) as Busy[]) })
    return () => { alive = false }
  }, [date])
  return busy
}

export type Fit = { ok: true } | { ok: false; reason: string }

/**
 * Can this cleaner take a job of `hours` starting at `time` on `date`?
 * Mirrors the checks the database makes when the booking is saved.
 */
export function checkFit(c: Cleaner, date: string, time: string, hours: number, busy: Busy[]): Fit {
  const first = c.display_name.split(' ')[0]
  if (!c.is_available) return { ok: false, reason: `${first} is fully booked for now` }
  const dow = new Date(date + 'T00:00:00').getDay()
  if (!c.work_days.includes(dow)) return { ok: false, reason: `Doesn't work ${DAY_NAMES[dow]}s` }
  const start = mins(time), end = start + hours * 60
  if (start < mins(c.work_start) || end > mins(c.work_end))
    return { ok: false, reason: `Works ${hhmm(c.work_start)} to ${hhmm(c.work_end)}` }
  const clash = busy.find((b) => b.cleaner_id === c.id && start < mins(b.start_time) + b.hours * 60 && mins(b.start_time) < end)
  if (clash) return { ok: false, reason: `Booked from ${hhmm(clash.start_time)} that day` }
  return { ok: true }
}

/** "Mon to Fri, 08:00 to 16:00" style summary of a cleaner's schedule. */
export function scheduleText(c: Pick<Cleaner, 'work_days' | 'work_start' | 'work_end'>) {
  const d = [...c.work_days].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)) // Monday first
  const run = d.length > 1 && d.every((x, i) => i === 0 || (d[i - 1]! + 1) % 7 === x)
  const days = d.length === 7 ? 'Every day' : run ? `${DAY_SHORT[d[0]!]} to ${DAY_SHORT[d[d.length - 1]!]}` : d.map((x) => DAY_SHORT[x]).join(', ')
  return `${days}, ${hhmm(c.work_start)} to ${hhmm(c.work_end)}`
}
