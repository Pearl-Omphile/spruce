import { LocateFixed } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Stars } from '../components/bits'
import CleanerMap from '../components/CleanerMap'
import { useCleaners } from '../lib/hooks'
import { rand } from '../lib/format'
import { CITIES } from '../lib/types'

export default function Home() {
  const { cleaners } = useCleaners()
  const navigate = useNavigate()
  const [city, setCity] = useState('Johannesburg')
  const top = cleaners.filter((c) => c.rating_count > 0).slice(0, 3)
  const cityCount = cleaners.filter((c) => c.city === city).length

  return (
    <>
      {/* Hero: the live map is the hero's one bold element */}
      <section className="bg-mist">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:py-20">
          <div>
            <h1 className="text-[clamp(2.75rem,6vw,4.75rem)] font-extrabold">Get your Saturday back.</h1>
            <p className="mt-5 max-w-md text-lg text-ink-soft">
              Book a rated, local cleaner in a few taps. See who's near you, what they charge per hour, and what other people say about them.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button className="btn-primary text-base" onClick={() => navigate('/find?near=me')}>
                <LocateFixed size={18} aria-hidden /> Find cleaners near me
              </button>
              <Link to="/become-a-cleaner" className="btn-ghost text-base">
                Earn as a cleaner
              </Link>
            </div>

            <div className="mt-8">
              <p className="text-sm font-semibold text-ink-soft">Or browse a city</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {Object.keys(CITIES).map((c) => (
                  <button
                    key={c}
                    onClick={() => setCity(c)}
                    aria-pressed={city === c}
                    className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${
                      city === c ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink-soft hover:border-jac'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="relative">
            <CleanerMap
              cleaners={cleaners}
              center={CITIES[city]!}
              zoom={city === 'Johannesburg' ? 10 : 12}
              className="h-[360px] w-full overflow-hidden rounded-3xl border border-line shadow-[0_24px_60px_-28px_rgb(36_19_61/0.45)] sm:h-[460px]"
            />
            <Link
              to={`/find?city=${encodeURIComponent(city)}`}
              className="absolute bottom-4 left-4 z-[500] rounded-full bg-white px-4 py-2 text-sm font-semibold shadow-md hover:text-jac-deep"
            >
              {cityCount ? `See all ${cityCount} cleaners in ${city}` : `Browse ${city}`}
            </Link>
          </div>
        </div>
      </section>

      {/* How it works: a real sequence, so numbered */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
        <h2 className="text-4xl font-extrabold sm:text-5xl">How booking works</h2>
        <ol className="mt-10 grid gap-8 md:grid-cols-3">
          {[
            ['Pick a cleaner', 'Filter by distance, price and rating. Every profile shows their services, experience and reviews.'],
            ['Choose a time', 'Tell them the date, how many hours and your address. You see the full price in Rands before you book.'],
            ['Rate the clean', "When the job's done, mark it complete and leave a star rating that helps the next person choose."],
          ].map(([t, d], i) => (
            <li key={t} className="border-t-2 border-ink pt-5">
              <span className="font-display text-5xl font-extrabold text-jac">{i + 1}</span>
              <h3 className="mt-3 text-2xl font-bold">{t}</h3>
              <p className="mt-2 text-ink-soft">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      {top.length > 0 && (
        <section className="border-y border-line bg-white">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 className="text-3xl font-extrabold sm:text-4xl">Highly rated this month</h2>
              <Link to="/find" className="font-semibold text-jac-deep hover:underline">
                See every cleaner
              </Link>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {top.map((c) => (
                <Link key={c.id} to={`/cleaners/${c.id}`} className="rounded-2xl bg-mist p-6 transition-colors hover:bg-bloom">
                  <Stars value={c.rating_avg} count={c.rating_count} />
                  <p className="mt-3 font-display text-2xl font-bold">{c.display_name}</p>
                  <p className="text-muted">{c.suburb}, {c.city}</p>
                  <p className="mt-4 text-ink-soft">{c.bio}</p>
                  <p className="mt-4 font-semibold">{rand(c.hourly_rate)} per hour</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Supply side */}
      <section className="bg-ink text-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:px-6 md:grid-cols-[1.4fr_1fr] md:items-center lg:py-20">
          <div>
            <h2 className="text-4xl font-extrabold sm:text-5xl">Clean on your own terms.</h2>
            <p className="mt-4 max-w-lg text-lg text-white/75">
              Set your own hourly rate, choose the services you offer and the area you work in. Accept the jobs that suit you and build a rating clients can trust.
            </p>
          </div>
          <div className="md:justify-self-end">
            <Link to="/become-a-cleaner" className="btn-accent px-7 py-3.5 text-lg">
              Create your cleaner profile
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
