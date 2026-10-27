import { Building2, Shirt, Sparkles, SprayCan, Truck, AppWindow, type LucideIcon } from 'lucide-react'

/**
 * Services and add-ons. Pricing mirrors estimate_hours() / addon_price() in
 * supabase/schema.sql, which is what actually sets the price on the server.
 */
export interface Service {
  id: string // matches cleaners.services[] and bookings.service
  name: string
  blurb: string
  icon: LucideIcon
  base: number
  perBed: number
  perBath: number
  roomLabel: string
}

export const SERVICE_LIST: Service[] = [
  { id: 'Standard clean', name: 'Home clean', blurb: 'Dusting, floors, kitchen and bathrooms', icon: SprayCan, base: 2, perBed: 0.5, perBath: 0.5, roomLabel: 'Bedrooms' },
  { id: 'Deep clean', name: 'Deep clean', blurb: 'Top to bottom, behind and under', icon: Sparkles, base: 3, perBed: 1, perBath: 0.75, roomLabel: 'Bedrooms' },
  { id: 'Move-in / move-out', name: 'Move in / out', blurb: 'Empty-home clean for your deposit', icon: Truck, base: 4, perBed: 1, perBath: 1, roomLabel: 'Bedrooms' },
  { id: 'Office clean', name: 'Office', blurb: 'Desks, kitchenette and bathrooms', icon: Building2, base: 3, perBed: 0.5, perBath: 0.5, roomLabel: 'Rooms' },
  { id: 'Laundry & ironing', name: 'Laundry', blurb: 'Wash, fold and iron', icon: Shirt, base: 3, perBed: 0, perBath: 0, roomLabel: 'Bedrooms' },
  { id: 'Windows', name: 'Windows', blurb: 'Inside and out, frames and tracks', icon: AppWindow, base: 2, perBed: 0.5, perBath: 0, roomLabel: 'Bedrooms' },
]

export const serviceById = (id: string) => SERVICE_LIST.find((s) => s.id === id)

export const ADDONS = [
  { id: 'oven', name: 'Inside the oven', price: 120 },
  { id: 'fridge', name: 'Inside the fridge', price: 90 },
  { id: 'cabinets', name: 'Inside cupboards', price: 100 },
  { id: 'windows_in', name: 'Interior windows', price: 150 },
  { id: 'balcony', name: 'Balcony or patio', price: 100 },
  { id: 'ironing', name: 'Ironing, one basket', price: 110 },
] as const

export const addonById = (id: string) => ADDONS.find((a) => a.id === id)

export function estimateHours(serviceId: string, beds: number, baths: number) {
  const s = serviceById(serviceId)
  if (!s) return 3
  return Math.min(10, Math.max(2, Math.ceil(s.base + s.perBed * (beds - 1) + s.perBath * (baths - 1))))
}

export const addonsTotal = (ids: string[]) => ids.reduce((t, id) => t + (addonById(id)?.price ?? 0), 0)

export const TIME_SLOTS = ['07:00', '08:00', '09:00', '10:00', '12:00', '14:00']
