import { Camera, CircleAlert, LogIn, LogOut, ShieldCheck, X } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { errorText } from '../lib/format'
import { checkInOrOut, usePhotoUrl } from '../lib/photos'
import { supabase } from '../lib/supabase'
import { COMPLAINT_LABELS, type Booking, type Complaint, type ComplaintCategory } from '../lib/types'
import { Notice, StarInput } from './ui'

const timeOf = (iso: string) => new Date(iso).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })

/* ---------- Arrival / departure photos ---------- */

function Thumb({ path, label, onOpen }: { path: string; label: string; onOpen: (url: string) => void }) {
  const url = usePhotoUrl(path)
  return (
    <button type="button" onClick={() => url && onOpen(url)} aria-label={`View ${label} photo`}
      className="size-14 shrink-0 overflow-hidden rounded-2xl border border-white/20 bg-white/5">
      {url ? <img src={url} alt="" className="size-full object-cover" /> : <span className="grid size-full place-items-center"><Camera size={16} className="text-shell/40" /></span>}
    </button>
  )
}

/** Shows when the cleaner arrived and left, with the photo they took each time. */
export function VisitTimeline({ b }: { b: Booking }) {
  const [open, setOpen] = useState<string | null>(null)
  if (!b.checked_in_at) return null
  return (
    <>
      <div className="mt-4 flex flex-col gap-2 rounded-2xl bg-white/5 p-3">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-ok"><ShieldCheck size={14} /> Visit verified with photos</p>
        <div className="flex items-center gap-3">
          {b.checkin_photo && <Thumb path={b.checkin_photo} label="arrival" onOpen={setOpen} />}
          <div className="text-sm"><p className="font-semibold">Arrived {timeOf(b.checked_in_at)}</p><p className="text-xs muted">Photo taken on arrival</p></div>
        </div>
        {b.checked_out_at && (
          <div className="flex items-center gap-3">
            {b.checkout_photo && <Thumb path={b.checkout_photo} label="departure" onOpen={setOpen} />}
            <div className="text-sm"><p className="font-semibold">Left {timeOf(b.checked_out_at)}</p><p className="text-xs muted">Photo taken when leaving</p></div>
          </div>
        )}
      </div>
      {open && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-[900] grid place-items-center bg-black/85 p-4" onClick={() => setOpen(null)}>
          <img src={open} alt="Visit photo" className="max-h-[85dvh] max-w-full rounded-2xl" />
          <button className="icon-btn absolute right-4 top-4" aria-label="Close"><X /></button>
        </div>
      )}
    </>
  )
}

/** Opens the phone camera; the photo is uploaded and recorded as check-in or check-out. */
export function CameraCheck({ b, kind, onDone }: { b: Booking; kind: 'in' | 'out'; onDone: () => Promise<void> }) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function picked(file?: File) {
    if (!file) return
    setBusy(true); setError(null)
    try { await checkInOrOut(b.id, kind, file); await onDone() }
    catch (e) { setError(errorText(e)) }
    finally { setBusy(false); if (input.current) input.current.value = '' }
  }

  return (
    <>
      <input ref={input} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => picked(e.target.files?.[0])} />
      <button className="btn-sand !px-4 !py-2 text-sm" disabled={busy} onClick={() => input.current?.click()}>
        {kind === 'in' ? <LogIn size={16} /> : <LogOut size={16} />}
        {busy ? 'Uploading photo…' : kind === 'in' ? "I've arrived" : 'Finish and check out'}
      </button>
      {error && <div className="mt-3 w-full"><Notice tone="error">{error}</Notice></div>}
    </>
  )
}

/* ---------- Cleaner rates the client ---------- */

export function RateClientForm({ b, onDone, onCancel }: { b: Booking; onDone: () => Promise<void>; onCancel: () => void }) {
  const [stars, setStars] = useState(5)
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true)
    const { error } = await supabase.from('client_reviews').insert({ booking_id: b.id, cleaner_id: b.cleaner_id, client_id: b.client_id, rating: stars, comment: comment.trim() })
    setBusy(false)
    if (error) return setError(errorText(error))
    await onDone()
  }
  return (
    <form onSubmit={submit} className="mt-4 flex flex-col gap-3 rounded-3xl bg-white/5 p-4">
      <p className="serif text-xl">How was this client?</p>
      <p className="-mt-2 text-xs muted">Other cleaners see the average before accepting their jobs. Clients see their own rating, not your comment.</p>
      <StarInput value={stars} onChange={setStars} />
      <textarea className="input min-h-20" maxLength={500} aria-label="Comment" placeholder="Clear instructions? Home as described? (optional)" value={comment} onChange={(e) => setComment(e.target.value)} />
      {error && <Notice tone="error">{error}</Notice>}
      <div className="flex gap-2">
        <button className="btn-sand !py-2.5" disabled={busy}>{busy ? 'Posting…' : 'Post rating'}</button>
        <button type="button" className="btn-glass !py-2.5" onClick={onCancel}>Not now</button>
      </div>
    </form>
  )
}

/* ---------- Complaints ---------- */

const CLIENT_REASONS: ComplaintCategory[] = ['no_show', 'late', 'missing_item', 'damage', 'poor_clean', 'unsafe', 'payment', 'other']
const CLEANER_REASONS: ComplaintCategory[] = ['no_show', 'unsafe', 'payment', 'damage', 'other']

export function ReportProblem({ b, role, onDone, onCancel }: { b: Booking; role: 'client' | 'cleaner'; onDone: () => Promise<void>; onCancel: () => void }) {
  const [category, setCategory] = useState<ComplaintCategory | null>(null)
  const [details, setDetails] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const reasons = role === 'client' ? CLIENT_REASONS : CLEANER_REASONS
  const label = (c: ComplaintCategory) => (role === 'cleaner' && c === 'no_show' ? "Client wasn't home" : role === 'cleaner' && c === 'damage' ? 'Unsafe or damaged equipment' : COMPLAINT_LABELS[c])

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!category) return setError('Choose what went wrong.')
    setBusy(true); setError(null)
    const { error } = await supabase.from('complaints').insert({ booking_id: b.id, category, details: details.trim() })
    setBusy(false)
    if (error) return setError(errorText(error))
    await onDone()
  }

  return (
    <form onSubmit={submit} className="mt-4 flex flex-col gap-3 rounded-3xl border border-bad/30 bg-bad/5 p-4">
      <p className="serif text-xl">Report a problem</p>
      <p className="-mt-2 text-xs muted">Spruce support reads every report{b.checked_in_at ? ' and can check the arrival and departure photos' : ''}. You'll see the outcome here.</p>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="What went wrong">
        {reasons.map((c) => (
          <button type="button" key={c} role="radio" aria-checked={category === c} onClick={() => setCategory(c)}
            className={`chip !py-1.5 text-xs ${category === c ? 'chip-on' : 'chip-off'}`}>{label(c)}</button>
        ))}
      </div>
      <textarea className="input min-h-24" required minLength={10} maxLength={1500} aria-label="What happened"
        placeholder="What happened? Include times and any details that help." value={details} onChange={(e) => setDetails(e.target.value)} />
      {error && <Notice tone="error">{error}</Notice>}
      <div className="flex gap-2">
        <button className="btn-sand !py-2.5" disabled={busy}>{busy ? 'Sending…' : 'Send report'}</button>
        <button type="button" className="btn-glass !py-2.5" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}

export function ComplaintStatus({ c }: { c: Complaint }) {
  return (
    <div className={`mt-4 rounded-2xl border p-3 text-sm ${c.status === 'open' ? 'border-warn/30 bg-warn/10' : 'border-ok/30 bg-ok/10'}`}>
      <p className="flex items-center gap-1.5 font-semibold"><CircleAlert size={15} /> {COMPLAINT_LABELS[c.category]}: {c.status === 'open' ? 'reported, under review' : 'resolved'}</p>
      {c.admin_note && <p className="mt-1 text-shell/85">Spruce support: {c.admin_note}</p>}
    </div>
  )
}
