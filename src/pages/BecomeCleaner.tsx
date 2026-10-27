import { Check, LocateFixed } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Notice, Spinner } from '../components/bits'
import CleanerMap from '../components/CleanerMap'
import { useAuth } from '../context/AuthContext'
import { errorText } from '../lib/format'
import { useMyLocation } from '../lib/hooks'
import { supabase } from '../lib/supabase'
import { CITIES, SERVICES, type Cleaner } from '../lib/types'

export default function BecomeCleaner() {
  const { user, profile, myCleaner, loading, refresh } = useAuth()

  if (loading) return <div className="mx-auto max-w-3xl px-4"><Spinner /></div>

  if (!user)
    return (
      <div className="bg-mist">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
          <h1 className="text-5xl font-extrabold sm:text-6xl">Clean on your own terms.</h1>
          <ul className="mt-8 flex flex-col gap-3 text-lg text-ink-soft">
            {['Set your own hourly rate', 'Choose your services and the area you work in', 'Accept only the jobs that suit you', 'Build a rating that brings you more work'].map((t) => (
              <li key={t} className="flex gap-3"><Check className="mt-1 shrink-0 text-jac" size={20} aria-hidden /> {t}</li>
            ))}
          </ul>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link to="/auth?mode=signup&next=/become-a-cleaner" className="btn-primary px-7 py-3 text-base">Create an account to start</Link>
            <Link to="/auth?next=/become-a-cleaner" className="btn-ghost px-7 py-3 text-base">I already have one</Link>
          </div>
        </div>
      </div>
    )

  return <CleanerForm key={myCleaner?.id ?? 'new'} existing={myCleaner} defaultName={profile?.full_name ?? ''} userId={user.id} onSaved={refresh} />
}

function CleanerForm({ existing, defaultName, userId, onSaved }: { existing: Cleaner | null; defaultName: string; userId: string; onSaved: () => Promise<void> }) {
  const geo = useMyLocation()
  const shortName = (n: string) => {
    const [first, last] = n.trim().split(/\s+/)
    return last ? `${first} ${last[0]}.` : first ?? ''
  }

  const [name, setName] = useState(existing?.display_name ?? shortName(defaultName))
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

  useEffect(() => {
    if (geo.coords) setPos(geo.coords)
  }, [geo.coords])

  const toggle = (s: string) => setServices((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]))

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (services.length === 0) return setMsg({ tone: 'error', text: 'Choose at least one service you offer.' })
    setBusy(true)
    setMsg(null)
    const row = {
      display_name: name.trim(), bio: bio.trim(), hourly_rate: rate, city, suburb: suburb.trim(),
      lat: pos[0], lng: pos[1], services, years_experience: years, is_available: available,
    }
    const { error } = existing
      ? await supabase.from('cleaners').update(row).eq('id', existing.id)
      : await supabase.from('cleaners').insert({ ...row, user_id: userId })
    setBusy(false)
    if (error) return setMsg({ tone: 'error', text: errorText(error) })
    await onSaved()
    setMsg({ tone: 'ok', text: existing ? 'Profile saved.' : "You're live. Clients can now find and book you." })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-4xl font-extrabold sm:text-5xl">{existing ? 'Your cleaner profile' : 'Become a cleaner'}</h1>
      <p className="mt-3 text-ink-soft">
        {existing ? 'Changes show on your public profile straight away.' : 'Fill this in and your profile appears on the map for clients near you.'}
      </p>
      {existing && (
        <p className="mt-2"><Link to={`/cleaners/${existing.id}`} className="font-semibold text-jac-deep hover:underline">See your public profile</Link></p>
      )}
      {msg && <div className="mt-6"><Notice tone={msg.tone}>{msg.text}</Notice></div>}

      <form onSubmit={submit} className="mt-8 flex flex-col gap-8">
        <fieldset disabled={busy} className="flex flex-col gap-5">
          <legend className="font-display text-2xl font-bold">About you</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="dn">Name shown to clients</label>
              <input id="dn" className="input" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={60} />
              <p className="mt-1 text-xs text-muted">First name and surname initial works well.</p>
            </div>
            <div>
              <label className="label" htmlFor="yrs">Years of experience</label>
              <input id="yrs" type="number" className="input" min={0} max={60} value={years} onChange={(e) => setYears(+e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="bio">Short bio</label>
            <textarea id="bio" className="input min-h-28" maxLength={600} value={bio} onChange={(e) => setBio(e.target.value)}
              placeholder="What you're great at, languages you speak, whether pets are fine…" />
          </div>
        </fieldset>

        <fieldset disabled={busy} className="flex flex-col gap-5">
          <legend className="font-display text-2xl font-bold">Services and rate</legend>
          <div className="flex flex-wrap gap-2">
            {SERVICES.map((s) => {
              const on = services.includes(s)
              return (
                <button type="button" key={s} onClick={() => toggle(s)} aria-pressed={on}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${on ? 'border-jac bg-bloom text-jac-deep' : 'border-line text-ink-soft hover:border-jac'}`}>
                  {on && <Check size={14} aria-hidden />} {s}
                </button>
              )
            })}
          </div>
          <div className="max-w-xs">
            <label className="label" htmlFor="rate">Hourly rate (Rands)</label>
            <input id="rate" type="number" className="input" min={40} max={500} value={rate} onChange={(e) => setRate(+e.target.value)} required />
            <p className="mt-1 text-xs text-muted">Most cleaners on Spruce charge R70 to R120 an hour.</p>
          </div>
        </fieldset>

        <fieldset disabled={busy} className="flex flex-col gap-5">
          <legend className="font-display text-2xl font-bold">Where you work</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="city">City</label>
              <select id="city" className="input" value={city} onChange={(e) => { setCity(e.target.value); setPos(CITIES[e.target.value]!) }}>
                {Object.keys(CITIES).map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="sub">Suburb</label>
              <input id="sub" className="input" value={suburb} onChange={(e) => setSuburb(e.target.value)} required placeholder="e.g. Rosebank" />
            </div>
          </div>
          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-ink-soft">Tap the map to place your pin roughly where you work. Don't use your exact home address.</p>
              <button type="button" className="btn-ghost !py-1.5 text-sm" onClick={geo.request}>
                <LocateFixed size={16} aria-hidden /> Use my location
              </button>
            </div>
            <CleanerMap
              cleaners={[{ ...(existing ?? ({} as Cleaner)), id: 'me', display_name: name, hourly_rate: rate, lat: pos[0], lng: pos[1] } as Cleaner]}
              center={pos}
              zoom={12}
              onPick={setPos}
              className="h-72 w-full cursor-crosshair overflow-hidden rounded-2xl border border-line"
            />
            {geo.status === 'denied' && <p className="mt-2 text-sm text-warn">Location is blocked in your browser. Tap the map instead.</p>}
          </div>
        </fieldset>

        {existing && (
          <label className="flex items-center gap-3 rounded-2xl border border-line p-4">
            <input type="checkbox" className="size-5 accent-jac" checked={available} onChange={(e) => setAvailable(e.target.checked)} />
            <span>
              <span className="font-semibold">Taking new bookings</span>
              <span className="block text-sm text-muted">Untick this when you're fully booked or on leave.</span>
            </span>
          </label>
        )}

        <button className="btn-accent self-start px-8 py-3 text-base" disabled={busy}>
          {busy ? 'Saving…' : existing ? 'Save changes' : 'Publish my profile'}
        </button>
      </form>
    </div>
  )
}
