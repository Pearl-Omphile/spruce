import { Mail, Phone } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Avatar, Notice, Spinner, StatusPill, TopBar } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { scheduleText } from '../lib/availability'
import { serviceById } from '../lib/catalog'
import { errorText, niceDate, niceTime, rand, todayISO } from '../lib/format'
import { supabase } from '../lib/supabase'
import { COMPLAINT_LABELS, type Booking, type Cleaner, type Complaint } from '../lib/types'
import { VisitTimeline } from '../components/Trust'

interface Person { id: string; email: string; full_name: string | null; phone: string | null; joined_at: string; cleaner_id: string | null; bookings_made: number }

export const ADMIN_SEEN_KEY = 'spruce-admin-seen'
export const lastSeen = () => { try { return localStorage.getItem(ADMIN_SEEN_KEY) ?? '1970-01-01' } catch { return '1970-01-01' } }
const joined = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : '')

export default function Admin() {
  const { user, profile, loading } = useAuth()
  const [tab, setTab] = useState<'complaints' | 'cleaners' | 'people' | 'bookings'>('cleaners')
  const [showDemo, setShowDemo] = useState(false)
  const [people, setPeople] = useState<Person[] | null>(null)
  const [cleaners, setCleaners] = useState<Cleaner[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [error, setError] = useState<string | null>(null)
  // Remember when you last looked, so new sign-ups get a "New" badge
  const [seen] = useState(lastSeen)

  const load = useCallback(async () => {
    const [p, c, b, k] = await Promise.all([
      supabase.rpc('admin_people'),
      supabase.from('cleaners').select('*').order('created_at', { ascending: false }),
      supabase.from('bookings').select('*, cleaner:cleaners(id, display_name, suburb, city, is_demo)').order('created_at', { ascending: false }).limit(200),
      supabase.from('complaints').select('*').order('created_at', { ascending: false }),
    ])
    if (p.error) return setError(p.error.message)
    setPeople(p.data as Person[])
    setCleaners((c.data ?? []) as Cleaner[])
    setBookings((b.data ?? []) as Booking[])
    // Open reports first, newest first within each group
    const ks = ((k.data ?? []) as Complaint[]).sort((x, y) => Number(x.status !== 'open') - Number(y.status !== 'open'))
    setComplaints(ks)
    if (ks.some((x) => x.status === 'open')) setTab((t) => (t === 'cleaners' ? 'complaints' : t))
  }, [])

  const isAdmin = !!profile?.is_admin
  useEffect(() => { if (isAdmin) void load() }, [isAdmin, load])
  useEffect(() => () => { try { localStorage.setItem(ADMIN_SEEN_KEY, new Date().toISOString()) } catch { /* ignore */ } }, [])

  const byId = useMemo(() => new Map((people ?? []).map((p) => [p.id, p])), [people])

  if (loading) return <Spinner />
  if (!user) return <Navigate to="/auth?next=/admin" replace />
  if (!isAdmin) return <><TopBar title="Admin" /><div className="mt-6"><Notice>This area is for the Spruce owner only.</Notice></div></>
  if (error) return <><TopBar title="Admin" /><div className="mt-6"><Notice tone="error">{error}</Notice></div></>
  if (!people) return <><TopBar title="Admin" /><Spinner /></>

  const real = cleaners.filter((c) => !c.is_demo)
  const shownCleaners = showDemo ? cleaners : real
  const newCleaners = real.filter((c) => (c.created_at ?? '') > seen).length
  const newPeople = people.filter((p) => p.joined_at > seen).length
  const week = todayISO(-7)
  const recent = bookings.filter((b) => b.created_at.slice(0, 10) >= week)
  const openCount = complaints.filter((x) => x.status === 'open').length
  const bookingById = new Map(bookings.map((x) => [x.id, x]))
  const value = bookings.filter((b) => b.status === 'accepted' || b.status === 'completed').reduce((t, b) => t + b.total_price, 0)

  async function toggle(c: Cleaner) {
    const { error } = await supabase.from('cleaners').update({ is_available: !c.is_available }).eq('id', c.id)
    if (error) return setError(errorText(error))
    await load()
  }

  return (
    <>
      <TopBar title="Admin" />
      <div className="grid grid-cols-2 gap-3">
        <Stat n={real.length} label="Real cleaners" badge={newCleaners} />
        <Stat n={people.length} label="People signed up" badge={newPeople} />
        <Stat n={recent.length} label="Bookings in 7 days" />
        <Stat n={rand(value)} label="Booked value" />
      </div>
      {openCount > 0 && <button onClick={() => setTab('complaints')} className="mt-3 w-full"><Notice tone="error">{openCount} open complaint{openCount > 1 ? 's' : ''} waiting for you</Notice></button>}

      <div className="glass mt-6 flex rounded-full p-1" role="tablist">
        {([['complaints', openCount ? `Reports (${openCount})` : 'Reports'], ['cleaners', 'Cleaners'], ['people', 'People'], ['bookings', 'Bookings']] as const).map(([v, l]) => (
          <button key={v} role="tab" aria-selected={tab === v} onClick={() => setTab(v)}
            className={`flex-1 rounded-full py-2.5 text-[13px] font-bold transition ${tab === v ? 'bg-sand text-deep' : 'text-shell/70'}`}>{l}</button>
        ))}
      </div>

      {tab === 'complaints' && (complaints.length === 0 ? <Empty title="No reports" text="When a client or cleaner reports a problem, it lands here with the booking and its photos." /> : (
        <ul className="mt-4 flex flex-col gap-3">
          {complaints.map((k) => (
            <ComplaintCard key={k.id} k={k} b={bookingById.get(k.booking_id)} who={byId.get(k.raised_by)} onSaved={load} onError={setError} />
          ))}
        </ul>
      ))}

      {tab === 'cleaners' && (
        <>
          <label className="mt-4 flex items-center gap-2 text-sm muted">
            <input type="checkbox" className="accent-[#E8D5B5]" checked={showDemo} onChange={(e) => setShowDemo(e.target.checked)} /> Show the 15 demo cleaners too
          </label>
          {shownCleaners.length === 0 ? (
            <Empty title="No real cleaners yet" text="When someone creates a cleaner profile, they'll show up here first, marked New." />
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {shownCleaners.map((c) => {
                const owner = c.user_id ? byId.get(c.user_id) : undefined
                const isNew = !c.is_demo && (c.created_at ?? '') > seen
                return (
                  <li key={c.id} className={`glass rounded-[26px] p-4 ${isNew ? '!border-sand/60' : ''}`}>
                    <div className="flex items-start gap-3">
                      <Avatar name={c.display_name} size={46} />
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-2 font-bold">
                          {c.display_name}
                          {isNew && <Badge tone="sand">New</Badge>}
                          {c.is_demo && <Badge>Demo</Badge>}
                          {!c.is_available && <Badge tone="warn">Paused</Badge>}
                        </p>
                        <p className="text-xs muted">{c.suburb}, {c.city}. {rand(c.hourly_rate)}/hr. Joined {joined(c.created_at)}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-col gap-1 text-sm text-shell/80">
                      {owner && <p className="flex items-center gap-2"><Mail size={14} className="text-sand" /> <a href={`mailto:${owner.email}`} className="truncate hover:underline">{owner.email}</a></p>}
                      {owner?.phone && <p className="flex items-center gap-2"><Phone size={14} className="text-sand" /> {owner.phone}</p>}
                      <p className="muted">{c.services.map((s) => serviceById(s)?.name ?? s).join(', ')}</p>
                      <p className="muted">{scheduleText(c)}</p>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Link to={`/cleaners/${c.id}`} className="btn-glass !px-4 !py-2 text-sm">View profile</Link>
                      <button onClick={() => toggle(c)} className="btn-glass !px-4 !py-2 text-sm">{c.is_available ? 'Pause listing' : 'Resume listing'}</button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}

      {tab === 'people' && (
        <ul className="mt-4 flex flex-col gap-2.5">
          {people.map((p) => (
            <li key={p.id} className="glass flex items-center gap-3 rounded-3xl p-4">
              <Avatar name={p.full_name || p.email} size={40} />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 font-semibold">
                  {p.full_name || 'No name yet'}
                  {p.joined_at > seen && <Badge tone="sand">New</Badge>}
                  {p.cleaner_id && <Badge>Cleaner</Badge>}
                  {p.id === user.id && <Badge>You</Badge>}
                </p>
                <a href={`mailto:${p.email}`} className="block truncate text-sm muted hover:underline">{p.email}</a>
                <p className="text-xs muted">Joined {joined(p.joined_at)}. {p.bookings_made} booking{p.bookings_made === 1 ? '' : 's'} made</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {tab === 'bookings' && (bookings.length === 0 ? <Empty title="No bookings yet" text="Every booking made on Spruce shows up here." /> : (
        <ul className="mt-4 flex flex-col gap-2.5">
          {bookings.map((b) => (
            <li key={b.id} className="glass rounded-3xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">{serviceById(b.service)?.name ?? b.service}, {b.hours} hrs</p>
                  <p className="text-sm muted">{byId.get(b.client_id)?.full_name || byId.get(b.client_id)?.email || 'Client'} booked {b.cleaner?.display_name}</p>
                  <p className="text-xs muted">{niceDate(b.scheduled_date)} at {niceTime(b.start_time)}, {b.address}</p>
                  {b.checked_in_at && <p className="text-xs text-ok">Checked in{b.checked_out_at ? ' and out' : ''} with photos</p>}
                </div>
                <div className="shrink-0 text-right"><p className="font-bold text-sand">{rand(b.total_price)}</p><div className="mt-1"><StatusPill status={b.status} /></div></div>
              </div>
            </li>
          ))}
        </ul>
      ))}
    </>
  )
}

function ComplaintCard({ k, b, who, onSaved, onError }: { k: Complaint; b?: Booking; who?: Person; onSaved: () => Promise<void>; onError: (e: string) => void }) {
  const [note, setNote] = useState(k.admin_note)
  const [busy, setBusy] = useState(false)
  async function save(status: 'open' | 'resolved') {
    setBusy(true)
    const { error } = await supabase.from('complaints').update({ status, admin_note: note.trim() }).eq('id', k.id)
    setBusy(false)
    if (error) return onError(errorText(error))
    await onSaved()
  }
  return (
    <li className={`glass rounded-[26px] p-4 ${k.status === 'open' ? '!border-bad/50' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold">{COMPLAINT_LABELS[k.category]}</p>
          <p className="text-xs muted">From the {k.raised_as}, {who?.full_name || who?.email || 'unknown'}, {joined(k.created_at)}</p>
        </div>
        <Badge tone={k.status === 'open' ? 'warn' : undefined}>{k.status === 'open' ? 'Open' : 'Resolved'}</Badge>
      </div>
      <p className="mt-3 rounded-2xl bg-white/5 px-3 py-2 text-sm">{k.details}</p>
      {b && (
        <p className="mt-3 text-xs muted">
          Booking: {serviceById(b.service)?.name ?? b.service} with {b.cleaner?.display_name}, {niceDate(b.scheduled_date)} at {niceTime(b.start_time)}, {rand(b.total_price)}
        </p>
      )}
      {b && <VisitTimeline b={b} />}
      {who && <a href={`mailto:${who.email}?subject=${encodeURIComponent('Your Spruce report')}`} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-sand"><Mail size={14} /> Email {who.full_name?.split(' ')[0] || 'them'}</a>}
      <textarea className="input mt-3 min-h-20 text-sm" maxLength={1000} aria-label="Note to the person who reported" placeholder="Note they will see, e.g. what you did about it" value={note} onChange={(e) => setNote(e.target.value)} />
      <div className="mt-3 flex gap-2">
        {k.status === 'open'
          ? <button className="btn-sand !px-4 !py-2 text-sm" disabled={busy} onClick={() => save('resolved')}>Mark resolved</button>
          : <button className="btn-glass !px-4 !py-2 text-sm" disabled={busy} onClick={() => save('open')}>Reopen</button>}
        <button className="btn-glass !px-4 !py-2 text-sm" disabled={busy || note === k.admin_note} onClick={() => save(k.status)}>Save note</button>
      </div>
    </li>
  )
}

function Stat({ n, label, badge }: { n: number | string; label: string; badge?: number }) {
  return (
    <div className="glass relative rounded-3xl p-4">
      <p className="serif text-3xl">{n}</p>
      <p className="text-xs muted">{label}</p>
      {!!badge && <span className="absolute right-3 top-3 rounded-full bg-sand px-2 py-0.5 text-[11px] font-bold text-deep">+{badge} new</span>}
    </div>
  )
}

function Badge({ children, tone }: { children: React.ReactNode; tone?: 'sand' | 'warn' }) {
  const cls = tone === 'sand' ? 'bg-sand text-deep' : tone === 'warn' ? 'bg-warn/20 text-warn' : 'bg-white/10 text-shell/75'
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${cls}`}>{children}</span>
}

function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="glass mt-4 rounded-3xl p-6 text-center">
      <p className="serif text-xl">{title}</p>
      <p className="mt-1 text-sm muted">{text}</p>
    </div>
  )
}
