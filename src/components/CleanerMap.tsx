import L from 'leaflet'
import { useEffect } from 'react'
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { Link } from 'react-router-dom'
import { rand } from '../lib/format'
import type { Cleaner } from '../lib/types'

const pin = (label: string, active: boolean) =>
  L.divIcon({
    className: '',
    html: `<div class="spruce-pin${active ? ' is-active' : ''}"><span>${label}</span></div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -38],
  })

const meIcon = L.divIcon({ className: '', html: '<div class="spruce-me"></div>', iconSize: [18, 18], iconAnchor: [9, 9] })

function Recenter({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap()
  const [lat, lng] = center
  useEffect(() => {
    map.flyTo([lat, lng], zoom, { duration: 0.8 })
  }, [lat, lng, zoom, map])
  return null
}

function ClickToPick({ onPick }: { onPick: (p: [number, number]) => void }) {
  useMapEvents({ click: (e) => onPick([e.latlng.lat, e.latlng.lng]) })
  return null
}

interface Props {
  cleaners: Cleaner[]
  center: [number, number]
  zoom?: number
  me?: [number, number] | null
  activeId?: string | null
  onSelect?: (id: string) => void
  /** Picker mode: clicking the map sets a location (used on "Become a cleaner"). */
  onPick?: (p: [number, number]) => void
  className?: string
}

export default function CleanerMap({ cleaners, center, zoom = 12, me, activeId, onSelect, onPick, className }: Props) {
  return (
    <MapContainer center={center} zoom={zoom} scrollWheelZoom={false} className={className} attributionControl>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />
      <Recenter center={center} zoom={zoom} />
      {onPick && <ClickToPick onPick={onPick} />}
      {me && <Marker position={me} icon={meIcon} title="You" />}
      {cleaners.map((c) => (
        <Marker
          key={c.id}
          position={[c.lat, c.lng]}
          icon={pin(`R${c.hourly_rate}`, c.id === activeId)}
          title={c.display_name}
          eventHandlers={{ click: () => onSelect?.(c.id) }}
        >
          {!onPick && (
            <Popup>
              <strong className="font-display text-base">{c.display_name}</strong>
              <br />
              {c.suburb} · {rand(c.hourly_rate)}/hr
              <br />
              <Link to={`/cleaners/${c.id}`} className="font-semibold text-jac-deep">
                View profile
              </Link>
            </Popup>
          )}
        </Marker>
      ))}
    </MapContainer>
  )
}
