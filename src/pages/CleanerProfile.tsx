import { Briefcase, MapPin, Star } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import CleanerMap from '../components/CleanerMap'
import { ActionBar, Avatar, Notice, Spinner, Stars, TopBar } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useDraft } from '../context/BookingDraft'
import { serviceById } from '../lib/catalog'
import { rand } from '../lib/format'
import { supabase } from '../lib/supabase'
import type { Cleaner, Review } from '../lib/types'

export default function CleanerProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { myCleaner } = useAuth()
  const { reset, set } = useDraft()
  const [c, setC] = useState<Cleaner | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [state, setState] = useState<'loading' | 'ok' | 'missing'>('loading')

  useEffect(() => {
    Promise.all([
      supabase.from('cleaners').select('*').eq('id', id!).maybeSingle(),
      supabase.from('reviews').select('id, reviewer_name, rating, comment, created_at').eq('cleaner_id', id!).order('created_at', { ascending: false }),
    ]).then(([a, b]) => {
      setC(a.data as Cleaner | null)
      setReviews((b.data ?? []) as Review[])
      setState(a.data ? 'ok' : 'missing')
    })
  }, [id])

  if (state === 'loading') return <><TopBar /><Spinner /></>
  if (!c) return (<><TopBar /><div className="glass mt-10 rounded-3xl p-8 text-center"><p className="serif text-2xl">This cleaner isn't on Spruce any more</p></div></>)

  const isMe = myCleaner?.id === c.id
  const bookWith = (serviceId: string) => {
    reset()
    set({ service: serviceId, cleanerId: c.id, city: c.city })
    navigate('/book/details')
  }

  return (
    <>
      <TopBar />
      <section className="glass relative overflow-hidden rounded-[34px] p-6 text-center">
        <div aria-hidden className="absolute -top-16 left-1/2 size-56 -translate-x-1/2 rounded-full bg-sky/25 blur-3xl" />
        <div className="relative mx-auto w-fit"><Avatar name={c.display_name} size={96} /></div>
        <h1 className="relative mt-4 text-[2.2rem]">{c.display_name}</h1>
        <p className="relative mt-1 flex items-center justify-center gap-1.5 text-sm muted"><MapPin size={15} /> {c.suburb}, {c.city}</p>
        <div className="relative mt-5 grid grid-cols-3 divide-x divide-white/10 rounded-2xl bg-white/5 py-3">
          <div><p className="flex items-center justify-center gap-1 text-lg font-bold"><Star size={16} className="fill-warn text-warn" />{c.rating_count ? Number(c.rating_avg).toFixed(1) : 'New'}</p><p className="text-xs muted">{c.rating_count} reviews</p></div>
          <div><p className="flex items-center justify-center gap-1 text-lg font-bold"><Briefcase size={15} />{c.years_experience}</p><p className="text-xs muted">years</p></div>
          <div><p className="text-lg font-bold text-sand">{rand(c.hourly_rate)}</p><p className="text-xs muted">per hour</p></div>
        </div>
      </section>

      {c.bio && <p className="mt-6 text-[1.02rem] leading-relaxed text-shell/85">{c.bio}</p>}

      <h2 className="mt-8 text-2xl">Book {c.display_name.split(' ')[0]} for</h2>
      {!c.is_available && <div className="mt-3"><Notice>{c.display_name.split(' ')[0]} is fully booked right now.</Notice></div>}
      <div className="mt-3 grid grid-cols-2 gap-3">
        {c.services.map((sid) => {
          const s = serviceById(sid)
          if (!s) return null
          return (
            <button key={sid} disabled={!c.is_available || isMe} onClick={() => bookWith(sid)}
              className="glass flex items-center gap-3 rounded-3xl p-3.5 text-left transition hover:border-white/30 disabled:opacity-50">
              <span className="grid size-10 place-items-center rounded-xl bg-sand/15 text-sand"><s.icon size={19} /></span>
              <span className="text-sm font-semibold">{s.name}</span>
            </button>
          )
        })}
      </div>

      <h2 className="mt-8 text-2xl">Area</h2>
      <CleanerMap cleaners={[c]} center={[c.lat, c.lng]} zoom={13} className="mt-3 h-44 w-full overflow-hidden rounded-[26px] border border-white/15" />

      <h2 className="mt-8 text-2xl">Reviews</h2>
      {reviews.length === 0 ? <p className="mt-2 text-sm muted">No reviews yet. Book a clean and be the first to rate.</p> : (
        <ul className="mt-3 flex flex-col gap-3">
          {reviews.map((r) => (
            <li key={r.id} className="glass rounded-3xl p-4">
              <div className="flex items-center justify-between"><span className="font-bold">{r.reviewer_name}</span><Stars value={r.rating} /></div>
              {r.comment && <p className="mt-1 text-sm text-shell/85">{r.comment}</p>}
              <p className="mt-2 text-xs muted">{new Date(r.created_at).toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })}</p>
            </li>
          ))}
        </ul>
      )}

      {!isMe && c.is_available && c.services[0] && (
        <ActionBar>
          <button className="btn-sand w-full" onClick={() => bookWith(c.services[0]!)}>Book {c.display_name.split(' ')[0]}</button>
        </ActionBar>
      )}
    </>
  )
}
