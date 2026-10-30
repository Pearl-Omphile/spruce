import { CalendarCheck, Compass, Home, UserRound } from 'lucide-react'
import { Suspense, useId } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { REPO_URL } from '../lib/supabase'
import { Spinner } from './ui'

export function Logo({ size = 30 }: { size?: number }) {
  // Unique gradient id: the logo appears more than once per page, sometimes inside a hidden panel
  const gid = `lg-${useId().replace(/:/g, '')}`
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#F6EFE3" /><stop offset="1" stopColor="#CDB48C" />
          </linearGradient>
        </defs>
        <rect width="64" height="64" rx="20" fill="rgb(255 255 255 / 0.12)" stroke="rgb(255 255 255 / 0.3)" />
        <path d="M32 13c-6 10-14 17-14 27a14 14 0 0 0 28 0c0-10-8-17-14-27z" fill={`url(#${gid})`} />
        <circle cx="27" cy="39" r="4" fill="#0E2E52" opacity=".55" />
      </svg>
      <span className="serif text-[1.6rem] leading-none text-shell">Spruce</span>
    </span>
  )
}

const TABS = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/explore', label: 'Explore', icon: Compass },
  { to: '/bookings', label: 'Bookings', icon: CalendarCheck },
  { to: '/profile', label: 'Profile', icon: UserRound },
]

/** Phone-sized app column. On a wide screen, a short project note sits beside it. */
export default function AppShell() {
  const { pathname } = useLocation()
  const showTabs = ['/', '/explore', '/bookings', '/profile'].includes(pathname)

  return (
    <div className="lg:mx-auto lg:grid lg:max-w-6xl lg:grid-cols-[1fr_440px] lg:items-start lg:gap-16 lg:px-8">
      <aside className="hidden lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:justify-center">
        <Logo size={40} />
        <h2 className="mt-8 text-6xl leading-[1.02]">A spotless home, booked in a minute.</h2>
        <p className="mt-5 max-w-md text-lg muted">
          Spruce matches you with rated cleaners near you in South Africa. Built as a mobile app: try it here, or open it on your phone and add it to your home screen.
        </p>
        <p className="mt-8 text-sm muted">
          Portfolio project by Pearl Omphile. <a className="font-semibold text-sand underline-offset-4 hover:underline" href={REPO_URL}>Source on GitHub</a>
        </p>
      </aside>

      <div className="relative mx-auto flex min-h-dvh w-full max-w-[440px] flex-col lg:my-8 lg:h-[calc(100dvh-4rem)] lg:min-h-0 lg:overflow-hidden lg:rounded-[44px] lg:border lg:border-white/15 lg:bg-white/[0.03] lg:shadow-[0_40px_120px_-40px_rgb(0_0_0/0.8)]">
        <main className={`flex-1 px-5 lg:overflow-y-auto lg:no-scrollbar ${showTabs ? 'pb-28' : 'pb-6'}`}>
          <Suspense fallback={<Spinner />}>
            <Outlet />
          </Suspense>
        </main>

        {showTabs && (
          <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-[700] mx-auto w-full max-w-[440px] px-4 pb-[max(12px,env(safe-area-inset-bottom))] lg:absolute">
            <div className="glass-strong flex justify-around rounded-[28px] !bg-[rgb(10_32_58/0.88)] px-2 py-2 shadow-[0_20px_40px_-12px_rgb(0_0_0/0.7)]">
              {TABS.map(({ to, label, icon: Icon, end }) => (
                <NavLink key={to} to={to} end={end}
                  className={({ isActive }) => `flex flex-1 flex-col items-center gap-1 rounded-2xl py-1.5 text-[11px] font-semibold transition ${isActive ? 'text-sand' : 'text-shell/60 hover:text-shell'}`}>
                  {({ isActive }) => (
                    <>
                      <span className={`grid h-9 w-12 place-items-center rounded-full transition ${isActive ? 'bg-sand/15' : ''}`}>
                        <Icon size={21} strokeWidth={isActive ? 2.3 : 1.8} />
                      </span>
                      {label}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </nav>
        )}
      </div>
    </div>
  )
}
