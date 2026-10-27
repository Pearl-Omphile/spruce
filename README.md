# Spruce

**Book a trusted home cleaner near you, or earn as one.** Spruce is an on-demand cleaning marketplace for South Africa, in the spirit of Uber: clients find rated cleaners on a map, book by the hour in Rands, and leave a rating when the job is done. Cleaners set their own rate, services and area, and accept the jobs that suit them.

**Live demo:** https://pearl-omphile.github.io/spruce/

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
