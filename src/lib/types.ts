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
  is_admin?: boolean
  client_rating_avg?: number
  client_rating_count?: number
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
  /** 0 = Sunday ... 6 = Saturday */
  work_days: number[]
  work_start: string
  work_end: string
  is_demo: boolean
  rating_avg: number
  rating_count: number
  created_at?: string
}

export interface Booking {
  id: string
  client_id: string
  cleaner_id: string
  service: string
  scheduled_date: string
  start_time: string
  hours: number
  bedrooms: number
  bathrooms: number
  addons: string[]
  address: string
  notes: string
  total_price: number
  status: BookingStatus
  created_at: string
  cleaner?: Pick<Cleaner, 'id' | 'display_name' | 'suburb' | 'city' | 'is_demo'>
  client?: Pick<Profile, 'full_name' | 'phone' | 'client_rating_avg' | 'client_rating_count'> | null
  review?: { id: string }[]
  client_review?: { id: string }[]
  complaints?: Complaint[]
  checked_in_at: string | null
  checkin_photo: string | null
  checked_out_at: string | null
  checkout_photo: string | null
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

export type ComplaintCategory = 'no_show' | 'late' | 'damage' | 'missing_item' | 'poor_clean' | 'unsafe' | 'payment' | 'other'

export interface Complaint {
  id: string
  booking_id: string
  raised_by: string
  raised_as: 'client' | 'cleaner'
  category: ComplaintCategory
  details: string
  status: 'open' | 'resolved'
  admin_note: string
  created_at: string
  resolved_at: string | null
}

export const COMPLAINT_LABELS: Record<ComplaintCategory, string> = {
  no_show: "Didn't show up",
  late: 'Very late',
  damage: 'Something was damaged',
  missing_item: 'Something is missing',
  poor_clean: 'Poor cleaning',
  unsafe: 'Rude or unsafe behaviour',
  payment: 'Payment problem',
  other: 'Something else',
}
