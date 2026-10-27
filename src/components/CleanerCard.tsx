import { Link } from 'react-router-dom'
import { km, rand } from '../lib/format'
import type { Cleaner } from '../lib/types'
import { Avatar, Stars } from './bits'

export default function CleanerCard({
  cleaner: c,
  distance,
  active,
  onHover,
}: {
  cleaner: Cleaner
  distance?: number
  active?: boolean
  onHover?: (id: string | null) => void
}) {
  return (
    <Link
      to={`/cleaners/${c.id}`}
      onMouseEnter={() => onHover?.(c.id)}
      onMouseLeave={() => onHover?.(null)}
      onFocus={() => onHover?.(c.id)}
      className={`flex gap-4 rounded-2xl border p-4 transition-colors ${
        active ? 'border-jac bg-mist' : 'border-line bg-white hover:border-jac'
      }`}
    >
      <Avatar name={c.display_name} size={56} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="truncate text-lg font-bold">{c.display_name}</h3>
          <p className="shrink-0 font-semibold">
            {rand(c.hourly_rate)}
            <span className="text-sm font-normal text-muted">/hr</span>
          </p>
        </div>
        <p className="text-sm text-muted">
          {c.suburb}, {c.city}
          {distance !== undefined && <> · {km(distance)} away</>}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          <Stars value={c.rating_avg} count={c.rating_count} />
          {!c.is_available && <span className="text-xs font-semibold text-warn">Not taking bookings</span>}
        </div>
        <p className="mt-2 line-clamp-1 text-sm text-ink-soft">{c.services.join(', ')}</p>
      </div>
    </Link>
  )
}
