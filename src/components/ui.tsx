import { ChevronLeft, Minus, Plus, Star } from 'lucide-react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { initials } from '../lib/format'
import type { BookingStatus } from '../lib/types'

/** Initials avatar in frosted glass: no stock photos of real people. */
export function Avatar({ name, size = 48 }: { name: string; size?: number }) {
  const hues = ['from-sky/50 to-tide/40', 'from-sand/60 to-sand-deep/30', 'from-sky/40 to-sand/40', 'from-tide/60 to-sky/30']
  const pick = hues[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % hues.length]
  return (
    <div
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-full border border-white/25 bg-gradient-to-br ${pick} font-bold text-shell`}
      style={{ width: size, height: size, fontSize: size * 0.34 }}
    >
      {initials(name)}
    </div>
  )
}

export function Stars({ value, count, size = 14 }: { value: number; count?: number; size?: number }) {
  if (count === 0) return <span className="text-xs font-semibold text-sky">New</span>
  return (
    <span className="inline-flex items-center gap-1 text-sm" aria-label={`Rated ${Number(value).toFixed(1)} out of 5`}>
      <Star size={size} className="fill-warn text-warn" aria-hidden />
      <span className="font-bold">{Number(value).toFixed(1)}</span>
      {count !== undefined && <span className="muted">({count})</span>}
    </span>
  )
}

export function StarInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex gap-1.5" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} star${n > 1 ? 's' : ''}`} onClick={() => onChange(n)}>
          <Star size={32} className={n <= value ? 'fill-warn text-warn' : 'text-white/25'} />
        </button>
      ))}
    </div>
  )
}

const STATUS: Record<BookingStatus, [string, string]> = {
  pending: ['Waiting for cleaner', 'bg-warn/15 text-warn border-warn/30'],
  accepted: ['Confirmed', 'bg-sky/15 text-sky border-sky/30'],
  completed: ['Completed', 'bg-ok/15 text-ok border-ok/30'],
  declined: ['Declined', 'bg-bad/15 text-bad border-bad/30'],
  cancelled: ['Cancelled', 'bg-white/5 text-shell/60 border-white/15'],
}
export function StatusPill({ status }: { status: BookingStatus }) {
  const [label, cls] = STATUS[status]
  return <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-bold ${cls}`}>{label}</span>
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'error' | 'ok'; children: ReactNode }) {
  const cls = { info: 'border-white/15 bg-white/5 text-shell/85', error: 'border-bad/40 bg-bad/10 text-bad', ok: 'border-ok/40 bg-ok/10 text-ok' }[tone]
  return <div role={tone === 'error' ? 'alert' : 'status'} className={`rounded-2xl border px-4 py-3 text-sm ${cls}`}>{children}</div>
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 muted" role="status">
      <span className="size-5 animate-spin rounded-full border-2 border-white/20 border-t-sand" />
      {label}
    </div>
  )
}

/** Screen header with a round glass back button, as in native apps. */
export function TopBar({ title, back = true, right, onBack }: { title?: string; back?: boolean; right?: ReactNode; onBack?: () => void }) {
  const navigate = useNavigate()
  return (
    <header className="sticky top-0 z-[600] -mx-5 mb-2 flex items-center justify-between gap-3 px-5 pb-3 pt-[max(14px,env(safe-area-inset-top))] backdrop-blur-md">
      {back ? (
        <button className="icon-btn" aria-label="Back" onClick={() => (onBack ? onBack() : history.length > 1 ? navigate(-1) : navigate('/'))}>
          <ChevronLeft size={22} />
        </button>
      ) : <span className="size-11" />}
      {title && <h1 className="truncate text-center text-2xl">{title}</h1>}
      {right ?? <span className="size-11" />}
    </header>
  )
}

/** Booking progress dots */
export function Steps({ at, total = 5 }: { at: number; total?: number }) {
  return (
    <div className="mb-6 flex gap-1.5" aria-label={`Step ${at} of ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`h-1.5 flex-1 rounded-full ${i < at ? 'bg-sand' : 'bg-white/15'}`} />
      ))}
    </div>
  )
}

export function Counter({ label, value, min, max, onChange, hint }: { label: string; value: number; min: number; max: number; onChange: (n: number) => void; hint?: string }) {
  return (
    <div className="glass flex items-center justify-between rounded-3xl px-5 py-4">
      <div>
        <p className="font-semibold">{label}</p>
        {hint && <p className="text-xs muted">{hint}</p>}
      </div>
      <div className="flex items-center gap-3">
        <button type="button" className="icon-btn !size-10" aria-label={`Fewer ${label.toLowerCase()}`} disabled={value <= min} onClick={() => onChange(value - 1)}>
          <Minus size={18} />
        </button>
        <span className="w-6 text-center text-lg font-bold" aria-live="polite">{value}</span>
        <button type="button" className="icon-btn !size-10" aria-label={`More ${label.toLowerCase()}`} disabled={value >= max} onClick={() => onChange(value + 1)}>
          <Plus size={18} />
        </button>
      </div>
    </div>
  )
}

/** Sticky bottom bar for the main action on a step */
export function ActionBar({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-[600] -mx-5 mt-8 px-5 pb-[max(16px,env(safe-area-inset-bottom))] pt-4"
      style={{ background: 'linear-gradient(to top, rgb(7 28 51 / 0.95) 55%, transparent)' }}>
      {children}
    </div>
  )
}
