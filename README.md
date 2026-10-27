# Spruce

**Book a trusted home cleaner near you, or earn as one.** Spruce is an on-demand cleaning marketplace for South Africa, in the spirit of Uber: clients find rated cleaners on a map, book by the hour in Rands, and leave a rating when the job is done. Cleaners set their own rate, services and area, and accept the jobs that suit them.

**Live demo:** https://pearl-omphile.github.io/spruce/

> Portfolio project. Bookings are stored for real, but no cleaner will actually arrive. Demo cleaners auto-accept, so you can try the full flow (book → confirm → mark done → rate) on your own.

## Features

**For clients**
- Map and list of cleaners, filtered by city or **your current location** (distance shown in km)
- Filter by service and maximum hourly rate; sort by closest, highest rated or cheapest
- Cleaner profiles with bio, services, experience, service area and reviews
- Booking form with live price (rate × hours), date, time, address and notes
- Bookings dashboard: track status, cancel, mark as done, and rate 1–5 stars

**For cleaners**
- "Become a cleaner" flow: set display name, bio, hourly rate, services and drop a pin for your work area
- Jobs inbox: accept or decline requests, see the client's name and contact, mark jobs complete
- Toggle "taking new bookings" when fully booked
- Average rating updates automatically as reviews come in

## Tech stack

| Layer | Choice |
| --- | --- |
| Frontend | React 19, TypeScript, Vite |
| Styling | Tailwind CSS v4 |
| Maps | Leaflet + OpenStreetMap (CARTO tiles), no API key needed |
| Backend | Supabase: Postgres, Auth (email + password), Row Level Security |
| Hosting | GitHub Pages, deployed by GitHub Actions on every push to `main` |

## How the backend is secured

The browser talks to Supabase directly with the public anon key, so **all the rules live in the database** (`supabase/schema.sql`), not in the UI:

- **Row Level Security** on every table. A booking is visible only to the client who made it and the cleaner it's for. Anyone can browse cleaner listings and reviews.
- **Server-side pricing.** A trigger sets `total_price = hourly_rate × hours` on insert, so a client can't send their own price.
- **Status machine.** A trigger allows only valid transitions by the right person: cleaner `pending → accepted/declined`, `accepted → completed`; client can cancel, or mark an accepted job as done.
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
