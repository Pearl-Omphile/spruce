import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { openedFromResetLink, supabase } from '../lib/supabase'
import type { Cleaner, Profile } from '../lib/types'

interface AuthState {
  user: User | null
  profile: Profile | null
  /** The signed-in user's cleaner listing, if they've become a cleaner. */
  myCleaner: Cleaner | null
  loading: boolean
  refresh: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [myCleaner, setMyCleaner] = useState<Cleaner | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (s: Session | null) => {
    if (!s) {
      setProfile(null)
      setMyCleaner(null)
      return
    }
    const [p, c] = await Promise.all([
      supabase.from('profiles').select('id, full_name, phone, is_admin, client_rating_avg, client_rating_count').eq('id', s.user.id).maybeSingle(),
      supabase.from('cleaners').select('*').eq('user_id', s.user.id).maybeSingle(),
    ])
    setProfile(p.data ?? null)
    setMyCleaner(c.data ?? null)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session)
      await load(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s)
      // Opened a password-reset email: take the person straight to "choose a new password"
      if (event === 'PASSWORD_RECOVERY' || (openedFromResetLink && event === 'SIGNED_IN')) {
        window.location.hash = '#/reset-password'
      }
      // Defer DB calls out of the auth callback (recommended by Supabase)
      setTimeout(() => void load(s), 0)
    })
    return () => sub.subscription.unsubscribe()
  }, [load])

  const value: AuthState = {
    user: session?.user ?? null,
    profile,
    myCleaner,
    loading,
    refresh: () => load(session),
    signOut: async () => {
      await supabase.auth.signOut()
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
