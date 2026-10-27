import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Notice } from '../components/bits'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

export default function AuthPage() {
  const [params] = useSearchParams()
  const next = params.get('next') || '/find'
  const { user } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'signin' | 'signup'>(params.get('mode') === 'signup' ? 'signup' : 'signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checkEmail, setCheckEmail] = useState(false)

  useEffect(() => {
    if (user) navigate(next, { replace: true })
  }, [user, next, navigate])

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message === 'Invalid login credentials' ? 'That email and password don\'t match an account.' : error.message)
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name.trim() }, emailRedirectTo: window.location.origin + window.location.pathname },
      })
      if (error) setError(error.message)
      else if (!data.session) setCheckEmail(true) // email confirmation is switched on in Supabase
    }
    setBusy(false)
  }

  if (checkEmail)
    return (
      <div className="mx-auto max-w-md px-4 py-20">
        <h1 className="text-4xl font-extrabold">Check your inbox</h1>
        <p className="mt-4 text-lg text-ink-soft">
          We sent a confirmation link to <strong>{email}</strong>. Open it on this device, then sign in.
        </p>
        <button className="btn-ghost mt-6" onClick={() => { setCheckEmail(false); setMode('signin') }}>Back to sign in</button>
      </div>
    )

  return (
    <div className="mx-auto max-w-md px-4 py-14 sm:py-20">
      <h1 className="text-4xl font-extrabold sm:text-5xl">{mode === 'signin' ? 'Welcome back' : 'Create your account'}</h1>
      <p className="mt-3 text-ink-soft">
        {mode === 'signin' ? 'Sign in to book cleaners and manage your jobs.' : 'One account lets you book cleaners and, if you like, work as one.'}
      </p>

      <div className="mt-8 grid grid-cols-2 rounded-full bg-mist p-1" role="tablist">
        {(['signin', 'signup'] as const).map((m) => (
          <button key={m} role="tab" aria-selected={mode === m} onClick={() => { setMode(m); setError(null) }}
            className={`rounded-full py-2 text-sm font-semibold transition-colors ${mode === m ? 'bg-white text-ink shadow-sm' : 'text-muted'}`}>
            {m === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
        {mode === 'signup' && (
          <div>
            <label className="label" htmlFor="name">Full name</label>
            <input id="name" className="input" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
          </div>
        )}
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" className="input" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="label" htmlFor="pw">Password</label>
          <input id="pw" type="password" className="input" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          {mode === 'signup' && <p className="mt-1 text-xs text-muted">At least 6 characters.</p>}
        </div>
        {error && <Notice tone="error">{error}</Notice>}
        <button className="btn-primary py-3 text-base" disabled={busy}>
          {busy ? 'One moment…' : mode === 'signin' ? 'Sign in' : 'Create account'}
        </button>
      </form>
    </div>
  )
}
