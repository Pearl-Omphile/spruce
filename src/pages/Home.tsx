import { ArrowRight, Bell, CalendarClock, Search, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Avatar, Stars, StatusPill } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useDraft } from '../context/BookingDraft'
import { SERVICE_LIST, serviceById } from '../lib/catalog'
import { greeting, niceDate, niceTime, rand } from '../lib/format'
import { useCleaners } from '../lib/hooks'
import { supabase } from '../lib/supabase'
import type { Booking } from '../lib/types'
import { WELCOME_KEY } from './Welcome'

const seenWelcome = () => {
  try { return localStorage.getItem(WELCOME_KEY) === '1' } catch { return true }
}

export default function Home() {
  const { user, profile } = useAuth()
  const { set, reset } = useDraft()
  const { cleaners } = useCleaners()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [next, setNext] = useState<Booking | null>(null)

  useEffect(() => {
    if (!user) return
    supabase.from('bookings')
      .select('*, cleaner:cleaners(id, display_name, suburb, city, is_demo)')
      .eq('client_id', user.id).in('status', ['pending', 'accepted'])
      .gte('scheduled_date', new Date().toISOString().slice(0, 10))
      .order('scheduled_date').limit(1)
      .then(({ data }) => setNext((data?.[0] as Booking) ?? null))
  }, [user])

  if (!seenWelcome()) return <Navigate to="/welcome" replace />

  const first = profile?.full_name?.split(' ')[0]
  const services = SERVICE_LIST.filter((s) => (s.name + s.blurb).toLowerCase().includes(q.toLowerCase()))
  const top = cleaners.filter((c) => c.rating_count > 0 && c.is_available).slice(0, 6)

  const startBooking = (serviceId?: string) => {
    reset()
    if (serviceId) {
      set({ service: serviceId })
      navigate('/book/details')
    } else navigate('/book')
  }

  return (
    <div className="pt-[max(18px,env(safe-area-inset-top))]">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm muted">{greeting()}{first ? `, ${first}` : ''}</p>
          <h1 className="mt-1 text-[2rem]">Let's refresh your space</h1>
        </div>
        <Link to="/profile" aria-label="Profile">
          {first ? <Avatar name={profile!.full_name} size={46} /> : <span className="icon-btn"><Bell size={19} /></span>}
        </Link>
      </header>

      <label className="glass mt-6 flex items-center gap-3 rounded-full px-5 py-3.5">
        <Search size={18} className="text-shell/60" aria-hidden />
        <span className="sr-only">Search services</span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="What do you need cleaned?"
          className="w-full bg-transparent text-shell placeholder:text-shell/45 focus:outline-none" />
      </label>

      {/* Hero action */}
      <section className="glass relative mt-6 overflow-hidden rounded-[32px] p-6">
        <div aria-hidden className="absolute -right-10 -top-10 size-48 rounded-full bg-gradient-to-br from-sand/45 to-transparent blur-2xl" />
        <div aria-hidden className="glass-strong absolute -right-4 top-6 grid size-28 place-items-center rounded-full">
          <Sparkles size={44} className="text-sand" strokeWidth={1.4} />
        </div>
        <p className="relative text-xs font-bold text-sand">Upfront prices, rated cleaners</p>
        <h2 className="relative mt-2 max-w-[13rem] text-[1.9rem] leading-[1.05]">Book a clean in about a minute</h2>
        <button className="btn-sand relative mt-5 !py-3" onClick={() => startBooking()}>
          Book a clean <ArrowRight size={17} />
        </button>
      </section>

      {next && (
        <Link to="/bookings" className="glass mt-4 flex items-center gap-4 rounded-3xl p-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-sky/15 text-sky"><CalendarClock size={22} /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold">{serviceById(next.service)?.name ?? next.service} with {next.cleaner?.display_name}</span>
            <span className="block text-sm muted">{niceDate(next.scheduled_date)} at {niceTime(next.start_time)}</span>
          </span>
          <StatusPill status={next.status} />
        </Link>
      )}

      <section className="mt-8">
        <div className="flex items-baseline justify-between">
          <h2 className="text-2xl">Services</h2>
          <span className="text-xs muted">Tap to book</span>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {services.map((s) => (
            <button key={s.id} onClick={() => startBooking(s.id)}
              className="glass flex flex-col items-center gap-2.5 rounded-3xl px-2 py-4 text-center transition active:scale-95 hover:border-white/30">
              <span className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-sand/30 to-sky/10 text-sand">
                <s.icon size={22} strokeWidth={1.7} />
              </span>
              <span className="text-[13px] font-semibold leading-tight">{s.name}</span>
            </button>
          ))}
          {services.length === 0 && <p className="col-span-3 text-sm muted">No service matches “{q}”. Try “deep”, “windows” or “laundry”.</p>}
        </div>
      </section>

      {top.length > 0 && (
        <section className="mt-9">
          <div className="flex items-baseline justify-between">
            <h2 className="text-2xl">Top rated cleaners</h2>
            <Link to="/explore" className="text-sm font-semibold text-sand">See all</Link>
          </div>
          <div className="no-scrollbar -mx-5 mt-4 flex snap-x gap-3 overflow-x-auto px-5 pb-2">
            {top.map((c) => (
              <Link key={c.id} to={`/cleaners/${c.id}`} className="glass w-44 shrink-0 snap-start rounded-3xl p-4">
                <Avatar name={c.display_name} size={52} />
                <p className="mt-3 font-bold">{c.display_name}</p>
                <p className="text-xs muted">{c.suburb}, {c.city}</p>
                <div className="mt-3 flex items-center justify-between">
                  <Stars value={c.rating_avg} count={c.rating_count} />
                  <span className="text-sm font-bold text-sand">{rand(c.hourly_rate)}<span className="text-xs font-normal muted">/hr</span></span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <Link to="/profile/cleaner" className="glass mt-8 block rounded-[32px] p-6">
        <p className="serif text-2xl">Earn as a cleaner</p>
        <p className="mt-2 text-sm muted">Set your own rate and area. Accept the jobs that suit you.</p>
        <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-sand">Create your profile <ArrowRight size={15} /></span>
      </Link>
    </div>
  )
}
