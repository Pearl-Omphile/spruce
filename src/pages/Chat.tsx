import { SendHorizontal } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { Avatar, Notice, Spinner, StatusPill, TopBar } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { serviceById } from '../lib/catalog'
import { errorText, niceDate, niceTime } from '../lib/format'
import { supabase } from '../lib/supabase'
import type { Booking } from '../lib/types'

interface Message { id: string; booking_id: string; sender_id: string | null; sender_role: 'client' | 'cleaner'; body: string; created_at: string; read_at: string | null }

const QUICK = {
  client: ['Hi! Just confirming the time', 'The gate code is…', 'Please focus on the kitchen', 'Running a few minutes late to let you in'],
  cleaner: ["I'm on my way", "I'll be about 10 minutes late", "I'm outside", 'Do you have cleaning products, or should I bring mine?'],
}

const clock = (iso: string) => new Date(iso).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })
const dayLabel = (iso: string) => new Date(iso).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' })

export default function Chat() {
  const { id } = useParams()
  const { user, loading } = useAuth()
  const [b, setB] = useState<Booking | null>(null)
  const [otherName, setOtherName] = useState('')
  const [msgs, setMsgs] = useState<Message[] | null>(null)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const end = useRef<HTMLDivElement>(null)

  const role: 'client' | 'cleaner' = b && user && b.client_id === user.id ? 'client' : 'cleaner'

  const markRead = useCallback(() => { if (id) void supabase.rpc('mark_messages_read', { bid: id }) }, [id])

  // Booking, the other person's name, and the message history
  useEffect(() => {
    if (!id || !user) return
    ;(async () => {
      const { data: bk, error: e1 } = await supabase.from('bookings').select('*, cleaner:cleaners(id, display_name, suburb, city, is_demo)').eq('id', id).maybeSingle()
      if (e1 || !bk) return setError(e1?.message ?? 'This chat is not available.')
      setB(bk as Booking)
      if (bk.client_id === user.id) setOtherName(bk.cleaner?.display_name ?? 'Your cleaner')
      else {
        const { data: p } = await supabase.from('profiles').select('full_name').eq('id', bk.client_id).maybeSingle()
        setOtherName(p?.full_name || 'Your client')
      }
      const { data: m } = await supabase.from('messages').select('*').eq('booking_id', id).order('created_at')
      setMsgs((m ?? []) as Message[])
      markRead()
    })()
  }, [id, user, markRead])

  // Live updates: new messages appear instantly, and read ticks update
  useEffect(() => {
    if (!id) return
    const ch = supabase.channel(`chat-${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `booking_id=eq.${id}` }, (p) => {
        const m = p.new as Message
        setMsgs((cur) => (cur && !cur.some((x) => x.id === m.id) ? [...cur, m] : cur))
        if (m.sender_id !== user?.id) markRead()
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `booking_id=eq.${id}` }, (p) => {
        const m = p.new as Message
        setMsgs((cur) => cur?.map((x) => (x.id === m.id ? m : x)) ?? cur)
      })
      .subscribe()
    return () => { void supabase.removeChannel(ch) }
  }, [id, user?.id, markRead])

  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }) }, [msgs?.length])

  async function send(body: string) {
    if (!id || !body.trim()) return
    setBusy(true); setError(null)
    const { data, error } = await supabase.from('messages').insert({ booking_id: id, sender_role: role, body: body.trim() }).select('*').single()
    setBusy(false)
    if (error) return setError(errorText(error))
    setText('')
    setMsgs((cur) => (cur && !cur.some((x) => x.id === data.id) ? [...cur, data as Message] : cur))
    // Demo cleaners reply automatically; fetch in case live updates aren't connected
    if (b?.cleaner?.is_demo) setTimeout(async () => {
      const { data: m } = await supabase.from('messages').select('*').eq('booking_id', id).order('created_at')
      if (m) setMsgs(m as Message[])
    }, 1500)
  }

  if (loading) return <Spinner />
  if (!user) return <Navigate to={`/auth?next=/chat/${id}`} replace />
  if (error && !b) return <><TopBar title="Chat" /><div className="mt-6"><Notice tone="error">{error}</Notice></div></>
  if (!b || !msgs) return <><TopBar title="Chat" /><Spinner /></>

  const closed = b.status === 'declined' || b.status === 'cancelled'
  const submit = (e: FormEvent) => { e.preventDefault(); void send(text) }
  let lastDay = ''

  return (
    <div className="flex min-h-[calc(100dvh-24px)] flex-col lg:min-h-full">
      <TopBar right={<Avatar name={otherName} size={44} />} />
      <div className="-mt-1 mb-3">
        <h1 className="text-[1.7rem] leading-tight">{otherName}</h1>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm muted">
          {serviceById(b.service)?.name ?? b.service}, {niceDate(b.scheduled_date)} at {niceTime(b.start_time)} <StatusPill status={b.status} />
        </p>
      </div>

      <div className="flex flex-1 flex-col gap-2 pb-4" aria-live="polite">
        {msgs.length === 0 && (
          <div className="glass my-6 rounded-3xl p-5 text-center text-sm muted">
            Say hello. Use chat for arrival times, gate codes and what to focus on. For problems, use “Report a problem” on the booking.
          </div>
        )}
        {msgs.map((m) => {
          const mine = m.sender_role === role
          const day = dayLabel(m.created_at)
          const showDay = day !== lastDay
          lastDay = day
          return (
            <div key={m.id}>
              {showDay && <p className="my-3 text-center text-[11px] font-semibold muted">{day}</p>}
              <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-3xl px-4 py-2.5 text-[15px] leading-snug ${mine ? 'rounded-br-lg bg-sand text-deep' : 'glass rounded-bl-lg'}`}>
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <p className={`mt-1 text-right text-[10px] ${mine ? 'text-deep/60' : 'muted'}`}>
                    {clock(m.created_at)}{mine && (m.read_at ? ' · Seen' : ' · Sent')}{!m.sender_id && ' · automatic'}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
        <div ref={end} />
      </div>

      {closed ? (
        <div className="sticky bottom-0 pb-4"><Notice>This booking is {b.status}, so messages are off.</Notice></div>
      ) : (
        <div className="sticky bottom-0 z-[600] -mx-5 px-5 pb-[max(14px,env(safe-area-inset-bottom))] pt-3" style={{ background: 'linear-gradient(to top, rgb(7 28 51 / 0.97) 70%, transparent)' }}>
          {msgs.length < 3 && (
            <div className="no-scrollbar -mx-5 mb-2 flex gap-2 overflow-x-auto px-5">
              {QUICK[role].map((q) => (
                <button key={q} type="button" onClick={() => (q.endsWith('…') ? setText(q.replace('…', ' ')) : void send(q))}
                  className="chip chip-off shrink-0 !py-1.5 text-xs">{q}</button>
              ))}
            </div>
          )}
          {error && <div className="mb-2"><Notice tone="error">{error}</Notice></div>}
          <form onSubmit={submit} className="glass-strong flex items-end gap-2 rounded-[26px] p-1.5 pl-4">
            <label htmlFor="msg" className="sr-only">Message</label>
            <textarea id="msg" rows={1} maxLength={1000} value={text} placeholder="Write a message"
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(text) } }}
              className="max-h-32 min-h-[2.6rem] flex-1 resize-none bg-transparent py-2.5 text-shell placeholder:text-shell/45 focus:outline-none" />
            <button className="grid size-11 shrink-0 place-items-center rounded-full bg-sand text-deep disabled:opacity-40" disabled={busy || !text.trim()} aria-label="Send">
              <SendHorizontal size={19} />
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
