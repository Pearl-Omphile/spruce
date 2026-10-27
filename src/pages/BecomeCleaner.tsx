import { Check, LocateFixed } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import CleanerMap from '../components/CleanerMap'
import { ActionBar, Notice, Spinner, TopBar } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { SERVICE_LIST } from '../lib/catalog'
import { errorText } from '../lib/format'
import { useMyLocation } from '../lib/hooks'
import { supabase } from '../lib/supabase'
import { CITIES, type Cleaner } from '../lib/types'

export default function BecomeCleaner() {
  const { user, profile, myCleaner, loading, refresh } = useAuth()
  if (loading) return <Spinner />

  if (!user) return (
    <>
      <TopBar />
      <h1 className="mt-2 text-[2.6rem] leading-[1.02]">Clean on your own terms</h1>
      <ul className="mt-6 flex flex-col gap-3">
        {['Set your own hourly rate', 'Choose your services and area', 'Accept only the jobs that suit you', 'Build a rating that brings more work'].map((t) => (
          <li key={t} className="glass flex items-center gap-3 rounded-2xl px-4 py-3"><Check size={18} className="text-sand" /> {t}</li>
        ))}
      </ul>
      <ActionBar>
        <Link to="/auth?mode=signup&next=/profile/cleaner" className="btn-sand w-full">Create an account to start</Link>
        <Link to="/auth?next=/profile/cleaner" className="btn-glass mt-3 w-full">I already have one</Link>
      </ActionBar>
    </>
  )

  return <CleanerForm key={myCleaner?.id ?? 'new'} existing={myCleaner} defaultName={profile?.full_name ?? ''} userId={user.id} onSaved={refresh} />
}

function CleanerForm({ existing, defaultName, userId, onSaved }: { existing: Cleaner | null; defaultName: string; userId: string; onSaved: () => Promise<void> }) {
  const navigate = useNavigate()
  const geo = useMyLocation()
  const short = (n: string) => { const [f, l] = n.trim().split(/\s+/); return l ? `${f} ${l[0]}.` : f ?? '' }

  const [name, setName] = useState(existing?.display_name ?? short(defaultName))
  const [bio, setBio] = useState(existing?.bio ?? '')
  const [rate, setRate] = useState(existing?.hourly_rate ?? 90)
  const [city, setCity] = useState(existing?.city ?? 'Johannesburg')
  const [suburb, setSuburb] = useState(existing?.suburb ?? '')
  const [pos, setPos] = useState<[number, number]>(existing ? [existing.lat, existing.lng] : CITIES.Johannesburg!)
  const [services, setServices] = useState<string[]>(existing?.services ?? ['Standard clean'])
  const [years, setYears] = useState(existing?.years_experience ?? 1)
  const [available, setAvailable] = useState(existing?.is_available ?? true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)

  useEffect(() => { if (geo.coords) setPos(geo.coords) }, [geo.coords])
  const toggle = (s: string) => setServices((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]))

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!services.length) return setMsg({ tone: 'error', text: 'Choose at least one service you offer.' })
    setBusy(true); setMsg(null)
    const row = { display_name: name.trim(), bio: bio.trim(), hourly_rate: rate, city, suburb: suburb.trim(), lat: pos[0], lng: pos[1], services, years_experience: years, is_available: available }
    const { error } = existing
      ? await supabase.from('cleaners').update(row).eq('id', existing.id)
      : await supabase.from('cleaners').insert({ ...row, user_id: userId })
    setBusy(false)
    if (error) return setMsg({ tone: 'error', text: errorText(error) })
    await onSaved()
    if (!existing) return navigate('/jobs', { replace: true })
    setMsg({ tone: 'ok', text: 'Saved. Your public profile is updated.' })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <form onSubmit={submit}>
      <TopBar title={existing ? 'Cleaner profile' : 'Become a cleaner'} />
      {existing && <Link to={`/cleaners/${existing.id}`} className="text-sm font-semibold text-sand">See your public profile</Link>}
      {msg && <div className="mt-4"><Notice tone={msg.tone}>{msg.text}</Notice></div>}

      <fieldset disabled={busy} className="mt-5 flex flex-col gap-4">
        <legend className="serif mb-3 text-2xl">About you</legend>
        <div><label className="label" htmlFor="dn">Name clients see</label>
          <input id="dn" className="input" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={60} />
          <p className="mt-1.5 text-xs muted">First name and surname initial works well.</p></div>
        <div><label className="label" htmlFor="bio">Short bio</label>
          <textarea id="bio" className="input min-h-24" maxLength={600} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="What you're great at, languages you speak, whether pets are fine" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label" htmlFor="rate">Rate per hour (R)</label>
            <input id="rate" type="number" inputMode="numeric" className="input" min={40} max={500} value={rate} onChange={(e) => setRate(+e.target.value)} required /></div>
          <div><label className="label" htmlFor="yrs">Years experience</label>
            <input id="yrs" type="number" inputMode="numeric" className="input" min={0} max={60} value={years} onChange={(e) => setYears(+e.target.value)} /></div>
        </div>
        <p className="-mt-2 text-xs muted">Most cleaners on Spruce charge R70 to R120 an hour.</p>
      </fieldset>

      <fieldset disabled={busy} className="mt-8">
        <legend className="serif mb-3 text-2xl">Services you offer</legend>
        <div className="flex flex-wrap gap-2">
          {SERVICE_LIST.map((s) => {
            const on = services.includes(s.id)
            return <button type="button" key={s.id} onClick={() => toggle(s.id)} aria-pressed={on} className={`chip ${on ? 'chip-on' : 'chip-off'}`}>{on && <Check size={14} />}{s.name}</button>
          })}
        </div>
      </fieldset>

      <fieldset disabled={busy} className="mt-8 flex flex-col gap-4">
        <legend className="serif mb-3 text-2xl">Where you work</legend>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label" htmlFor="city">City</label>
            <select id="city" className="input" value={city} onChange={(e) => { setCity(e.target.value); setPos(CITIES[e.target.value]!) }}>
              {Object.keys(CITIES).map((c) => <option key={c} className="text-deep">{c}</option>)}
            </select></div>
          <div><label className="label" htmlFor="sub">Suburb</label>
            <input id="sub" className="input" value={suburb} onChange={(e) => setSuburb(e.target.value)} required placeholder="e.g. Rosebank" /></div>
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm muted">Tap the map near where you work. Not your exact home.</p>
          <button type="button" className="btn-glass shrink-0 !px-3.5 !py-2 text-sm" onClick={geo.request}><LocateFixed size={16} /> Locate</button>
        </div>
        <CleanerMap cleaners={[{ id: 'me', display_name: name, hourly_rate: rate, lat: pos[0], lng: pos[1] } as Cleaner]} center={pos} zoom={12} onPick={setPos}
          className="h-60 w-full cursor-crosshair overflow-hidden rounded-[26px] border border-white/15" />
        {geo.status === 'denied' && <p className="text-sm text-warn">Location is blocked in your browser. Tap the map instead.</p>}
      </fieldset>

      {existing && (
        <label className="glass mt-6 flex items-center gap-4 rounded-3xl p-4">
          <input type="checkbox" className="size-5 accent-[#E8D5B5]" checked={available} onChange={(e) => setAvailable(e.target.checked)} />
          <span><span className="block font-semibold">Taking new bookings</span><span className="block text-xs muted">Untick when you're fully booked or on leave.</span></span>
        </label>
      )}

      <ActionBar>
        <button className="btn-sand w-full" disabled={busy}>{busy ? 'Saving…' : existing ? 'Save changes' : 'Publish my profile'}</button>
      </ActionBar>
    </form>
  )
}
