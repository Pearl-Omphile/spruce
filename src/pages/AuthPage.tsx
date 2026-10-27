import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Logo } from '../components/AppShell'
import { Notice, TopBar } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

export default function AuthPage() {
  const [params] = useSearchParams()
  const next = params.get('next') || '/'
  const { user } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'signin' | 'signup'>(params.get('mode') === 'signup' ? 'signup' : 'signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checkEmail, setCheckEmail] = useState(false)

  useEffect(() => { if (user) navigate(next, { replace: true }) }, [user, next, navigate])

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true); setError(null)
    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message === 'Invalid login credentials' ? "That email and password don't match an account." : error.message)
    } else {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: name.trim() }, emailRedirectTo: window.location.origin + window.location.pathname },
      })
      if (error) setError(error.message)
      else if (!data.session) setCheckEmail(true)
    }
    setBusy(false)
  }

  return (
    <>
      <TopBar />
      {checkEmail ? (
        <div className="glass mt-6 rounded-[32px] p-7">
          <h1 className="text-[2.2rem]">Check your inbox</h1>
          <p className="mt-3 muted">We sent a confirmation link to <b className="text-shell">{email}</b>. Open it on this device, then sign in.</p>
          <button className="btn-glass mt-6 w-full" onClick={() => { setCheckEmail(false); setMode('signin') }}>Back to sign in</button>
        </div>
      ) : (
        <>
          <div className="mt-4"><Logo /></div>
          <h1 className="mt-6 text-[2.5rem]">{mode === 'signin' ? 'Welcome back' : 'Create your account'}</h1>
          <p className="mt-2 muted">{mode === 'signin' ? 'Sign in to book and manage your cleans.' : 'One account to book cleans, and to work as a cleaner if you like.'}</p>

          <div className="glass mt-7 flex rounded-full p-1" role="tablist">
            {(['signin', 'signup'] as const).map((m) => (
              <button key={m} role="tab" aria-selected={mode === m} onClick={() => { setMode(m); setError(null) }}
                className={`flex-1 rounded-full py-2.5 text-sm font-bold transition ${mode === m ? 'bg-sand text-deep' : 'text-shell/70'}`}>
                {m === 'signin' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
            {mode === 'signup' && (
              <div><label className="label" htmlFor="name">Full name</label>
                <input id="name" className="input" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} /></div>
            )}
            <div><label className="label" htmlFor="email">Email</label>
              <input id="email" type="email" className="input" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
            <div><label className="label" htmlFor="pw">Password</label>
              <input id="pw" type="password" className="input" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
              {mode === 'signup' && <p className="mt-1.5 text-xs muted">At least 6 characters.</p>}</div>
            {error && <Notice tone="error">{error}</Notice>}
            <button className="btn-sand mt-2 w-full text-base" disabled={busy}>{busy ? 'One moment…' : mode === 'signin' ? 'Sign in' : 'Create account'}</button>
          </form>
        </>
      )}
    </>
  )
}
