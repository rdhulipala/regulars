# Regulars

Booking for solo trainers, cooks and nannies: a provider drafts a week, publishes it when
it's confirmed, and clients batch-book slots with reschedule/cancel cutoffs and automatic
waitlist promotion. This is the real, database-backed version of the `slotted.html`
clickable prototype — the booking rules (cutoffs, waitlist, batch booking) are a direct
port of that prototype's logic into `src/lib/booking.ts`.

## Run it locally

1. **Get a free Postgres database.** [Neon](https://neon.tech) or
   [Supabase](https://supabase.com) both work — create a project, copy the connection
   string.
2. **Install dependencies** (this repo was scaffolded without network access, so this
   hasn't been run yet):
   ```bash
   npm install
   ```
3. **Configure env vars:**
   ```bash
   cp .env.example .env
   # paste your DATABASE_URL into .env
   ```
4. **Create the schema and seed demo data** (one trainer, "Coach Maya", with 10 clients
   and a published current week):
   ```bash
   npm run db:push
   npm run db:seed
   ```
5. **Run the app:**
   ```bash
   npm run dev
   ```
   - Provider dashboard: http://localhost:3000/provider/coach-maya
   - Public client booking page: http://localhost:3000/book/coach-maya

No Twilio account is required to try it — SMS sends just log to the console until you add
Twilio credentials to `.env`.

## Deploy

Push this to a GitHub repo, import it in [Vercel](https://vercel.com), add the same env
vars there, and it builds and installs dependencies automatically. Run
`npm run db:push && npm run db:seed` once (locally, pointed at the production
`DATABASE_URL`) to set up the live database.

## How it's organized

```
prisma/schema.prisma      Provider, SlotType, Week, Slot, Client, Booking
prisma/seed.ts            Demo data matching the clickable prototype
src/lib/time.ts           Date/cutoff formatting helpers
src/lib/booking.ts        Core rules: batch booking, cutoffs, waitlist promotion
src/lib/sms.ts            Twilio wrapper (stubs to console.log without credentials)
src/app/provider/[slug]   Provider dashboard (draft → publish, roster, capacity)
src/app/book/[slug]       Public client booking page (batch book, reschedule, cancel)
src/app/api/...           Routes the two pages above call
```

## What's intentionally out of scope for this MVP

- Payments, packages/credits
- Standing/recurring bookings (book the same slot every week automatically)
- Real auth (clients are identified by phone number only, no password)
- Multi-provider discovery/marketplace

These are reasonable "phase 2" items — see the product brief for the reasoning on why
they're deferred.
