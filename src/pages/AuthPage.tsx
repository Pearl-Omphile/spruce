import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Logo } from '../components/AppShell'
import { Notice, TopBar } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { isNativeApp, WEB_URL } from '../lib/platform'

type Mode = 'signin' | 'signup' | 'forgot'

/** Where email links (confirm sign-up, reset password) should bring people back to. */
const returnUrl = () => (isNativeApp ? WEB_URL : window.location.origin + window.location.pathname)

const takeNotice = () => {
  try {
    const n = sessionStorage.getItem('spruce-auth-notice')
    sessionStorage.removeItem('spruce-auth-notice')
    return n
  } catch { return null }
}

export default function AuthPage() {
  const [params] = useSearchParams()
  const next = params.get('next') || '/'
  const { user } = useAuth()
  const navigate = useNavigate()
  const initial = params.get('mode')
  const [mode, setMode] = useState<Mode>(initial === 'signup' || initial === 'forgot' ? initial : 'signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(takeNotice)
  const [sent, setSent] = useState<null | 'confirm' | 'reset'>(null)

  useEffect(() => { if (user && mode !== 'forgot') navigate(next, { replace: true }) }, [user, next, navigate, mode])

  const switchTo = (m: Mode) => { setMode(m); setError(null) }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true); setError(null)
    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message === 'Invalid login credentials' ? "That email and password don't match an account." : error.message)
    } else if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: name.trim() }, emailRedirectTo: returnUrl() },
      })
      if (error) setError(error.message)
      else if (!data.session) setSent('confirm')
    } else {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: returnUrl() })
      // Don't reveal whether an account exists; only show real problems like rate limits
      if (error && /rate|seconds|limit/i.test(error.message)) setError('Too many requests. Wait a minute, then try again.')
      else if (error && !/not found|user/i.test(error.message)) setError(error.message)
      else setSent('reset')
    }
    setBusy(false)
  }

  if (sent) return (
    <>
      <TopBar />
      <div className="glass mt-6 rounded-[32px] p-7">
        <h1 className="text-[2.2rem]">Check your inbox</h1>
        <p className="mt-3 muted">
          {sent === 'confirm'
            ? <>We sent a confirmation link to <b className="text-shell">{email}</b>. Open it, then sign in.</>
            : <>If <b className="text-shell">{email}</b> has a Spruce account, we've sent a link to choose a new password. It works once, so use the newest email.</>}
        </p>
        <p className="mt-3 text-sm muted">Can't see it? Check spam, or wait a minute and try again.</p>
        <button className="btn-glass mt-6 w-full" onClick={() => { setSent(null); switchTo('signin') }}>Back to sign in</button>
      </div>
    </>
  )

  return (
    <>
      <TopBar />
      <div className="mt-4"><Logo /></div>
      <h1 className="mt-6 text-[2.5rem]">{mode === 'signin' ? 'Welcome back' : mode === 'signup' ? 'Create your account' : 'Reset your password'}</h1>
      <p className="mt-2 muted">
        {mode === 'signin' ? 'Sign in to book and manage your cleans.'
          : mode === 'signup' ? 'One account to book cleans, and to work as a cleaner if you like.'
          : "Enter your account's email and we'll send you a link to choose a new password."}
      </p>

      {mode !== 'forgot' && (
        <div className="glass mt-7 flex rounded-full p-1" role="tablist">
          {(['signin', 'signup'] as const).map((m) => (
            <button key={m} role="tab" aria-selected={mode === m} onClick={() => switchTo(m)}
              className={`flex-1 rounded-full py-2.5 text-sm font-bold transition ${mode === m ? 'bg-sand text-deep' : 'text-shell/70'}`}>
              {m === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
        {mode === 'signup' && (
          <div><label className="label" htmlFor="name">Full name</label>
            <input id="name" className="input" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} /></div>
        )}
        <div><label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" className="input" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
        {mode !== 'forgot' && (
          <div>
            <div className="flex items-baseline justify-between">
              <label className="label" htmlFor="pw">Password</label>
              {mode === 'signin' && (
                <button type="button" onClick={() => switchTo('forgot')} className="mb-2 text-sm font-semibold text-sand hover:underline">Forgot password?</button>
              )}
            </div>
            <input id="pw" type="password" className="input" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            {mode === 'signup' && <p className="mt-1.5 text-xs muted">At least 6 characters.</p>}
          </div>
        )}
        {error && <Notice tone="error">{error}</Notice>}
        <button className="btn-sand mt-2 w-full text-base" disabled={busy}>
          {busy ? 'One moment…' : mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset link'}
        </button>
        {mode === 'forgot' && <button type="button" className="btn-glass w-full" onClick={() => switchTo('signin')}>Back to sign in</button>}
      </form>
    </>
  )
}
