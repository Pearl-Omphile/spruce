import { Banknote, Check, CreditCard, LocateFixed, MapPin } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ActionBar, Avatar, Counter, Notice, Spinner, Stars, Steps, TopBar } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useDraft } from '../context/BookingDraft'
import { ADDONS, addonById, addonsTotal, estimateHours, SERVICE_LIST, serviceById, TIME_SLOTS } from '../lib/catalog'
import { distanceKm, errorText, km, niceDate, rand, todayISO } from '../lib/format'
import { useCleaners, useMyLocation } from '../lib/hooks'
import { checkFit, scheduleText, useBusy } from '../lib/availability'
import { supabase } from '../lib/supabase'
import { CITIES } from '../lib/types'

/* ---------- Step 1: service ---------- */
export function BookService() {
  const { draft, set } = useDraft()
  const navigate = useNavigate()
  return (
    <>
      <TopBar title="Book a clean" />
      <Steps at={1} />
      <h2 className="text-3xl">What needs cleaning?</h2>
      <ul className="mt-6 flex flex-col gap-3">
        {SERVICE_LIST.map((s) => {
          const on = draft.service === s.id
          return (
            <li key={s.id}>
              <button onClick={() => { set({ service: s.id }); navigate('/book/details') }} aria-pressed={on}
                className={`glass flex w-full items-center gap-4 rounded-3xl p-4 text-left transition active:scale-[0.99] ${on ? '!border-sand' : 'hover:border-white/30'}`}>
                <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-sand/30 to-sky/10 text-sand">
                  <s.icon size={24} strokeWidth={1.7} />
                </span>
                <span className="flex-1">
                  <span className="block font-bold">{s.name}</span>
                  <span className="block text-sm muted">{s.blurb}</span>
                </span>
                <span className="text-right text-xs muted">from<br /><span className="text-sm font-bold text-shell">{s.base} hrs</span></span>
              </button>
            </li>
          )
        })}
      </ul>
    </>
  )
}

/* ---------- Step 2: home size and add-ons ---------- */
export function BookDetails() {
  const { draft, set } = useDraft()
  const navigate = useNavigate()
  const svc = draft.service ? serviceById(draft.service) : undefined
  if (!svc) return <Navigate to="/book" replace />
  const hours = estimateHours(svc.id, draft.bedrooms, draft.bathrooms)
  const toggle = (id: string) => set({ addons: draft.addons.includes(id) ? draft.addons.filter((a) => a !== id) : [...draft.addons, id] })

  return (
    <>
      <TopBar title={svc.name} />
      <Steps at={2} />
      <h2 className="text-3xl">Tell us about the space</h2>
      <div className="mt-6 flex flex-col gap-3">
        <Counter label={svc.roomLabel} value={draft.bedrooms} min={1} max={8} onChange={(n) => set({ bedrooms: n })} />
        {svc.perBath > 0 && <Counter label="Bathrooms" value={draft.bathrooms} min={1} max={6} onChange={(n) => set({ bathrooms: n })} />}
      </div>

      <h3 className="mt-9 text-2xl">Extras</h3>
      <p className="text-sm muted">Added to the price at a fixed rate.</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {ADDONS.map((a) => {
          const on = draft.addons.includes(a.id)
          return (
            <button key={a.id} type="button" onClick={() => toggle(a.id)} aria-pressed={on}
              className={`relative rounded-3xl border p-4 text-left transition ${on ? 'border-sand bg-sand/15' : 'glass hover:border-white/30'}`}>
              {on && <Check size={16} className="absolute right-3 top-3 text-sand" />}
              <span className="block pr-4 text-sm font-semibold">{a.name}</span>
              <span className="mt-1 block text-sm text-sand">+{rand(a.price)}</span>
            </button>
          )
        })}
      </div>

      <ActionBar>
        <div className="glass-strong flex items-center justify-between gap-4 rounded-full py-2 pl-6 pr-2">
          <span><span className="block text-xs muted">Estimated time</span><span className="font-bold">{hours} hours</span></span>
          <button className="btn-sand" onClick={() => navigate('/book/schedule')}>Choose a time</button>
        </div>
      </ActionBar>
    </>
  )
}

/* ---------- Step 3: date, time, address ---------- */
export function BookSchedule() {
  const { draft, set } = useDraft()
  const navigate = useNavigate()
  const geo = useMyLocation()
  const [touched, setTouched] = useState(false)
  const { cleaners } = useCleaners()
  const busy = useBusy(draft.date)
  const picked = draft.cleanerId ? cleaners.find((c) => c.id === draft.cleanerId) : undefined
  const hours = draft.service ? estimateHours(draft.service, draft.bedrooms, draft.bathrooms) : 2
  const dayOff = (d: string) => !!picked && !picked.work_days.includes(new Date(d + 'T00:00:00').getDay())
  const slotFit = (t: string) => (picked && busy ? checkFit(picked, draft.date, t, hours, busy) : { ok: true as const })

  // When location arrives, store it and snap to the nearest city we serve
  useEffect(() => {
    if (geo.status !== 'ok' || !geo.coords) return
    const here = geo.coords
    const nearest = Object.entries(CITIES).sort((a, b) => distanceKm(here, a[1]) - distanceKm(here, b[1]))[0]![0]
    set({ coords: here, city: nearest })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo.status, geo.coords])

  if (!draft.service) return <Navigate to="/book" replace />

  const days = Array.from({ length: 14 }, (_, i) => todayISO(i))
  const timeOk = !picked || (!dayOff(draft.date) && slotFit(draft.time).ok)
  const valid = draft.address.trim().length >= 5

  return (
    <>
      <TopBar title="Date and place" />
      <Steps at={3} />
      <h2 className="text-3xl">When should we come?</h2>
      {picked && (
        <div className="glass mt-4 flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm">
          <span>Showing <b>{picked.display_name}</b>'s free times<span className="block text-xs muted">{scheduleText(picked)}</span></span>
          <button className="shrink-0 font-semibold text-sand" onClick={() => set({ cleanerId: null })}>Any cleaner</button>
        </div>
      )}

      <div className="no-scrollbar -mx-5 mt-5 flex gap-2.5 overflow-x-auto px-5 pb-1" role="radiogroup" aria-label="Date">
        {days.map((d) => {
          const dt = new Date(d + 'T00:00:00')
          const on = draft.date === d
          const off = dayOff(d)
          return (
            <button key={d} role="radio" aria-checked={on} disabled={off} onClick={() => set({ date: d })}
              aria-label={off ? `${dt.toDateString()}, ${picked?.display_name} doesn't work this day` : undefined}
              className={`flex w-16 shrink-0 flex-col items-center rounded-3xl border py-3 transition disabled:opacity-35 ${on ? 'border-sand bg-sand text-deep' : 'glass'}`}>
              <span className={`text-xs font-semibold ${on ? '' : 'muted'}`}>{dt.toLocaleDateString('en-ZA', { weekday: 'short' })}</span>
              <span className="text-xl font-bold">{dt.getDate()}</span>
              <span className={`text-[11px] ${on ? '' : 'muted'}`}>{dt.toLocaleDateString('en-ZA', { month: 'short' })}</span>
            </button>
          )
        })}
      </div>

      <p className="label mt-6">Start time</p>
      <div className="grid grid-cols-3 gap-2.5" role="radiogroup" aria-label="Start time">
        {TIME_SLOTS.map((t) => {
          const fit = slotFit(t)
          return (
            <button key={t} role="radio" aria-checked={draft.time === t} disabled={!fit.ok} title={fit.ok ? undefined : fit.reason}
              onClick={() => set({ time: t })}
              className={`chip justify-center !py-3 disabled:line-through disabled:opacity-35 ${draft.time === t && fit.ok ? 'chip-on' : 'chip-off'}`}>{t}</button>
          )
        })}
      </div>
      {picked && (dayOff(draft.date) || !slotFit(draft.time).ok) && (
        <p className="mt-3 text-sm text-warn">
          {dayOff(draft.date) ? `${picked.display_name} doesn't work this day.` : `${(slotFit(draft.time) as { reason: string }).reason}.`} Pick another time, or switch to any cleaner.
        </p>
      )}

      <h3 className="mt-9 text-2xl">Where?</h3>
      <div className="mt-4 flex flex-col gap-4">
        <div className="grid grid-cols-[1fr_auto] gap-2.5">
          <div>
            <label className="label" htmlFor="city">City</label>
            <select id="city" className="input" value={draft.city} onChange={(e) => set({ city: e.target.value, coords: null })}>
              {Object.keys(CITIES).map((c) => <option key={c} className="text-deep">{c}</option>)}
            </select>
          </div>
          <button type="button" onClick={geo.request} className="btn-glass mt-7 !px-4" aria-label="Use my current location">
            <LocateFixed size={18} />
          </button>
        </div>
        {geo.status === 'asking' && <p className="text-sm muted">Finding you…</p>}
        {geo.status === 'ok' && draft.coords && <p className="text-sm text-ok">Using your location, matched to {draft.city}.</p>}
        {geo.status === 'denied' && <p className="text-sm text-warn">Location is blocked in your browser. Pick your city instead.</p>}
        <div>
          <label className="label" htmlFor="addr">Street address</label>
          <input id="addr" className="input" placeholder="e.g. 12 Oak Avenue, Rosebank" value={draft.address}
            onChange={(e) => set({ address: e.target.value })} onBlur={() => setTouched(true)} maxLength={200} />
          {touched && !valid && <p className="mt-1.5 text-sm text-warn">Add your street and suburb so your cleaner can find you.</p>}
        </div>
        <div>
          <label className="label" htmlFor="notes">Notes for your cleaner (optional)</label>
          <textarea id="notes" className="input min-h-24" placeholder="Gate code, pets, what to focus on" value={draft.notes} onChange={(e) => set({ notes: e.target.value })} maxLength={500} />
        </div>
      </div>

      <ActionBar>
        <button className="btn-sand w-full" disabled={!valid || !timeOk} onClick={() => navigate('/book/cleaner')}>
          {!timeOk ? 'Pick a time that works' : valid ? `${niceDate(draft.date)} at ${draft.time}, choose cleaner` : 'Add your address to continue'}
        </button>
      </ActionBar>
    </>
  )
}

/* ---------- Step 4: choose cleaner ---------- */
const score = (rating: number, distance: number) => rating * 1.5 - distance / 10

export function BookCleaner() {
  const { draft, set } = useDraft()
  const navigate = useNavigate()
  const { cleaners, loading: loadingCleaners, error } = useCleaners()
  const busy = useBusy(draft.date)
  const origin = draft.coords ?? CITIES[draft.city] ?? CITIES.Johannesburg!
  const hours = draft.service ? estimateHours(draft.service, draft.bedrooms, draft.bathrooms) : 2

  const matches = useMemo(() => cleaners
    .filter((c) => draft.service && c.services.includes(draft.service))
    .map((c) => ({ c, d: distanceKm(origin, [c.lat, c.lng]), fit: checkFit(c, draft.date, draft.time, hours, busy ?? []) }))
    .filter(({ d }) => d <= 60)
    // Free cleaners first. Best match: well rated and close by (new cleaners count as 3.5 stars)
    .sort((a, b) => Number(b.fit.ok) - Number(a.fit.ok) ||
      score(b.c.rating_count ? b.c.rating_avg : 3.5, b.d) - score(a.c.rating_count ? a.c.rating_avg : 3.5, a.d)),
  [cleaners, draft.service, draft.date, draft.time, hours, busy, origin])

  if (!draft.service) return <Navigate to="/book" replace />
  const loading = loadingCleaners || !busy
  const extras = addonsTotal(draft.addons)
  const free = matches.filter((m) => m.fit.ok)
  const chosen = draft.cleanerId && free.some((m) => m.c.id === draft.cleanerId) ? draft.cleanerId : free[0]?.c.id ?? null

  return (
    <>
      <TopBar title="Choose cleaner" />
      <Steps at={4} />
      <h2 className="text-3xl">Cleaners near you</h2>
      <p className="mt-1 text-sm muted">{serviceById(draft.service)?.name}, {niceDate(draft.date)} from {draft.time} for {hours} hours, in {draft.city}. Prices include your extras.</p>

      {loading ? <Spinner label="Finding cleaners" /> : error ? (
        <div className="mt-6"><Notice tone="error">Couldn't load cleaners: {error}</Notice></div>
      ) : matches.length === 0 ? (
        <div className="glass mt-6 rounded-3xl p-6 text-center">
          <p className="serif text-2xl">No one free for this yet</p>
          <p className="mt-2 text-sm muted">No cleaners in {draft.city} offer {serviceById(draft.service)?.name.toLowerCase()} right now. Try another city or service.</p>
          <button className="btn-glass mt-5" onClick={() => navigate('/book')}>Change service</button>
        </div>
      ) : (
        <>
        {free.length === 0 && (
          <div className="glass mt-6 rounded-3xl p-6 text-center">
            <p className="serif text-2xl">Everyone's busy then</p>
            <p className="mt-2 text-sm muted">No cleaner near you is free {niceDate(draft.date)} from {draft.time} for {hours} hours. Try an earlier start or another day.</p>
            <button className="btn-sand mt-5" onClick={() => navigate('/book/schedule')}>Change time</button>
          </div>
        )}
        <ul className="mt-6 flex flex-col gap-3" role="radiogroup" aria-label="Cleaner">
          {matches.map(({ c, d, fit }, i) => {
            const on = chosen === c.id
            return (
              <li key={c.id}>
                {i === free.length && <p className={`mb-3 ml-1 text-sm font-semibold muted ${i > 0 ? 'mt-4' : ''}`}>Not free at {draft.time}</p>}
                <button role="radio" aria-checked={on} disabled={!fit.ok} onClick={() => set({ cleanerId: c.id })}
                  className={`glass flex w-full items-center gap-4 rounded-3xl p-4 text-left transition disabled:opacity-45 ${on ? '!border-sand !bg-sand/10' : 'hover:border-white/30'}`}>
                  <Avatar name={c.display_name} size={54} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate font-bold">{c.display_name}</span>
                      {i === 0 && <span className="rounded-full bg-sand/20 px-2 py-0.5 text-[11px] font-bold text-sand">Best match</span>}
                    </span>
                    <span className="block text-xs muted">{c.suburb}, {km(d)} away, {c.years_experience} yrs experience</span>
                    {fit.ok
                      ? <span className="mt-1 block"><Stars value={c.rating_avg} count={c.rating_count} /></span>
                      : <span className="mt-1 block text-xs font-semibold text-warn">{fit.reason}</span>}
                  </span>
                  <span className="text-right">
                    <span className="block text-lg font-bold">{rand(c.hourly_rate * hours + extras)}</span>
                    <span className="block text-xs muted">{rand(c.hourly_rate)}/hr</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
        </>
      )}

      {chosen && (
        <ActionBar>
          <button className="btn-sand w-full" onClick={() => { set({ cleanerId: chosen }); navigate('/book/review') }}>Review booking</button>
        </ActionBar>
      )}
    </>
  )
}

/* ---------- Step 5: review and confirm ---------- */
function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 ${strong ? 'text-lg font-bold' : 'text-sm'}`}>
      <span className={strong ? '' : 'muted'}>{k}</span><span className="text-right">{v}</span>
    </div>
  )
}


export function BookReview() {
  const { draft, reset } = useDraft()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { cleaners, loading } = useCleaners()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!draft.service || !draft.cleanerId) return <Navigate to="/book" replace />
  if (loading) return <Spinner />
  const c = cleaners.find((x) => x.id === draft.cleanerId)
  if (!c) return <Navigate to="/book/cleaner" replace />

  const svc = serviceById(draft.service)!
  const hours = estimateHours(svc.id, draft.bedrooms, draft.bathrooms)
  const labour = c.hourly_rate * hours
  const total = labour + addonsTotal(draft.addons)

  async function confirm() {
    if (!user) return navigate(`/auth?next=${encodeURIComponent('/book/review')}`)
    setBusy(true)
    setError(null)
    const { data, error } = await supabase.from('bookings').insert({
      client_id: user.id, cleaner_id: c!.id, service: svc.id,
      bedrooms: draft.bedrooms, bathrooms: svc.perBath > 0 ? draft.bathrooms : 1, addons: draft.addons,
      scheduled_date: draft.date, start_time: draft.time,
      address: `${draft.address.trim()}, ${draft.city}`, notes: draft.notes.trim(),
    }).select('id').single()
    setBusy(false)
    if (error) return setError(errorText(error))
    reset()
    navigate(`/booked/${data.id}`, { replace: true })
  }

  return (
    <>
      <TopBar title="Review" />
      <Steps at={5} />

      <div className="glass flex items-center gap-4 rounded-3xl p-4">
        <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-sand/30 to-sky/10 text-sand"><svc.icon size={24} /></span>
        <div>
          <p className="font-bold">{svc.name}, {hours} hours</p>
          <p className="text-sm muted">{draft.bedrooms} {svc.roomLabel.toLowerCase()}{svc.perBath > 0 ? `, ${draft.bathrooms} bathroom${draft.bathrooms > 1 ? 's' : ''}` : ''}</p>
        </div>
      </div>

      <div className="glass mt-3 flex flex-col gap-3 rounded-3xl p-5">
        <div className="flex items-center gap-3">
          <Avatar name={c.display_name} size={42} />
          <div className="flex-1"><p className="font-bold">{c.display_name}</p><Stars value={c.rating_avg} count={c.rating_count} /></div>
        </div>
        <Row k="When" v={`${niceDate(draft.date)} at ${draft.time}`} />
        <div className="flex gap-2 text-sm"><MapPin size={16} className="mt-0.5 shrink-0 text-sand" /><span>{draft.address}, {draft.city}</span></div>
        {draft.notes && <p className="rounded-2xl bg-white/5 px-3 py-2 text-sm muted">“{draft.notes}”</p>}
      </div>

      <h3 className="mt-7 text-2xl">Price</h3>
      <div className="glass mt-3 flex flex-col gap-2.5 rounded-3xl p-5">
        <Row k={`${hours} hrs × ${rand(c.hourly_rate)}`} v={rand(labour)} />
        {draft.addons.map((a) => <Row key={a} k={addonById(a)!.name} v={rand(addonById(a)!.price)} />)}
        <div className="my-1 border-t border-white/10" />
        <Row k="Total" v={rand(total)} strong />
      </div>

      <h3 className="mt-7 text-2xl">Payment</h3>
      <div className="mt-3 flex flex-col gap-2.5">
        <div className="flex items-center gap-3 rounded-3xl border border-sand bg-sand/10 p-4">
          <Banknote size={20} className="text-sand" />
          <span className="flex-1"><span className="block font-semibold">Pay on the day</span><span className="block text-xs muted">Cash or card to your cleaner after the clean</span></span>
          <Check size={18} className="text-sand" />
        </div>
        <div className="glass flex items-center gap-3 rounded-3xl p-4 opacity-55">
          <CreditCard size={20} />
          <span className="flex-1"><span className="block font-semibold">Card in the app</span><span className="block text-xs muted">Coming soon</span></span>
        </div>
      </div>

      {error && <div className="mt-5"><Notice tone="error">{error}</Notice></div>}
      <ActionBar>
        <button className="btn-sand w-full text-base" disabled={busy} onClick={confirm}>
          {busy ? 'Booking…' : user ? `Confirm booking for ${rand(total)}` : 'Sign in to confirm'}
        </button>
      </ActionBar>
    </>
  )
}
