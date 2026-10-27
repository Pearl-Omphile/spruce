import { ArrowLeft, Briefcase, MapPin } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Avatar, Notice, Spinner, Stars } from '../components/bits'
import CleanerMap from '../components/CleanerMap'
import { useAuth } from '../context/AuthContext'
import { errorText, rand, todayISO } from '../lib/format'
import { supabase } from '../lib/supabase'
import type { Cleaner, Review } from '../lib/types'

export default function CleanerProfile() {
  const { id } = useParams()
  const [cleaner, setCleaner] = useState<Cleaner | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [state, setState] = useState<'loading' | 'ok' | 'missing'>('loading')

  useEffect(() => {
    if (!id) return
    Promise.all([
      supabase.from('cleaners').select('*').eq('id', id).maybeSingle(),
      supabase.from('reviews').select('id, reviewer_name, rating, comment, created_at').eq('cleaner_id', id).order('created_at', { ascending: false }),
    ]).then(([c, r]) => {
      setCleaner(c.data as Cleaner | null)
      setReviews((r.data ?? []) as Review[])
      setState(c.data ? 'ok' : 'missing')
    })
  }, [id])

  if (state === 'loading') return <div className="mx-auto max-w-6xl px-4 sm:px-6"><Spinner label="Loading profile" /></div>
  if (!cleaner)
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="text-3xl font-extrabold">This cleaner isn't on Spruce any more</h1>
        <Link to="/find" className="btn-primary mt-6">Find another cleaner</Link>
      </div>
    )

  const c = cleaner
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Link to="/find" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-ink">
        <ArrowLeft size={16} /> All cleaners
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_380px]">
        <div>
          <div className="flex items-center gap-5">
            <Avatar name={c.display_name} size={88} />
            <div>
              <h1 className="text-4xl font-extrabold sm:text-5xl">{c.display_name}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-ink-soft">
                <Stars value={c.rating_avg} count={c.rating_count} size={18} />
                <span className="inline-flex items-center gap-1"><MapPin size={16} aria-hidden /> {c.suburb}, {c.city}</span>
                <span className="inline-flex items-center gap-1"><Briefcase size={16} aria-hidden /> {c.years_experience} {c.years_experience === 1 ? 'year' : 'years'} cleaning</span>
              </div>
            </div>
          </div>

          {c.bio && <p className="mt-8 max-w-[65ch] text-lg text-ink-soft">{c.bio}</p>}

          <h2 className="mt-10 text-2xl font-bold">Services</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {c.services.map((s) => (
              <li key={s} className="rounded-full bg-mist px-3.5 py-1.5 text-sm font-semibold text-ink-soft">{s}</li>
            ))}
          </ul>

          <h2 className="mt-10 text-2xl font-bold">Where they work</h2>
          <CleanerMap cleaners={[c]} center={[c.lat, c.lng]} zoom={13} className="mt-3 h-64 w-full overflow-hidden rounded-2xl border border-line" />

          <h2 className="mt-10 text-2xl font-bold">
            Reviews {reviews.length > 0 && <span className="text-muted">({reviews.length})</span>}
          </h2>
          {reviews.length === 0 ? (
            <p className="mt-3 text-muted">No reviews yet. Book {c.display_name.split(' ')[0]} and be the first to rate them.</p>
          ) : (
            <ul className="mt-4 divide-y divide-line">
              {reviews.map((r) => (
                <li key={r.id} className="py-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold">{r.reviewer_name}</span>
                    <Stars value={r.rating} />
                  </div>
                  {r.comment && <p className="mt-1 text-ink-soft">{r.comment}</p>}
                  <p className="mt-1 text-xs text-muted">
                    {new Date(r.created_at).toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <BookingForm cleaner={c} />
        </aside>
      </div>
    </div>
  )
}

function BookingForm({ cleaner: c }: { cleaner: Cleaner }) {
  const { user, myCleaner } = useAuth()
  const navigate = useNavigate()
  const [service, setService] = useState(c.services[0] ?? '')
  const [date, setDate] = useState(todayISO())
  const [time, setTime] = useState('09:00')
  const [hours, setHours] = useState(4)
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isMe = myCleaner?.id === c.id
  const total = c.hourly_rate * hours

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!user) return navigate(`/auth?next=${encodeURIComponent(`/cleaners/${c.id}`)}`)
    setBusy(true)
    setError(null)
    const { error } = await supabase.from('bookings').insert({
      client_id: user.id,
      cleaner_id: c.id,
      service,
      scheduled_date: date,
      start_time: time,
      hours,
      address: address.trim(),
      notes: notes.trim(),
    })
    setBusy(false)
    if (error) return setError(errorText(error))
    navigate('/bookings?booked=1')
  }

  return (
    <form onSubmit={submit} className="rounded-3xl border border-line bg-white p-6 shadow-[0_20px_50px_-30px_rgb(36_19_61/0.4)]">
      <p className="font-display text-3xl font-extrabold">
        {rand(c.hourly_rate)}<span className="text-base font-semibold text-muted"> per hour</span>
      </p>

      {!c.is_available ? (
        <div className="mt-4"><Notice>{c.display_name.split(' ')[0]} isn't taking bookings right now.</Notice></div>
      ) : isMe ? (
        <div className="mt-4"><Notice>This is your own profile. Clients book you from here.</Notice></div>
      ) : (
        <fieldset disabled={busy} className="mt-5 flex flex-col gap-4">
          <div>
            <label className="label" htmlFor="svc">Service</label>
            <select id="svc" className="input" value={service} onChange={(e) => setService(e.target.value)}>
              {c.services.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="date">Date</label>
              <input id="date" type="date" className="input" min={todayISO()} value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div>
              <label className="label" htmlFor="time">Start time</label>
              <input id="time" type="time" className="input" min="06:00" max="18:00" step={1800} value={time} onChange={(e) => setTime(e.target.value)} required />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="hours">How long</label>
            <select id="hours" className="input" value={hours} onChange={(e) => setHours(+e.target.value)}>
              {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((h) => (
                <option key={h} value={h}>{h} hours{h === 4 ? ' (half day)' : h === 8 ? ' (full day)' : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="addr">Address</label>
            <input id="addr" className="input" placeholder="Street, suburb" value={address} onChange={(e) => setAddress(e.target.value)} required minLength={5} maxLength={200} />
          </div>
          <div>
            <label className="label" htmlFor="notes">Notes for the cleaner (optional)</label>
            <textarea id="notes" className="input min-h-20" placeholder="Gate code, pets, what to focus on" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
          </div>

          <div className="flex items-baseline justify-between border-t border-line pt-4">
            <span className="text-ink-soft">{hours} hrs × {rand(c.hourly_rate)}</span>
            <span className="font-display text-2xl font-extrabold">{rand(total)}</span>
          </div>
          {error && <Notice tone="error">{error}</Notice>}
          <button className="btn-accent w-full py-3 text-base" type="submit">
            {busy ? 'Booking…' : user ? `Book for ${rand(total)}` : 'Sign in to book'}
          </button>
          <p className="text-center text-xs text-muted">
            {c.is_demo ? 'Demo cleaner: your booking is confirmed straight away.' : "You won't be charged. Pay your cleaner on the day."}
          </p>
        </fieldset>
      )}
    </form>
  )
}
