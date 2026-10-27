export const rand = (n: number) =>
  'R' + n.toLocaleString('en-ZA', { maximumFractionDigits: 0 }).replace(/,/g, ' ')

/** Great-circle distance in km between two lat/lng points. */
export function distanceKm(a: [number, number], b: [number, number]) {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b[0] - a[0])
  const dLng = toRad(b[1] - a[1])
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export const km = (d: number) => (d < 1 ? '<1 km' : d < 10 ? `${d.toFixed(1)} km` : `${Math.round(d)} km`)

export function niceDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-ZA', {
    weekday: 'short', day: 'numeric', month: 'short',
  })
}

export const niceTime = (t: string) => t.slice(0, 5)

export const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')

export const todayISO = (plusDays = 0) => {
  const d = new Date()
  d.setDate(d.getDate() + plusDays)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 10)
}

/** Turn a Supabase/Postgres error into a sentence for the UI. */
export const errorText = (e: unknown) =>
  e && typeof e === 'object' && 'message' in e ? String((e as { message: string }).message) : 'Something went wrong. Try again.'

export function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}
