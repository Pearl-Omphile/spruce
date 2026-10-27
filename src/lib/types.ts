export const SERVICES = [
  'Standard clean',
  'Deep clean',
  'Laundry & ironing',
  'Move-in / move-out',
  'Office clean',
  'Windows',
] as const

export type BookingStatus = 'pending' | 'accepted' | 'declined' | 'cancelled' | 'completed'

export interface Profile {
  id: string
  full_name: string
  phone: string | null
}

export interface Cleaner {
  id: string
  user_id: string | null
  display_name: string
  bio: string
  hourly_rate: number
  suburb: string
  city: string
  lat: number
  lng: number
  services: string[]
  years_experience: number
  is_available: boolean
  is_demo: boolean
  rating_avg: number
  rating_count: number
}

export interface Booking {
  id: string
  client_id: string
  cleaner_id: string
  service: string
  scheduled_date: string
  start_time: string
  hours: number
  address: string
  notes: string
  total_price: number
  status: BookingStatus
  created_at: string
  cleaner?: Pick<Cleaner, 'id' | 'display_name' | 'suburb' | 'city' | 'is_demo'>
  client?: Pick<Profile, 'full_name' | 'phone'> | null
  review?: { id: string }[]
}

export interface Review {
  id: string
  reviewer_name: string
  rating: number
  comment: string
  created_at: string
}

/** Rough city centres, used for "browse by city" and as a fallback location. */
export const CITIES: Record<string, [number, number]> = {
  Johannesburg: [-26.1367, 28.0417],
  Pretoria: [-25.7746, 28.2085],
  'Cape Town': [-33.9349, 18.4385],
  Durban: [-29.8051, 31.0303],
}
