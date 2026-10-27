import { Star } from 'lucide-react'
import type { ReactNode } from 'react'
import { initials } from '../lib/format'
import type { BookingStatus } from '../lib/types'

/** Avatar made from initials: no stock photos of real people. */
export function Avatar({ name, size = 48 }: { name: string; size?: number }) {
  // Pick one of a few jacaranda tints from the name so avatars vary but stay on-palette
  const tints = ['#E4DAFB', '#D7CCF4', '#EDE4FF', '#CFC2F2']
  const tint = tints[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % tints.length]
  return (
    <div
      aria-hidden
      className="grid shrink-0 place-items-center rounded-full font-display font-bold text-ink"
      style={{ width: size, height: size, background: tint, fontSize: size * 0.36 }}
    >
      {initials(name)}
    </div>
  )
}

export function Stars({ value, count, size = 16 }: { value: number; count?: number; size?: number }) {
  if (count === 0) return <span className="text-sm text-muted">New on Spruce</span>
  return (
    <span className="inline-flex items-center gap-1 text-sm" aria-label={`Rated ${value} out of 5`}>
      <Star size={size} className="fill-sun text-sun" aria-hidden />
      <span className="font-semibold">{Number(value).toFixed(1)}</span>
      {count !== undefined && <span className="text-muted">({count})</span>}
    </span>
  )
}

/** Clickable 1–5 star input. */
export function StarInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          onClick={() => onChange(n)}
          className="p-0.5"
        >
          <Star size={28} className={n <= value ? 'fill-sun text-sun' : 'text-line'} />
        </button>
      ))}
    </div>
  )
}

const STATUS_STYLE: Record<BookingStatus, string> = {
  pending: 'bg-amber-50 text-warn ring-amber-200',
  accepted: 'bg-bloom text-jac-deep ring-jac/30',
  completed: 'bg-emerald-50 text-ok ring-emerald-200',
  declined: 'bg-rose-50 text-bad ring-rose-200',
  cancelled: 'bg-mist text-muted ring-line',
}
const STATUS_LABEL: Record<BookingStatus, string> = {
  pending: 'Waiting for cleaner',
  accepted: 'Confirmed',
  completed: 'Completed',
  declined: 'Declined',
  cancelled: 'Cancelled',
}

export function StatusPill({ status }: { status: BookingStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${STATUS_STYLE[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  )
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'error' | 'ok'; children: ReactNode }) {
  const cls = {
    info: 'bg-mist text-ink-soft border-line',
    error: 'bg-rose-50 text-bad border-rose-200',
    ok: 'bg-emerald-50 text-ok border-emerald-200',
  }[tone]
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`rounded-xl border px-4 py-3 text-sm ${cls}`}>
      {children}
    </div>
  )
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 py-10 text-muted" role="status">
      <span className="size-5 animate-spin rounded-full border-2 border-bloom border-t-jac" />
      {label}
    </div>
  )
}
