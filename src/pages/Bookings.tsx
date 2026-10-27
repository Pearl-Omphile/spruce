import { CalendarDays, Clock, MapPin, Phone } from 'lucide-react'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { Notice, Spinner, StarInput, StatusPill } from '../components/bits'
import { useAuth } from '../context/AuthContext'
import { errorText, niceDate, niceTime, rand } from '../lib/format'
import { supabase } from '../lib/supabase'
import type { Booking, BookingStatus } from '../lib/types'

export default function Bookings() {
  const { user, myCleaner, loading } = useAuth()
  const [params] = useSearchParams()
  const [tab, setTab] = useState<'mine' | 'jobs'>(params.get('tab') === 'jobs' ? 'jobs' : 'mine')

  if (loading) return <div className="mx-auto max-w-4xl px-4"><Spinner /></div>
  if (!user) return <Navigate to="/auth?next=/bookings" replace />

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="text-4xl font-extrabold sm:text-5xl">{tab === 'mine' ? 'My bookings' : 'Jobs for you'}</h1>
      {params.get('booked') && tab === 'mine' && (
        <div className="mt-5"><Notice tone="ok">Booking sent. You'll see it update here when the cleaner responds.</Notice></div>
      )}

      {myCleaner && (
        <div className="mt-6 inline-grid grid-cols-2 rounded-full bg-mist p-1" role="tablist">
          {(['mine', 'jobs'] as const).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${tab === t ? 'bg-white text-ink shadow-sm' : 'text-muted'}`}>
              {t === 'mine' ? 'Cleans I booked' : 'Jobs I was booked for'}
            </button>
          ))}
        </div>
      )}

      {tab === 'mine' || !myCleaner ? <BookingList role="client" userId={user.id} /> : <BookingList role="cleaner" cleanerId={myCleaner.id} />}
    </div>
  )
}

function BookingList({ role, userId, cleanerId }: { role: 'client' | 'cleaner'; userId?: string; cleanerId?: string }) {
  const [items, setItems] = useState<Booking[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const q = supabase
      .from('bookings')
      .select('*, cleaner:cleaners(id, display_name, suburb, city, is_demo), review:reviews(id)')
      .order('scheduled_date', { ascending: false })
    const { data, error } = role === 'client' ? await q.eq('client_id', userId!) : await q.eq('cleaner_id', cleanerId!)
    if (error) return setError(error.message)
    let rows = (data ?? []) as Booking[]
    if (role === 'cleaner' && rows.length) {
      // Cleaners can read the profiles of clients who booked them (see RLS policies)
      const ids = [...new Set(rows.map((r) => r.client_id))]
      const { data: profs } = await supabase.from('profiles').select('id, full_name, phone').in('id', ids)
      rows = rows.map((r) => ({ ...r, client: profs?.find((p) => p.id === r.client_id) ?? null }))
    }
    setItems(rows)
  }, [role, userId, cleanerId])

  useEffect(() => {
    setItems(null)
    void load()
  }, [load])

  if (error) return <div className="mt-6"><Notice tone="error">Couldn't load bookings: {error}</Notice></div>
  if (!items) return <Spinner label="Loading bookings" />

  if (items.length === 0)
    return (
      <div className="mt-8 rounded-3xl border border-dashed border-line p-10 text-center">
        {role === 'client' ? (
          <>
            <p className="font-display text-2xl font-bold">No bookings yet</p>
            <p className="mt-1 text-muted">Find a cleaner near you and your bookings will show up here.</p>
            <Link to="/find" className="btn-primary mt-5">Find a cleaner</Link>
          </>
        ) : (
          <>
            <p className="font-display text-2xl font-bold">No jobs yet</p>
            <p className="mt-1 text-muted">When a client books you, the request appears here for you to accept.</p>
          </>
        )}
      </div>
    )

  return (
    <ul className="mt-8 flex flex-col gap-4">
      {items.map((b) => (
        <BookingRow key={b.id} b={b} role={role} onChanged={load} />
      ))}
    </ul>
  )
}

function BookingRow({ b, role, onChanged }: { b: Booking; role: 'client' | 'cleaner'; onChanged: () => Promise<void> }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reviewing, setReviewing] = useState(false)

  async function setStatus(status: BookingStatus) {
    setBusy(true)
    setError(null)
    const { error } = await supabase.from('bookings').update({ status }).eq('id', b.id)
    if (error) setError(errorText(error))
    else await onChanged()
    setBusy(false)
  }

  const reviewed = (b.review?.length ?? 0) > 0
  const who = role === 'client' ? b.cleaner?.display_name ?? 'Cleaner' : b.client?.full_name || 'Client'

  return (
    <li className="rounded-3xl border border-line bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-bold">
              {role === 'client' && b.cleaner ? <Link to={`/cleaners/${b.cleaner.id}`} className="hover:text-jac-deep">{who}</Link> : who}
            </h2>
            <StatusPill status={b.status} />
          </div>
          <p className="mt-1 font-semibold text-ink-soft">{b.service}</p>
        </div>
        <p className="font-display text-2xl font-extrabold">{rand(b.total_price)}</p>
      </div>

      <dl className="mt-4 grid gap-2 text-sm text-ink-soft sm:grid-cols-2">
        <div className="flex items-center gap-2"><CalendarDays size={16} aria-hidden /><dt className="sr-only">Date</dt><dd>{niceDate(b.scheduled_date)}</dd></div>
        <div className="flex items-center gap-2"><Clock size={16} aria-hidden /><dt className="sr-only">Time</dt><dd>{niceTime(b.start_time)}, {b.hours} hours</dd></div>
        <div className="flex items-center gap-2 sm:col-span-2"><MapPin size={16} aria-hidden /><dt className="sr-only">Address</dt><dd>{b.address}</dd></div>
        {role === 'cleaner' && b.client?.phone && (
          <div className="flex items-center gap-2"><Phone size={16} aria-hidden /><dt className="sr-only">Phone</dt><dd>{b.client.phone}</dd></div>
        )}
      </dl>
      {b.notes && <p className="mt-3 rounded-xl bg-mist px-4 py-3 text-sm text-ink-soft">“{b.notes}”</p>}

      {error && <div className="mt-4"><Notice tone="error">{error}</Notice></div>}

      <div className="mt-5 flex flex-wrap gap-2">
        {role === 'cleaner' && b.status === 'pending' && (
          <>
            <button className="btn-accent !py-2" disabled={busy} onClick={() => setStatus('accepted')}>Accept job</button>
            <button className="btn-ghost !py-2" disabled={busy} onClick={() => setStatus('declined')}>Decline</button>
          </>
        )}
        {b.status === 'accepted' && (
          <button className="btn-primary !py-2" disabled={busy} onClick={() => setStatus('completed')}>Mark as done</button>
        )}
        {role === 'client' && (b.status === 'pending' || b.status === 'accepted') && (
          <button className="btn-ghost !py-2" disabled={busy} onClick={() => confirm('Cancel this booking?') && setStatus('cancelled')}>Cancel booking</button>
        )}
        {role === 'client' && b.status === 'completed' && !reviewed && !reviewing && (
          <button className="btn-accent !py-2" onClick={() => setReviewing(true)}>Rate {who.split(' ')[0]}</button>
        )}
        {role === 'client' && reviewed && <span className="text-sm font-semibold text-ok">Thanks for your rating</span>}
      </div>

      {reviewing && <ReviewForm b={b} onDone={async () => { setReviewing(false); await onChanged() }} onCancel={() => setReviewing(false)} />}
    </li>
  )
}

function ReviewForm({ b, onDone, onCancel }: { b: Booking; onDone: () => Promise<void>; onCancel: () => void }) {
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    const { error } = await supabase.from('reviews').insert({
      booking_id: b.id, client_id: b.client_id, cleaner_id: b.cleaner_id, rating, comment: comment.trim(),
    })
    setBusy(false)
    if (error) return setError(errorText(error))
    await onDone()
  }

  return (
    <form onSubmit={submit} className="mt-5 flex flex-col gap-3 rounded-2xl bg-mist p-5">
      <p className="font-display text-xl font-bold">How was the clean?</p>
      <StarInput value={rating} onChange={setRating} />
      <label className="sr-only" htmlFor={`c-${b.id}`}>Comment</label>
      <textarea id={`c-${b.id}`} className="input min-h-20" maxLength={500} placeholder="What went well? Anything to improve? (optional)"
        value={comment} onChange={(e) => setComment(e.target.value)} />
      {error && <Notice tone="error">{error}</Notice>}
      <div className="flex gap-2">
        <button className="btn-accent !py-2" disabled={busy}>{busy ? 'Posting…' : 'Post rating'}</button>
        <button type="button" className="btn-ghost !py-2" onClick={onCancel}>Not now</button>
      </div>
    </form>
  )
}
