import { CalendarDays, MapPin, Phone, Star } from 'lucide-react'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Avatar, Notice, Spinner, StarInput, StatusPill, TopBar } from '../components/ui'
import { CameraCheck, ComplaintStatus, RateClientForm, ReportProblem, VisitTimeline } from '../components/Trust'
import { useAuth } from '../context/AuthContext'
import { addonById, serviceById } from '../lib/catalog'
import { errorText, niceDate, niceTime, rand, todayISO } from '../lib/format'
import { supabase } from '../lib/supabase'
import type { Booking, BookingStatus } from '../lib/types'

type Role = 'client' | 'cleaner'

function useBookings(role: Role, id: string | undefined) {
  const [items, setItems] = useState<Booking[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const load = useCallback(async () => {
    if (!id) return
    const q = supabase.from('bookings')
      .select('*, cleaner:cleaners(id, display_name, suburb, city, is_demo), review:reviews(id), client_review:client_reviews(id), complaints(*)')
      .order('scheduled_date', { ascending: true })
    const { data, error } = await q.eq(role === 'client' ? 'client_id' : 'cleaner_id', id)
    if (error) return setError(error.message)
    let rows = (data ?? []) as Booking[]
    if (role === 'cleaner' && rows.length) {
      // Cleaners may read the profiles of clients who booked them (RLS)
      const { data: profs } = await supabase.from('profiles').select('id, full_name, phone, client_rating_avg, client_rating_count').in('id', [...new Set(rows.map((r) => r.client_id))])
      rows = rows.map((r) => ({ ...r, client: profs?.find((p) => p.id === r.client_id) ?? null }))
    }
    setItems(rows)
  }, [role, id])
  useEffect(() => { void load() }, [load])
  return { items, error, reload: load }
}

/** Client: the cleans I booked */
export default function Bookings() {
  const { user, loading } = useAuth()
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming')
  const { items, error, reload } = useBookings('client', user?.id)

  if (loading) return <Spinner />
  if (!user) return (
    <div className="pt-[max(18px,env(safe-area-inset-top))]">
      <h1 className="text-[2rem]">Bookings</h1>
      <div className="glass mt-8 rounded-[32px] p-7 text-center">
        <CalendarDays size={34} className="mx-auto text-sand" />
        <p className="serif mt-4 text-2xl">Your cleans live here</p>
        <p className="mt-2 text-sm muted">Sign in to see bookings, track your cleaner and leave ratings.</p>
        <Link to="/auth?next=/bookings" className="btn-sand mt-6 w-full">Sign in</Link>
      </div>
    </div>
  )

  const today = todayISO()
  const isUpcoming = (b: Booking) => b.scheduled_date >= today && (b.status === 'pending' || b.status === 'accepted')
  const shown = (items ?? []).filter((b) => (tab === 'upcoming' ? isUpcoming(b) : !isUpcoming(b)))
  if (tab === 'past') shown.reverse()

  return (
    <div className="pt-[max(18px,env(safe-area-inset-top))]">
      <h1 className="text-[2rem]">Bookings</h1>
      <Tabs value={tab} onChange={setTab} options={[['upcoming', 'Upcoming'], ['past', 'Past']]} />
      {error ? <div className="mt-5"><Notice tone="error">Couldn't load bookings: {error}</Notice></div> : !items ? <Spinner /> : shown.length === 0 ? (
        <div className="glass mt-6 rounded-[32px] p-7 text-center">
          <p className="serif text-2xl">{tab === 'upcoming' ? 'Nothing booked yet' : 'No past cleans'}</p>
          <p className="mt-2 text-sm muted">{tab === 'upcoming' ? 'Book a clean and it will show up here.' : 'Completed and cancelled cleans show up here.'}</p>
          {tab === 'upcoming' && <Link to="/book" className="btn-sand mt-6 w-full">Book a clean</Link>}
        </div>
      ) : (
        <ul className="mt-5 flex flex-col gap-3">{shown.map((b) => <BookingCard key={b.id} b={b} role="client" onChanged={reload} />)}</ul>
      )}
    </div>
  )
}

/** Cleaner: jobs I was booked for */
export function Jobs() {
  const { user, myCleaner, loading } = useAuth()
  const [tab, setTab] = useState<'new' | 'upcoming' | 'done'>('new')
  const { items, error, reload } = useBookings('cleaner', myCleaner?.id)
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/auth?next=/jobs" replace />
  if (!myCleaner) return <Navigate to="/profile/cleaner" replace />

  const pick = (b: Booking) => (b.status === 'pending' ? 'new' : b.status === 'accepted' ? 'upcoming' : 'done')
  const shown = (items ?? []).filter((b) => pick(b) === tab)
  const count = (t: string) => (items ?? []).filter((b) => pick(b) === t).length

  return (
    <>
      <TopBar title="My jobs" />
      <Tabs value={tab} onChange={setTab} options={[['new', `Requests${count('new') ? ` (${count('new')})` : ''}`], ['upcoming', 'Upcoming'], ['done', 'History']]} />
      {error ? <div className="mt-5"><Notice tone="error">{error}</Notice></div> : !items ? <Spinner /> : shown.length === 0 ? (
        <div className="glass mt-6 rounded-[32px] p-7 text-center">
          <p className="serif text-2xl">{tab === 'new' ? 'No new requests' : tab === 'upcoming' ? 'No upcoming jobs' : 'No history yet'}</p>
          <p className="mt-2 text-sm muted">When clients book you, requests appear here for you to accept.</p>
        </div>
      ) : (
        <ul className="mt-5 flex flex-col gap-3">{shown.map((b) => <BookingCard key={b.id} b={b} role="cleaner" onChanged={reload} />)}</ul>
      )}
    </>
  )
}

function Tabs<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: [T, string][] }) {
  return (
    <div className="glass mt-5 flex rounded-full p-1" role="tablist">
      {options.map(([v, label]) => (
        <button key={v} role="tab" aria-selected={value === v} onClick={() => onChange(v)}
          className={`flex-1 rounded-full py-2.5 text-sm font-bold transition ${value === v ? 'bg-sand text-deep' : 'text-shell/70'}`}>{label}</button>
      ))}
    </div>
  )
}

function BookingCard({ b, role, onChanged }: { b: Booking; role: Role; onChanged: () => Promise<void> }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [panel, setPanel] = useState<'rate' | 'rateClient' | 'report' | null>(null)
  const svc = serviceById(b.service)
  const who = role === 'client' ? b.cleaner?.display_name ?? 'Cleaner' : b.client?.full_name || 'Client'
  const first = who.split(' ')[0]
  const reviewed = (b.review?.length ?? 0) > 0
  const ratedClient = (b.client_review?.length ?? 0) > 0
  const mine = (b.complaints ?? [])[0]
  const isDemo = !!b.cleaner?.is_demo
  const done = async () => { setPanel(null); await onChanged() }

  async function setStatus(status: BookingStatus) {
    setBusy(true); setError(null)
    const { error } = await supabase.from('bookings').update({ status }).eq('id', b.id)
    if (error) setError(errorText(error)); else await onChanged()
    setBusy(false)
  }

  return (
    <li className="glass rounded-[28px] p-5">
      <div className="flex items-start gap-3">
        <Avatar name={who} size={46} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">{svc?.name ?? b.service} {role === 'client' ? 'with' : 'for'} {who}</p>
          <p className="text-sm muted">{niceDate(b.scheduled_date)} at {niceTime(b.start_time)}, {b.hours} hrs</p>
          {role === 'cleaner' && (
            <p className="mt-0.5 flex items-center gap-1 text-xs">
              {b.client?.client_rating_count
                ? <><Star size={12} className="fill-warn text-warn" /><b>{Number(b.client.client_rating_avg).toFixed(1)}</b><span className="muted">client rating ({b.client.client_rating_count})</span></>
                : <span className="muted">New client, no ratings yet</span>}
            </p>
          )}
        </div>
        <StatusPill status={b.status} />
      </div>

      <div className="mt-4 flex flex-col gap-1.5 text-sm text-shell/80">
        <p className="flex gap-2"><MapPin size={15} className="mt-0.5 shrink-0 text-sand" /> {b.address}</p>
        {role === 'cleaner' && b.client?.phone && <p className="flex gap-2"><Phone size={15} className="mt-0.5 text-sand" /> {b.client.phone}</p>}
        <p className="muted">{b.bedrooms} rooms, {b.bathrooms} bath{b.addons.length ? `, plus ${b.addons.map((a) => addonById(a)?.name.toLowerCase()).join(', ')}` : ''}</p>
        {b.notes && <p className="mt-1 rounded-2xl bg-white/5 px-3 py-2">“{b.notes}”</p>}
      </div>

      <VisitTimeline b={b} />
      {role === 'cleaner' && b.status === 'accepted' && !b.checked_in_at && (
        <p className="mt-3 text-xs muted">When you arrive, tap “I've arrived” and take a photo at the door. You'll take another when you leave. This protects you and the client.</p>
      )}
      {mine && <ComplaintStatus c={mine} />}

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
        <span className="text-lg font-bold text-sand">{rand(b.total_price)}</span>
        <div className="flex flex-wrap justify-end gap-2">
          {role === 'cleaner' && b.status === 'pending' && <>
            <button className="btn-glass !px-4 !py-2 text-sm" disabled={busy} onClick={() => setStatus('declined')}>Decline</button>
            <button className="btn-sand !px-4 !py-2 text-sm" disabled={busy} onClick={() => setStatus('accepted')}>Accept</button>
          </>}
          {role === 'cleaner' && b.status === 'accepted' && <CameraCheck b={b} kind={b.checked_in_at ? 'out' : 'in'} onDone={onChanged} />}
          {role === 'cleaner' && b.status === 'completed' && !ratedClient && panel !== 'rateClient' && (
            <button className="btn-sand !px-4 !py-2 text-sm" onClick={() => setPanel('rateClient')}>Rate {first}</button>
          )}
          {role === 'client' && (b.status === 'pending' || b.status === 'accepted') && !b.checked_in_at && (
            <button className="btn-glass !px-4 !py-2 text-sm" disabled={busy} onClick={() => confirm('Cancel this booking?') && setStatus('cancelled')}>Cancel</button>
          )}
          {/* Demo cleaners can't check out, so the client can close those jobs themselves */}
          {role === 'client' && b.status === 'accepted' && (isDemo || b.checked_in_at) && (
            <button className="btn-sand !px-4 !py-2 text-sm" disabled={busy} onClick={() => setStatus('completed')}>Mark done</button>
          )}
          {role === 'client' && b.status === 'completed' && !reviewed && panel !== 'rate' && (
            <button className="btn-sand !px-4 !py-2 text-sm" onClick={() => setPanel('rate')}>Rate {first}</button>
          )}
          {role === 'client' && reviewed && <span className="text-sm font-semibold text-ok">Rated, thank you</span>}
          {role === 'cleaner' && ratedClient && <span className="text-sm font-semibold text-ok">Client rated</span>}
        </div>
      </div>

      {!mine && b.status !== 'pending' && b.status !== 'declined' && panel !== 'report' && (
        <button className="mt-3 text-xs font-semibold text-shell/60 underline-offset-4 hover:text-bad hover:underline" onClick={() => setPanel('report')}>Report a problem</button>
      )}

      {error && <div className="mt-3"><Notice tone="error">{error}</Notice></div>}
      {panel === 'rate' && <RateForm b={b} onDone={done} onCancel={() => setPanel(null)} />}
      {panel === 'rateClient' && <RateClientForm b={b} onDone={done} onCancel={() => setPanel(null)} />}
      {panel === 'report' && <ReportProblem b={b} role={role} onDone={done} onCancel={() => setPanel(null)} />}
    </li>
  )
}

function RateForm({ b, onDone, onCancel }: { b: Booking; onDone: () => Promise<void>; onCancel: () => void }) {
  const [stars, setStars] = useState(5)
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true)
    const { error } = await supabase.from('reviews').insert({ booking_id: b.id, client_id: b.client_id, cleaner_id: b.cleaner_id, rating: stars, comment: comment.trim() })
    setBusy(false)
    if (error) return setError(errorText(error))
    await onDone()
  }
  return (
    <form onSubmit={submit} className="mt-4 flex flex-col gap-3 rounded-3xl bg-white/5 p-4">
      <p className="serif text-xl">How was the clean?</p>
      <StarInput value={stars} onChange={setStars} />
      <label className="sr-only" htmlFor={`c-${b.id}`}>Comment</label>
      <textarea id={`c-${b.id}`} className="input min-h-20" maxLength={500} placeholder="What went well? (optional)" value={comment} onChange={(e) => setComment(e.target.value)} />
      {error && <Notice tone="error">{error}</Notice>}
      <div className="flex gap-2">
        <button className="btn-sand !py-2.5" disabled={busy}>{busy ? 'Posting…' : 'Post rating'}</button>
        <button type="button" className="btn-glass !py-2.5" onClick={onCancel}>Not now</button>
      </div>
    </form>
  )
}
