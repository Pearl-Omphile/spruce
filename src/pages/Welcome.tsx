import { ArrowRight, BadgeCheck, CalendarClock, MapPin } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Logo } from '../components/AppShell'

export const WELCOME_KEY = 'spruce-welcomed'

/** First-launch screen, in the spirit of an app onboarding card. */
export default function Welcome() {
  const navigate = useNavigate()
  const start = () => {
    try { localStorage.setItem(WELCOME_KEY, '1') } catch { /* ignore */ }
    navigate('/', { replace: true })
  }

  return (
    <div className="flex min-h-dvh flex-col justify-between py-[max(24px,env(safe-area-inset-top))] lg:min-h-[calc(100dvh-4rem)]">
      {/* Decorative glass bubbles */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-16 top-24 size-64 rounded-full bg-gradient-to-br from-sky/40 to-transparent blur-2xl" />
        <div className="absolute -left-20 bottom-40 size-72 rounded-full bg-gradient-to-tr from-sand/30 to-transparent blur-3xl" />
        <div className="glass absolute right-8 top-40 size-24 rounded-full" />
        <div className="glass absolute left-10 top-72 size-12 rounded-full" />
        <div className="glass absolute bottom-56 right-16 size-16 rounded-full" />
      </div>

      <div className="relative rise"><Logo /></div>

      <div className="glass relative rounded-[36px] p-7 rise" style={{ animationDelay: '120ms' }}>
        <h1 className="text-[2.9rem] leading-[1.02]">Your home, freshly spruced.</h1>
        <p className="mt-4 text-[1.05rem] muted">Book a rated cleaner near you in under a minute. Pick a service, choose a time, and relax.</p>
        <ul className="mt-6 flex flex-col gap-3 text-sm">
          <li className="flex items-center gap-3"><BadgeCheck size={18} className="text-sand" /> Rated, reviewed local cleaners</li>
          <li className="flex items-center gap-3"><CalendarClock size={18} className="text-sand" /> Upfront price before you book</li>
          <li className="flex items-center gap-3"><MapPin size={18} className="text-sand" /> Joburg, Pretoria, Cape Town and Durban</li>
        </ul>
        <button className="btn-sand mt-8 w-full text-base" onClick={start}>
          Get started <ArrowRight size={18} />
        </button>
      </div>
    </div>
  )
}
