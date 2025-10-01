# A1 Service Expert — Booking Platform

Modern full-stack platform for automotive service booking.
Built with **NestJS + Prisma + Postgres + Redis** on the backend and **React + Vite + Tailwind** on the frontend. Includes an admin panel (catalog, prices, calendar, notifications, DVLA integration) and a customer booking wizard with live availability and slot holds.

## Contents

* [Features](#features)
* [Architecture](#architecture)
* [Screens & UX](#screens--ux)
* [Tech Stack](#tech-stack)
* [Getting Started](#getting-started)
* [Environment Variables](#environment-variables)
* [Common Scripts](#common-scripts)
* [Running with Docker](#running-with-docker)
* [Database & Seeding](#database--seeding)
* [Testing & Linting](#testing--linting)
* [Project Structure](#project-structure)
* [API Highlights](#api-highlights)
* [Pricing Source of Truth](#pricing-source-of-truth)
* [Security Notes](#security-notes)
* [Troubleshooting](#troubleshooting)
* [Contributing](#contributing)
* [License](#license)

---

## Features

* **Online booking** with 4 steps (Service → Vehicle → Price → Date/Time → Confirm)

  * Live **catalog** and **tiered pricing** (Small/Medium/Large/XL)
  * **Availability** grid backed by Redis **holds** (with countdown)
  * **reCAPTCHA** protection on confirmation
* **Admin panel**

  * **Services** & **Prices** management (reflects immediately in booking)
  * **Calendar** (exceptions, extra slots, UK bank-holiday import)
  * **Users** (scaffolding; list/search/invite/roles planned)
  * **Notification recipients** (add/remove who gets booking emails)
  * **Notification schedule** (immediate + day-of at 08:30; editable—model/UX ready)
  * **Settings** (company info, slot config, rate limits, DVLA)
  * **DVLA integration** (encrypted key rotation + test lookup)
* **My Account**

  * View profile & **booking history** (via `GET /bookings/mine`)
  * Document links (quotes/invoices) when available
* **Public site**

  * Clean, responsive design, dark hero, motion cards
  * “Fixed Price Menu Servicing” snippet and service tiers

---

## Architecture

Monorepo with pnpm workspaces:

* `apps/booking-api` — **NestJS** REST API (Postgres via Prisma, Redis for holds)
* `apps/booking-web` — **React/Vite** frontend (Tailwind)
* `packages/shared` — shared types/utilities (pricing helpers, etc.)

---

## Screens & UX

* **Home**: brand hero, services overview, fixed-price teaser
* **Services**: grid with icons + hover states, detailed sections
* **Book Online**: hero → service cards with “Price from £…” → wizard
* **Account**: dark hero, status chips, booking timeline/cards
* **Admin**: dashboard (planned hero metrics) + managers in consistent cards

---

## Tech Stack

**Backend**: NestJS, Prisma, PostgreSQL, Redis, Jest
**Frontend**: React, Vite, TypeScript, Tailwind CSS
**DevOps**: pnpm workspaces, Docker Compose, ESLint, Prettier

---

## Getting Started

> **Windows/PowerShell tip**: use `pnpm.cmd` instead of `pnpm`.

1. **Install dependencies**

```bash
pnpm.cmd install
```

2. **Spin up Postgres + Redis (dev)**

```bash
docker-compose up -d
```

3. **Configure env files**

* Copy examples and fill in placeholders (no secrets committed):

  * `apps/booking-api/.env` (based on `.env.example`)
  * `apps/booking-web/.env` (based on `.env.example`)

> Ensure `SETTINGS_ENCRYPTION_KEY` is **exactly 32 bytes** (e.g., 32-char ASCII).
> Keep all real secrets out of Git.

4. **Migrate & seed the database**

```bash
# from repo root
pnpm.cmd --filter booking-api prisma migrate deploy
pnpm.cmd --filter booking-api prisma db seed
```

5. **Run the servers (separate terminals)**

```bash
# API (Nest)
pnpm.cmd --filter booking-api dev

# Web (Vite)
pnpm.cmd --filter booking-web dev
```

> The combined `pnpm dev` script may not match your workspace filters; running each app separately is recommended.

---

## Environment Variables

**API — `apps/booking-api/.env.example`**

```
DATABASE_URL=postgresql://postgres:postgres@localhost:55432/a1_booking?schema=public
REDIS_URL=redis://localhost:6379
RESEND_API_KEY=your_resend_key_here
RECAPTCHA_SECRET=your_recaptcha_v2_secret_here
DVLA_API_KEY=your_dvla_api_key_here
TIMEZONE=Europe/London
JWT_SECRET=change_me
EMAIL_VERIFICATION_URL=http://localhost:5173/verify-email
EXPOSE_VERIFICATION_TOKEN=true
JWT_EXPIRES_IN=1h
CORS_ORIGINS=http://localhost:5173
DOCUMENTS_STORAGE_DIR=storage/documents
DOCUMENTS_BASE_URL=http://localhost:3000
SETTINGS_ENCRYPTION_KEY=32_bytes_exactly_here
```

**Web — `apps/booking-web/.env.example`**

```
VITE_API_BASE_URL=http://localhost:3000
VITE_RECAPTCHA_SITE_KEY=your_recaptcha_v2_site_key_here
```

---

## Common Scripts

```bash
# API
pnpm.cmd --filter booking-api dev              # run API in watch mode
pnpm.cmd --filter booking-api test             # run Jest tests
pnpm.cmd --filter booking-api prisma migrate dev
pnpm.cmd --filter booking-api prisma db seed

# Web
pnpm.cmd --filter booking-web dev              # run Vite dev server
pnpm.cmd --filter booking-web lint             # run ESLint on src/**/*.ts(x)
```

---

## Running with Docker

```bash
# Start Postgres + Redis services for local development
docker-compose up -d

# Stop services
docker-compose down
```

(You can add app containers later if you want full dockerized dev/prod.)

---

## Database & Seeding

* Prisma schema is under `apps/booking-api/prisma/`.
* Initial data (services, tiers, prices) seeded via `prisma/seed.ts`.
* **Source of truth for prices is the DB** (see below). Admin edits should reflect in both `/catalog` and booking totals.

---

## Testing & Linting

**API tests (Jest)**
Includes a **pricing regression** test that ensures:

* Update a service price in DB → `/catalog` reflects it → booking totals match DB value.

```bash
pnpm.cmd --filter booking-api test
```

**Web lint**
ESLint checks TypeScript/React best practices (hooks order, unused vars, etc.):

```bash
pnpm.cmd --filter booking-web lint
```

---

## Project Structure

```
apps/
  booking-api/
    prisma/                 # schema, migrations, seed
    src/
      admin/                # admin controllers (calendar, recipients, settings, dvla)
      availability/         # availability service + specs
      bookings/             # bookings controller/service (uses DB prices)
      catalog/              # catalog summary from DB
      holds/                # slot holds via Redis
      settings/             # settings incl. encrypted DVLA key
      vehicles/             # /vehicles/vrm lookup
      documents/            # quotes/invoices (helpers)
  booking-web/
    public/media/           # hero video
    src/
      features/admin/       # admin managers (catalog, calendar, recipients, settings)
      features/booking/     # booking wizard (steps, state, api)
      pages/                # Home/Services/Account/Admin/Login/Register/…
packages/
  shared/                   # shared pricing/types
```

---

## API Highlights

* `GET /catalog` — services, engine tiers, **live** prices
* `GET /availability` — available dates/slots
* `POST /holds` / `DELETE /holds/:id` — reserve/release a slot (Redis TTL)
* `POST /bookings` — create booking (reCAPTCHA enabled)
* `GET /bookings/mine` — bookings for the authenticated user
* `POST /auth/register` / `POST /auth/login` / `POST /auth/verify-email`
* `PUT /admin/settings/dvla` & `POST /admin/settings/test-dvla` — encrypted DVLA key + test lookup
* `POST /admin/recipients` — manage notification recipients
* `POST /admin/calendar/exception` / `POST /admin/calendar/extra-slot`
* *(Planned)* `GET/POST /admin/users`, `/admin/dashboard` aggregates, notification schedule fields

---

## Pricing Source of Truth

Prices are loaded **only** from Postgres (`servicePrice.amountPence`).
We removed old `PRICES_PENCE` fallbacks to prevent drift. A regression test enforces:

1. Update a price in DB
2. `/catalog` returns the updated price
3. Booking totals & stored line items match

---

## Security Notes

* Never commit real secrets. Only use `.env` locally or a secret manager in production.
* `SETTINGS_ENCRYPTION_KEY` must be exactly **32 bytes** for AES-GCM.
* DVLA key is stored **encrypted**; rotate via admin settings.
* reCAPTCHA: frontend **Site Key** in web `.env`, backend **Secret** in API `.env`.

---

## Troubleshooting

* **PowerShell + pnpm**: use `pnpm.cmd` (e.g., `pnpm.cmd --filter booking-web dev`).
* **CRLF warnings**: harmless; Git will normalize line endings. You can configure `core.autocrlf` if desired.
* **Dev script doesn’t start both apps**: run API and Web in separate terminals (filters differ by workspace name).
* **Booking totals don’t match**: ensure DB seeded/migrated, server restarted, and no stale constants remain.

---

## Contributing

1. Fork & create a topic branch
2. Run lint/tests locally
3. Submit a PR with clear description and screenshots for UI changes

---

## License

Copyright © A1 Service Expert.
All rights reserved unless a separate license file is added.
