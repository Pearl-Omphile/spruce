import { LogOut, Menu, X } from 'lucide-react'
import { Suspense, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Spinner } from './bits'
import { REPO_URL } from '../lib/supabase'

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 font-display text-2xl font-extrabold tracking-tight ${light ? 'text-white' : 'text-ink'}`}>
      <svg viewBox="0 0 64 64" width="28" height="28" aria-hidden>
        <rect width="64" height="64" rx="16" fill={light ? '#8A6BE0' : '#24133D'} />
        <path d="M32 12c-6 10-14 17-14 27a14 14 0 0 0 28 0c0-10-8-17-14-27z" fill={light ? '#fff' : '#8A6BE0'} />
        <circle cx="27" cy="38" r="4" fill="#E4DAFB" />
      </svg>
      Spruce
    </span>
  )
}

export default function Layout() {
  const { user, myCleaner, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const links = [
    { to: '/find', label: 'Find a cleaner' },
    { to: '/become-a-cleaner', label: myCleaner ? 'My cleaner profile' : 'Become a cleaner' },
    ...(user ? [{ to: '/bookings', label: myCleaner ? 'Bookings & jobs' : 'My bookings' }] : []),
  ]
  const navCls = ({ isActive }: { isActive: boolean }) =>
    `rounded-full px-3.5 py-2 text-[15px] font-semibold transition-colors ${isActive ? 'bg-mist text-jac-deep' : 'text-ink-soft hover:text-ink'}`

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-[1000] border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/" aria-label="Spruce home" onClick={() => setOpen(false)}>
            <Logo />
          </Link>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} className={navCls}>
                {l.label}
              </NavLink>
            ))}
          </nav>
          <div className="hidden md:block">
            {user ? (
              <button className="btn-ghost !py-2" onClick={async () => { await signOut(); navigate('/') }}>
                <LogOut size={16} aria-hidden /> Sign out
              </button>
            ) : (
              <Link to={`/auth?next=${encodeURIComponent(pathname)}`} className="btn-primary !py-2">
                Sign in
              </Link>
            )}
          </div>
          <button className="p-2 md:hidden" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Menu">
            {open ? <X /> : <Menu />}
          </button>
        </div>
        {open && (
          <nav className="flex flex-col gap-1 border-t border-line px-4 py-3 md:hidden" aria-label="Mobile">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} className={navCls} onClick={() => setOpen(false)}>
                {l.label}
              </NavLink>
            ))}
            {user ? (
              <button className="btn-ghost mt-2" onClick={async () => { setOpen(false); await signOut(); navigate('/') }}>
                Sign out
              </button>
            ) : (
              <Link to="/auth" className="btn-primary mt-2" onClick={() => setOpen(false)}>
                Sign in
              </Link>
            )}
          </nav>
        )}
      </header>

      <main className="flex-1">
        <Suspense fallback={<div className="mx-auto max-w-6xl px-4"><Spinner /></div>}>
          <Outlet />
        </Suspense>
      </main>

      <footer className="border-t border-white/10 bg-ink text-white/75">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-end sm:justify-between sm:px-6">
          <div>
            <Logo light />
            <p className="mt-3 max-w-sm text-sm">
              Home cleaning across Johannesburg, Pretoria, Cape Town and Durban. A portfolio project: bookings are real in the app, but no cleaner will actually arrive.
            </p>
          </div>
          <div className="flex gap-5 text-sm font-semibold">
            <Link to="/find" className="hover:text-white">Find a cleaner</Link>
            <Link to="/become-a-cleaner" className="hover:text-white">Become a cleaner</Link>
            <a href={REPO_URL} className="hover:text-white">Source on GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
