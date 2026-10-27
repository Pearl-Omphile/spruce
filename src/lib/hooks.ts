import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { Cleaner } from './types'

export function useCleaners() {
  const [cleaners, setCleaners] = useState<Cleaner[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    supabase
      .from('cleaners')
      .select('*')
      .order('rating_avg', { ascending: false })
      .then(({ data, error }) => {
        if (!alive) return
        if (error) setError(error.message)
        else setCleaners((data ?? []) as Cleaner[])
        setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  return { cleaners, loading, error }
}

type GeoState = { status: 'idle' | 'asking' | 'ok' | 'denied' | 'unsupported'; coords: [number, number] | null }

/** Browser geolocation, only requested when the user asks for it. */
export function useMyLocation() {
  const [state, setState] = useState<GeoState>({ status: 'idle', coords: null })
  const request = () => {
    if (!('geolocation' in navigator)) return setState({ status: 'unsupported', coords: null })
    setState((s) => ({ ...s, status: 'asking' }))
    navigator.geolocation.getCurrentPosition(
      (pos) => setState({ status: 'ok', coords: [pos.coords.latitude, pos.coords.longitude] }),
      () => setState({ status: 'denied', coords: null }),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    )
  }
  return { ...state, request }
}
