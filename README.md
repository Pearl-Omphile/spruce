# Spruce

**Book a trusted home cleaner near you, or earn as one.** Spruce is an on-demand cleaning marketplace for South Africa, in the spirit of Uber: clients find rated cleaners on a map, book by the hour in Rands, and leave a rating when the job is done. Cleaners set their own rate, services and area, and accept the jobs that suit them.

**Live demo:** https://pearl-omphile.github.io/spruce/  
**Android app:** [download spruce.apk](https://github.com/Pearl-Omphile/spruce/releases/latest/download/spruce.apk) (iPhone: open the live demo in Safari → Share → Add to Home Screen)

> Portfolio project. Bookings are stored for real, but no cleaner will actually arrive. Demo cleaners auto-accept, so you can try the full flow (book → confirm → mark done → rate) on your own.

## Features

**Booking, Uber-style**
1. Pick a service: home clean, deep clean, move in / out, office, laundry, windows
2. Set home size (bedrooms, bathrooms) and extras like inside the oven or fridge
3. Choose a date from a 14-day strip, a time slot, and your address (or use your location)
4. Get matched: nearby cleaners ranked by rating and distance, with a "Best match" and the full price for each
5. Review the price breakdown and confirm. Pay on the day.

**Availability and no double booking**
- Cleaners choose their working days and hours (e.g. Mon to Fri, 08:00 to 16:00)
- The booking flow only offers cleaners who are free for the whole job; busy ones show why ("Booked from 09:00", "Doesn't work Sundays")
- When you book a specific cleaner, the date and time pickers grey out the times they can't do
- The database itself refuses overlapping bookings with a Postgres **exclusion constraint** on `(cleaner_id, time range)`, so two people pressing "Confirm" at the same moment can't both get the slot. Cancelled or declined bookings free the time again.

**Trust and safety**
- **Check-in and check-out photos:** the cleaner must take a photo with their phone camera when they arrive and when they leave. Photos go to a private storage bucket; only that booking's client, its cleaner and the admin can view them. A job can't be completed by the cleaner without the check-out photo, and the client can't cancel once the cleaner has arrived.
- **Two-way ratings:** clients rate cleaners, and cleaners rate clients. Cleaners see a client's rating on job requests before accepting.
- **Report a problem:** either side can report a booking (no-show, damage, missing item, unsafe behaviour…). Reports go to the admin inbox with the booking's visit photos, and the reporter sees the outcome.

**Chat**
- Client and cleaner can message each other about a booking, with live updates (Supabase Realtime), "Seen" receipts, unread badges and quick replies
- Only the two people on the booking can read or post (the admin can read, for handling reports); messages close when a booking is cancelled or declined
- Demo cleaners send one automatic reply so visitors can try it

**Admin (site owner only)**
- Reports inbox: read complaints, view the visit photos, reply with a note and mark resolved
- Stats, new cleaners and sign-ups since your last visit, every booking, and contact details
- Pause or resume any cleaner listing
- `is_admin` can only be set from the Supabase SQL editor; `admin_people()` and the admin read policies check it in the database

**Also**
- Explore tab with a map of cleaners, filter by city, "near me", service, rating or price
- Cleaner profiles with stats, services, service area and reviews
- Bookings tab (upcoming / past): cancel, mark done, rate 1–5 stars
- Cleaner mode: create a profile with your rate, services and map pin; accept or decline job requests
- **Installable on Android and iPhone** as a web app (manifest, icons, offline-ready service worker)
- Frosted-glass design in deep ocean blue and sand, built mobile-first; on desktop it shows as a phone frame

## Tech stack

| Layer | Choice |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, installable PWA |
| Styling | Tailwind CSS v4 |
| Maps | Leaflet + OpenStreetMap (CARTO tiles), no API key needed |
| Backend | Supabase: Postgres, Auth (email + password), Row Level Security |
| Hosting | GitHub Pages, deployed by GitHub Actions on every push to `main` |
| Android | Capacitor 8 wraps the same web app; `.github/workflows/android.yml` builds `spruce.apk` on every push and attaches it to a GitHub release |

## How the backend is secured

The browser talks to Supabase directly with the public anon key, so **all the rules live in the database** (`supabase/schema.sql`), not in the UI:

- **Row Level Security** on every table. A booking is visible only to the client who made it and the cleaner it's for. Anyone can browse cleaner listings and reviews.
- **Server-side pricing.** On insert, `estimate_hours()` works out the hours from the service and home size, and `total_price = hourly_rate × hours + add-ons` is set by a trigger. Whatever price the browser sends is ignored.
- **Status machine.** A trigger allows only valid transitions by the right person: cleaner `pending → accepted/declined`, `accepted → completed`; client can cancel, or mark an accepted job as done.
- **No double booking.** `bookings.slot` is a generated `tsrange`; `exclude using gist (cleaner_id with =, slot with &&) where status in ('pending','accepted')` makes overlaps impossible. The insert trigger also checks the cleaner's working days and hours. `busy_slots(day)` exposes only busy times (no client names or addresses) so the app can show who's free.
- **Honest ratings.** Reviews are only accepted for the client's own completed booking (one per booking). Column-level grants stop users editing `rating_avg`, `rating_count`, `is_demo` or prices directly.
- **Privacy.** A cleaner can read a client's profile only if that client has booked them. Reviews store a first name only.

These rules were tested against a local Postgres with simulated users before shipping.

## Data model

```
auth.users ─┬─< profiles        (full_name, phone)
            ├─< cleaners        (rate, services[], suburb, city, lat/lng, rating_avg, is_available)
            ├─< bookings >──────┘ (service, date, time, hours, address, total_price, status)
            └─< reviews  >── bookings (1:1), cleaners (rating 1–5, comment)
```

## Run it locally

1. Create a free project at [supabase.com](https://supabase.com).
2. In the Supabase **SQL Editor**, run `supabase/schema.sql`, then `supabase/seed.sql` (15 demo cleaners across Joburg, Pretoria, Cape Town and Durban).
3. Optional, for a smoother demo: **Authentication → Sign In / Providers → Email**, turn off "Confirm email".
4. Copy `.env.example` to `.env.local` and fill in your project URL and anon key.
5. `npm install && npm run dev`

## Deploy

Pushing to `main` builds and deploys to GitHub Pages via `.github/workflows/deploy.yml`. In the repo set:

- **Settings → Pages → Source:** GitHub Actions
- `src/lib/supabase.ts` holds the Supabase URL and **publishable** key. These are public by design (RLS enforces access); never commit the secret/service-role key.
- In Supabase **Authentication → URL Configuration**, add the Pages URL as the Site URL so email links return to the app.

## Ideas for next steps

- Payments with PayFast or Yoco
- Cleaners rating clients (two-way trust)
- Real-time job updates with Supabase Realtime
- Recurring weekly bookings
- ID verification badge for cleaners
