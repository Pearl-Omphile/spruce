import { createClient } from '@supabase/supabase-js'

// Public project settings. The publishable key is designed to be public:
// Row Level Security in supabase/schema.sql controls what each visitor can do.
// Override locally with VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY in .env.local.
const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || 'https://oyfgdudkxvqgttgxnnxi.supabase.co'
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || 'sb_publishable_PoYzrSGi9O559_M2VQqxJQ_34NGhQYT'

export const supabase = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true },
})

export const REPO_URL = (import.meta.env.VITE_REPO_URL as string | undefined) || 'https://github.com/Pearl-Omphile/spruce'
