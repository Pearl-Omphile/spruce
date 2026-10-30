import { createClient } from '@supabase/supabase-js'

// Public project settings. The publishable key is designed to be public:
// Row Level Security in supabase/schema.sql controls what each visitor can do.
// Override locally with VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY in .env.local.
const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || 'https://oyfgdudkxvqgttgxnnxi.supabase.co'
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || 'sb_publishable_PoYzrSGi9O559_M2VQqxJQ_34NGhQYT'

/**
 * Email links (password reset, sign-up confirmation) come back with their
 * details in the "#..." part of the address, which this app also uses for
 * page routing. Note what kind of link it was before Supabase reads and
 * clears it, and turn an expired/invalid link into a friendly message.
 */
const hash = typeof window !== 'undefined' ? window.location.hash : ''
export const openedFromResetLink = /[#&]type=recovery(&|$)/.test(hash)
if (/[#&]error_code=/.test(hash)) {
  const params = new URLSearchParams(hash.replace(/^#\/?/, ''))
  const code = params.get('error_code')
  const text = code === 'otp_expired'
    ? 'That email link has expired or was already used. Request a new one below.'
    : params.get('error_description')?.replace(/\+/g, ' ') || 'That email link did not work. Request a new one below.'
  try { sessionStorage.setItem('spruce-auth-notice', text) } catch { /* ignore */ }
  window.history.replaceState(null, '', window.location.pathname + window.location.search + '#/auth?mode=forgot')
}

export const supabase = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true },
})

export const REPO_URL = (import.meta.env.VITE_REPO_URL as string | undefined) || 'https://github.com/Pearl-Omphile/spruce'
