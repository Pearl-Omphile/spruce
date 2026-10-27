import { LocateFixed, Map as MapIcon, List } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Notice, Spinner } from '../components/bits'
import CleanerCard from '../components/CleanerCard'
import CleanerMap from '../components/CleanerMap'
import { distanceKm } from '../lib/format'
import { useCleaners, useMyLocation } from '../lib/hooks'
import { CITIES, SERVICES } from '../lib/types'

type Sort = 'distance' | 'rating' | 'price'

export default function FindCleaners() {
  const [params, setParams] = useSearchParams()
  const { cleaners, loading, error } = useCleaners()
  const geo = useMyLocation()

  const [city, setCity] = useState(params.get('city') ?? 'Johannesburg')
  const [service, setService] = useState('')
  const [maxRate, setMaxRate] = useState(200)
  const [sort, setSort] = useState<Sort>('distance')
  const [active, setActive] = useState<string | null>(null)
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list')

  // "Find cleaners near me" from the home page asks for location straight away
  useEffect(() => {
    if (params.get('near') === 'me') geo.request()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const usingMe = geo.status === 'ok' && geo.coords !== null && city === 'near'
  useEffect(() => {
    if (geo.status === 'ok') setCity('near')
  }, [geo.status])

  const origin = useMemo<[number, number]>(
    () => (usingMe ? geo.coords! : CITIES[city] ?? CITIES.Johannesburg!),
    [usingMe, geo.coords, city],
  )

  const results = useMemo(() => {
    const list = cleaners
      .filter((c) => (usingMe ? true : c.city === city))
      .filter((c) => !service || c.services.includes(service))
      .filter((c) => c.hourly_rate <= maxRate)
      .map((c) => ({ c, d: distanceKm(origin, [c.lat, c.lng]) }))
      .filter(({ d }) => (usingMe ? d <= 60 : true))
    list.sort((a, b) =>
      sort === 'distance' ? a.d - b.d : sort === 'rating' ? b.c.rating_avg - a.c.rating_avg : a.c.hourly_rate - b.c.hourly_rate,
    )
    return list
  }, [cleaners, city, service, maxRate, sort, origin, usingMe])

  const changeCity = (v: string) => {
    if (v === 'near') return geo.request()
    setCity(v)
    setParams(v ? { city: v } : {})
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-4xl font-extrabold sm:text-5xl">
        {usingMe ? 'Cleaners near you' : `Cleaners in ${city}`}
      </h1>

      {/* Filters */}
      <div className="mt-6 grid gap-3 rounded-2xl border border-line bg-white p-4 sm:grid-cols-2 lg:grid-cols-[1.2fr_1.2fr_1fr_1fr]">
        <div>
          <label className="label" htmlFor="area">Area</label>
          <div className="flex gap-2">
            <select id="area" className="input" value={city} onChange={(e) => changeCity(e.target.value)}>
              {geo.status === 'ok' && <option value="near">Near me (within 60 km)</option>}
              {Object.keys(CITIES).map((c) => <option key={c}>{c}</option>)}
            </select>
            <button
              type="button"
              className="btn-ghost shrink-0 !px-3"
              onClick={geo.request}
              aria-label="Use my location"
              title="Use my location"
            >
              <LocateFixed size={18} />
            </button>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="service">Service</label>
          <select id="service" className="input" value={service} onChange={(e) => setService(e.target.value)}>
            <option value="">Any service</option>
            {SERVICES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="rate">Up to R{maxRate}/hr</label>
          <input id="rate" type="range" min={50} max={200} step={5} value={maxRate}
            onChange={(e) => setMaxRate(+e.target.value)} className="mt-3 w-full accent-jac" />
        </div>
        <div>
          <label className="label" htmlFor="sort">Sort by</label>
          <select id="sort" className="input" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="distance">Closest</option>
            <option value="rating">Highest rated</option>
            <option value="price">Lowest price</option>
          </select>
        </div>
      </div>

      {geo.status === 'asking' && <p className="mt-3 text-sm text-muted">Finding your location…</p>}
      {geo.status === 'denied' && (
        <div className="mt-3"><Notice>Location is blocked in your browser, so we're showing a city instead. Allow location for this site to see distances from you.</Notice></div>
      )}
      {error && <div className="mt-4"><Notice tone="error">Couldn't load cleaners: {error}</Notice></div>}

      {/* Mobile list/map switch */}
      <div className="mt-5 flex gap-2 lg:hidden">
        {(['list', 'map'] as const).map((v) => (
          <button key={v} onClick={() => setMobileView(v)} aria-pressed={mobileView === v}
            className={`py-2 flex-1 rounded-full border text-sm font-semibold inline-flex items-center justify-center gap-2 ${mobileView === v ? 'border-ink bg-ink text-white' : 'border-line'}`}>
            {v === 'list' ? <List size={16} /> : <MapIcon size={16} />} {v === 'list' ? 'List' : 'Map'}
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_1.05fr]">
        <section aria-label="Results" className={mobileView === 'map' ? 'hidden lg:block' : ''}>
          {loading ? (
            <Spinner label="Loading cleaners" />
          ) : results.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line p-8 text-center">
              <p className="font-display text-xl font-bold">No cleaners match these filters</p>
              <p className="mt-1 text-muted">Raise the price limit, choose any service, or try another city.</p>
            </div>
          ) : (
            <>
              <p className="mb-3 text-sm text-muted">{results.length} cleaner{results.length === 1 ? '' : 's'}</p>
              <ul className="flex flex-col gap-3">
                {results.map(({ c, d }) => (
                  <li key={c.id}>
                    <CleanerCard cleaner={c} distance={usingMe ? d : undefined} active={active === c.id} onHover={setActive} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
        <div className={`lg:sticky lg:top-24 lg:self-start ${mobileView === 'list' ? 'hidden lg:block' : ''}`}>
          <CleanerMap
            cleaners={results.map((r) => r.c)}
            center={origin}
            zoom={usingMe ? 11 : city === 'Johannesburg' ? 10 : 12}
            me={usingMe ? geo.coords : null}
            activeId={active}
            onSelect={setActive}
            className="h-[60vh] min-h-[380px] w-full overflow-hidden rounded-3xl border border-line lg:h-[calc(100dvh-8rem)]"
          />
        </div>
      </div>
    </div>
  )
}
