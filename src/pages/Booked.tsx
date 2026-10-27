import { Check } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Avatar, Spinner } from '../components/ui'
import { serviceById } from '../lib/catalog'
import { niceDate, niceTime, rand } from '../lib/format'
import { supabase } from '../lib/supabase'
import type { Booking } from '../lib/types'

export default function Booked() {
  const { id } = useParams()
  const [b, setB] = useState<Booking | null>(null)

  useEffect(() => {
    supabase.from('bookings').select('*, cleaner:cleaners(id, display_name, suburb, city, is_demo)').eq('id', id!).single()
      .then(({ data }) => setB(data as Booking))
  }, [id])

  if (!b) return <Spinner />
  const confirmed = b.status === 'accepted'

  return (
    <div className="flex min-h-[85dvh] flex-col justify-center py-10 text-center">
      <div className="relative mx-auto grid size-28 place-items-center">
        <div aria-hidden className="absolute inset-0 rounded-full bg-sand/25 blur-2xl" />
        <div className="glass-strong relative grid size-24 place-items-center rounded-full rise">
          <Check size={44} className="text-sand" strokeWidth={2.4} />
        </div>
      </div>
      <h1 className="mt-8 text-[2.4rem]">{confirmed ? "You're booked" : 'Request sent'}</h1>
      <p className="mx-auto mt-3 max-w-xs muted">
        {confirmed
          ? `${b.cleaner?.display_name} confirmed and will see you ${niceDate(b.scheduled_date)} at ${niceTime(b.start_time)}.`
          : `${b.cleaner?.display_name} has your request. You'll see it change to confirmed in Bookings.`}
      </p>

      <div className="glass mx-auto mt-8 flex w-full items-center gap-4 rounded-3xl p-4 text-left">
        <Avatar name={b.cleaner?.display_name ?? 'Cleaner'} size={48} />
        <div className="flex-1">
          <p className="font-bold">{serviceById(b.service)?.name ?? b.service}, {b.hours} hrs</p>
          <p className="text-sm muted">{niceDate(b.scheduled_date)} at {niceTime(b.start_time)}</p>
        </div>
        <p className="text-lg font-bold text-sand">{rand(b.total_price)}</p>
      </div>

      <div className="mt-8 flex flex-col gap-3">
        <Link to="/bookings" className="btn-sand">See my bookings</Link>
        <Link to="/" className="btn-glass">Back to home</Link>
      </div>
    </div>
  )
}
