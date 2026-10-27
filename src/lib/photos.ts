import { useEffect, useState } from 'react'
import { supabase } from './supabase'

const BUCKET = 'visit-photos'

/** Shrink a phone photo to max 1280px JPEG so uploads are quick on mobile data. */
async function compress(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(() => null)
  if (!bitmap) return file
  const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  return new Promise((res) => canvas.toBlob((b) => res(b ?? file), 'image/jpeg', 0.8))
}

/**
 * Upload the arrival or departure photo into the booking's private folder,
 * then record it with check_in() / check_out() in the database.
 */
export async function checkInOrOut(bookingId: string, kind: 'in' | 'out', file: File) {
  const path = `${bookingId}/${kind}-${Date.now()}.jpg`
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, await compress(file), { contentType: 'image/jpeg' })
  if (upErr) throw upErr
  const { error } = await supabase.rpc(kind === 'in' ? 'check_in' : 'check_out', { bid: bookingId, photo: path })
  if (error) throw error
}

/** Short-lived private link to a visit photo (only works for the booking's client, cleaner and admin). */
export function usePhotoUrl(path: string | null) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!path) return
    let alive = true
    supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60).then(({ data }) => { if (alive) setUrl(data?.signedUrl ?? null) })
    return () => { alive = false }
  }, [path])
  return url
}
