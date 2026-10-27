import { LocateFixed } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import CleanerMap from '../components/CleanerMap'
import { Avatar, Notice, Spinner, Stars } from '../components/ui'
import { SERVICE_LIST } from '../lib/catalog'
import { distanceKm, km, rand } from '../lib/format'
import { useCleaners, useMyLocation } from '../lib/hooks'
import { CITIES } from '../lib/types'

type Sort = 'near' | 'rating' | 'price'

export default function Explore() {
  const { cleaners, loading, error } = useCleaners()
  const geo = useMyLocation()
  const [city, setCity] = useState('Johannesburg')
  const [service, setService] = useState('')
  const [sort, setSort] = useState<Sort>('near')
  const [active, setActive] = useState<string | null>(null)

  const nearMe = city === 'near' && geo.coords
  useEffect(() => { if (geo.status === 'ok') setCity('near') }, [geo.status])

  const origin = useMemo<[number, number]>(() => (nearMe ? geo.coords! : CITIES[city] ?? CITIES.Johannesburg!), [nearMe, geo.coords, city])

  const list = useMemo(() => {
    const rows = cleaners
      .filter((c) => (nearMe ? true : c.city === city))
      .filter((c) => !service || c.services.includes(service))
      .map((c) => ({ c, d: distanceKm(origin, [c.lat, c.lng]) }))
      .filter(({ d }) => (nearMe ? d <= 60 : true))
    rows.sort((a, b) => sort === 'near' ? a.d - b.d : sort === 'rating' ? b.c.rating_avg - a.c.rating_avg : a.c.hourly_rate - b.c.hourly_rate)
    return rows
  }, [cleaners, city, service, sort, origin, nearMe])

  // Tapping a pin scrolls its card into view
  useEffect(() => {
    if (active) document.getElementById(`c-${active}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [active])

  return (
    <div className="pt-[max(18px,env(safe-area-inset-top))]">
      <h1 className="text-[2rem]">Explore cleaners</h1>

      <div className="no-scrollbar -mx-5 mt-4 flex gap-2 overflow-x-auto px-5">
        <button onClick={geo.request} className={`chip shrink-0 ${nearMe ? 'chip-on' : 'chip-off'}`}>
          <LocateFixed size={15} /> Near me
        </button>
        {Object.keys(CITIES).map((c) => (
          <button key={c} onClick={() => setCity(c)} className={`chip shrink-0 ${city === c ? 'chip-on' : 'chip-off'}`}>{c}</button>
        ))}
      </div>
      {geo.status === 'denied' && <div className="mt-3"><Notice>Location is blocked in your browser, so pick a city instead.</Notice></div>}

      <div className="relative mt-4 overflow-hidden rounded-[30px] border border-white/15">
        <CleanerMap cleaners={list.map((r) => r.c)} center={origin} zoom={nearMe ? 11 : city === 'Johannesburg' ? 10 : 11}
          me={nearMe ? geo.coords : null} activeId={active} onSelect={setActive} className="h-64 w-full" />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <select aria-label="Service" className="input !rounded-full !py-2.5" value={service} onChange={(e) => setService(e.target.value)}>
          <option value="" className="text-deep">Any service</option>
          {SERVICE_LIST.map((s) => <option key={s.id} value={s.id} className="text-deep">{s.name}</option>)}
        </select>
        <select aria-label="Sort" className="input !rounded-full !py-2.5" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
          <option value="near" className="text-deep">Closest</option>
          <option value="rating" className="text-deep">Top rated</option>
          <option value="price" className="text-deep">Lowest price</option>
        </select>
      </div>

      {error && <div className="mt-4"><Notice tone="error">Couldn't load cleaners: {error}</Notice></div>}
      {loading ? <Spinner label="Loading cleaners" /> : list.length === 0 && !error ? (
        <div className="glass mt-5 rounded-3xl p-6 text-center">
          <p className="serif text-xl">No cleaners here yet</p>
          <p className="mt-1 text-sm muted">Try another city or any service.</p>
        </div>
      ) : (
        <ul className="mt-5 flex flex-col gap-3">
          {list.map(({ c, d }) => (
            <li key={c.id} id={`c-${c.id}`}>
              <Link to={`/cleaners/${c.id}`} onMouseEnter={() => setActive(c.id)}
                className={`glass flex items-center gap-4 rounded-3xl p-4 transition ${active === c.id ? '!border-sand' : ''}`}>
                <Avatar name={c.display_name} size={54} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">{c.display_name}</span>
                  <span className="block text-xs muted">{c.suburb}{nearMe ? `, ${km(d)} away` : ''}</span>
                  <span className="mt-1 flex items-center gap-2">
                    <Stars value={c.rating_avg} count={c.rating_count} />
                    {!c.is_available && <span className="text-[11px] font-bold text-warn">Fully booked</span>}
                  </span>
                </span>
                <span className="text-right"><span className="block font-bold text-sand">{rand(c.hourly_rate)}</span><span className="text-xs muted">per hour</span></span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
