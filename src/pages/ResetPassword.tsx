import { Check, Eye, EyeOff } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Notice, Spinner, TopBar } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { errorText } from '../lib/format'
import { supabase } from '../lib/supabase'

/** Choose a new password: reached from a reset email, or from Profile when signed in. */
export default function ResetPassword() {
  const { user, loading } = useAuth()
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (pw.length < 6) return setError('Use at least 6 characters.')
    if (pw !== pw2) return setError("The two passwords don't match.")
    setBusy(true); setError(null)
    const { error } = await supabase.auth.updateUser({ password: pw })
    setBusy(false)
    if (error) return setError(/different from the old/i.test(error.message) ? 'Choose a password different from your old one.' : errorText(error))
    setDone(true)
  }

  if (loading) return <Spinner />

  if (!user) return (
    <>
      <TopBar title="New password" />
      <div className="glass mt-6 rounded-[32px] p-7">
        <p className="serif text-2xl">This link has expired</p>
        <p className="mt-2 muted">Reset links work once and only for a short time. Request a fresh one and open the newest email.</p>
        <Link to="/auth?mode=forgot" className="btn-sand mt-6 w-full">Send a new link</Link>
      </div>
    </>
  )

  if (done) return (
    <>
      <TopBar back={false} title="New password" />
      <div className="glass mt-6 rounded-[32px] p-7 text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-sand/20 text-sand"><Check size={30} /></span>
        <p className="serif mt-4 text-2xl">Password updated</p>
        <p className="mt-2 muted">You're signed in. Use your new password next time.</p>
        <Link to="/" className="btn-sand mt-6 w-full">Go to home</Link>
      </div>
    </>
  )

  return (
    <>
      <TopBar title="New password" />
      <p className="mt-2 muted">Choose a new password for <b className="text-shell">{user.email}</b>.</p>
      <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
        <div>
          <label className="label" htmlFor="pw">New password</label>
          <div className="relative">
            <input id="pw" type={show ? 'text' : 'password'} className="input pr-12" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} required minLength={6} />
            <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-shell/60 hover:text-shell">{show ? <EyeOff size={18} /> : <Eye size={18} />}</button>
          </div>
          <p className="mt-1.5 text-xs muted">At least 6 characters.</p>
        </div>
        <div>
          <label className="label" htmlFor="pw2">Type it again</label>
          <input id="pw2" type={show ? 'text' : 'password'} className="input" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} required minLength={6} />
        </div>
        {error && <Notice tone="error">{error}</Notice>}
        <button className="btn-sand mt-2 w-full text-base" disabled={busy}>{busy ? 'Saving…' : 'Save new password'}</button>
      </form>
    </>
  )
}
