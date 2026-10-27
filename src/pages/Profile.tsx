import { BriefcaseBusiness, ChevronRight, Download, LogOut, ShieldCheck, Smartphone, UserRoundPen } from 'lucide-react'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Avatar, Notice, Spinner } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { errorText } from '../lib/format'
import { useInstallPrompt } from '../lib/install'
import { supabase } from '../lib/supabase'
import { lastSeen } from './Admin'

function Row({ to, onClick, icon, title, sub, right }: { to?: string; onClick?: () => void; icon: ReactNode; title: string; sub?: string; right?: ReactNode }) {
  const body = (
    <>
      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-sand/15 text-sand">{icon}</span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block font-semibold">{title}</span>
        {sub && <span className="block text-xs muted">{sub}</span>}
      </span>
      {right ?? <ChevronRight size={18} className="text-shell/40" />}
    </>
  )
  const cls = 'flex w-full items-center gap-4 px-4 py-3.5 transition hover:bg-white/5'
  return to ? <Link to={to} className={cls}>{body}</Link> : <button onClick={onClick} className={cls}>{body}</button>
}

export default function Profile() {
  const { user, profile, myCleaner, loading, signOut, refresh } = useAuth()
  const install = useInstallPrompt()
  const [editing, setEditing] = useState(false)
  const [pending, setPending] = useState(0)
  const [newCleaners, setNewCleaners] = useState(0)

  // Admin: count real cleaners who joined since you last opened the admin screen
  useEffect(() => {
    if (!profile?.is_admin) return
    supabase.from('cleaners').select('id', { count: 'exact', head: true }).eq('is_demo', false).gt('created_at', lastSeen())
      .then(({ count }) => setNewCleaners(count ?? 0))
  }, [profile?.is_admin])

  useEffect(() => {
    if (!myCleaner) return
    supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('cleaner_id', myCleaner.id).eq('status', 'pending')
      .then(({ count }) => setPending(count ?? 0))
  }, [myCleaner])

  if (loading) return <Spinner />

  return (
    <div className="pt-[max(18px,env(safe-area-inset-top))]">
      <h1 className="text-[2rem]">Profile</h1>

      {!user ? (
        <div className="glass mt-6 rounded-[32px] p-7 text-center">
          <p className="serif text-2xl">Welcome to Spruce</p>
          <p className="mt-2 text-sm muted">Sign in to book cleans, track bookings, or start earning as a cleaner.</p>
          <Link to="/auth?next=/profile" className="btn-sand mt-6 w-full">Sign in</Link>
          <Link to="/auth?mode=signup&next=/profile" className="btn-glass mt-3 w-full">Create an account</Link>
        </div>
      ) : (
        <>
          <section className="glass mt-6 flex items-center gap-4 rounded-[30px] p-5">
            <Avatar name={profile?.full_name || user.email || 'You'} size={62} />
            <div className="min-w-0 flex-1">
              <p className="serif truncate text-2xl">{profile?.full_name || 'Your name'}</p>
              <p className="truncate text-sm muted">{user.email}</p>
              {profile?.phone && <p className="text-sm muted">{profile.phone}</p>}
              {!!profile?.client_rating_count && (
                <p className="mt-1 text-sm"><span className="text-warn">★</span> <b>{Number(profile.client_rating_avg).toFixed(1)}</b> <span className="muted">your rating from cleaners</span></p>
              )}
            </div>
          </section>
          {editing && <EditDetails onDone={async () => { setEditing(false); await refresh() }} />}

          {profile?.is_admin && (
            <>
              <p className="mb-2 ml-1 mt-7 text-sm font-semibold muted">Owner</p>
              <div className="glass overflow-hidden rounded-[28px]">
                <Row to="/admin" icon={<ShieldCheck size={20} />} title="Admin" sub="New cleaners, people and every booking"
                  right={newCleaners ? <span className="rounded-full bg-sand px-2.5 py-0.5 text-xs font-bold text-deep">{newCleaners} new</span> : undefined} />
              </div>
            </>
          )}

          <p className="mb-2 ml-1 mt-7 text-sm font-semibold muted">Cleaner mode</p>
          <div className="glass divide-y divide-white/10 overflow-hidden rounded-[28px]">
            {myCleaner ? (
              <>
                <Row to="/jobs" icon={<BriefcaseBusiness size={20} />} title="My jobs" sub="Accept requests and manage upcoming cleans"
                  right={pending ? <span className="rounded-full bg-sand px-2.5 py-0.5 text-xs font-bold text-deep">{pending} new</span> : undefined} />
                <Row to="/profile/cleaner" icon={<UserRoundPen size={20} />} title="Cleaner profile" sub={myCleaner.is_available ? 'Taking bookings' : 'Paused, not taking bookings'} />
              </>
            ) : (
              <Row to="/profile/cleaner" icon={<BriefcaseBusiness size={20} />} title="Become a cleaner" sub="Set your rate and area, start getting jobs" />
            )}
          </div>

          <p className="mb-2 ml-1 mt-7 text-sm font-semibold muted">Account</p>
          <div className="glass divide-y divide-white/10 overflow-hidden rounded-[28px]">
            <Row onClick={() => setEditing(!editing)} icon={<UserRoundPen size={20} />} title="Edit name and phone" sub="Your cleaner sees these when you book" />
            <Row onClick={signOut} icon={<LogOut size={20} />} title="Sign out" right={<span />} />
          </div>
        </>
      )}

      <p className="mb-2 ml-1 mt-7 text-sm font-semibold muted">Get the app</p>
      <div className="glass overflow-hidden rounded-[28px]">
        {install.canPrompt ? (
          <Row onClick={install.prompt} icon={<Download size={20} />} title="Install Spruce" sub="Adds Spruce to your home screen" />
        ) : install.installed ? (
          <Row icon={<Smartphone size={20} />} title="Spruce is installed" sub="Open it from your home screen" right={<span />} />
        ) : (
          <div className="flex gap-4 px-4 py-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-sand/15 text-sand"><Smartphone size={20} /></span>
            <div className="text-sm">
              <p className="font-semibold">Add to your home screen</p>
              <p className="mt-1 muted"><b className="text-shell">iPhone:</b> open in Safari, tap Share, then “Add to Home Screen”.</p>
              <p className="mt-1 muted"><b className="text-shell">Android:</b> open in Chrome, tap ⋮, then “Install app”.</p>
            </div>
          </div>
        )}
      </div>
      <p className="mt-6 text-center text-xs muted">Spruce is a portfolio project. Bookings are real in the app, but no cleaner will arrive.</p>
    </div>
  )
}

function EditDetails({ onDone }: { onDone: () => Promise<void> }) {
  const { user, profile } = useAuth()
  const [name, setName] = useState(profile?.full_name ?? '')
  const [phone, setPhone] = useState(profile?.phone ?? '')
  const [error, setError] = useState<string | null>(null)
  async function save(e: FormEvent) {
    e.preventDefault()
    const { error } = await supabase.from('profiles').update({ full_name: name.trim(), phone: phone.trim() || null }).eq('id', user!.id)
    if (error) return setError(errorText(error))
    await onDone()
  }
  return (
    <form onSubmit={save} className="glass mt-3 flex flex-col gap-3 rounded-[28px] p-5">
      <div><label className="label" htmlFor="n">Full name</label><input id="n" className="input" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} /></div>
      <div><label className="label" htmlFor="p">Phone</label><input id="p" type="tel" className="input" placeholder="e.g. 082 123 4567" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
      {error && <Notice tone="error">{error}</Notice>}
      <button className="btn-sand">Save details</button>
    </form>
  )
}
