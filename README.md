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

* **Online booking** with 5 steps (Service → Vehicle → Price → Date/Time → Confirm)

  * Live **catalog** and **tiered pricing** (Small/Medium/Large/XL)
  * **Availability** grid backed by Redis **holds** (with countdown)
  * **Cloudflare Turnstile** protection on confirmation
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

## Getting Started (Windows Quick Start)

Use these exact commands from a PowerShell terminal at the repo root (`c:\a1-service-expert`). Adjust paths/ports only if you changed defaults.

1. Install pnpm deps

```
pnpm.cmd install
```

2. Start Postgres + Redis with Docker

```
docker-compose up -d
```

3. Configure env files (no secrets committed)

- Copy `apps/booking-api/.env.example` to `apps/booking-api/.env` and set:
  - `DATABASE_URL=postgresql://postgres:postgres@localhost:5433/a1_booking?schema=public`
  - `REDIS_URL=redis://localhost:6379`
  - `TURNSTILE_SECRET=dev_turnstile_secret` (Cloudflare Turnstile server key)
  - `SMTP_HOST=smtp.office365.com`
  - `SMTP_PORT=587`
  - `SMTP_SECURE=false`
  - `SMTP_USER=support@a1serviceexpert.com`
  - `SMTP_PASS=dev_smtp_password`
  - `MAIL_FROM_NAME="A1 Service Expert"`
  - `MAIL_FROM_EMAIL=support@a1serviceexpert.com`
  - `JWT_SECRET=change_me`
  - `SETTINGS_ENCRYPTION_KEY` to exactly 32 bytes (e.g. 32 ASCII chars)
- Copy `apps/booking-web/.env.example` to `apps/booking-web/.env` and set:
  - `VITE_API_BASE_URL=http://localhost:3000`
  - `VITE_TURNSTILE_SITE_KEY=dev_turnstile_site_key`
  - `USE_NEW_BOOKING_UI=true`

4. Migrate and seed database

```
pnpm.cmd --filter apps/booking-api prisma migrate deploy
pnpm.cmd --filter apps/booking-api prisma db seed
```

5. (Optional) Create demo users

```
node scripts/create-demo-users.js
```

6. Run dev servers in two terminals

Terminal A (API):

```
pnpm.cmd --filter apps/booking-api dev
```

Terminal B (Web):

```
pnpm.cmd --filter apps/booking-web dev
```

Then open http://localhost:5173.

Notes:
- Ensure the port in `apps/booking-api/.env` (`DATABASE_URL`) matches your Docker Postgres port (e.g. 5433).
- Emails log to the console if SMTP credentials are missing. Turnstile verification is skipped in dev unless forced via the Admin toggle.
- Production hardening: restrict the Dev page to admins only and add rate limits/CAPTCHA to public endpoints like holds and contact.

---

## Environment Variables

**API - `apps/booking-api/.env.example`**

```
DATABASE_URL=postgresql://postgres:postgres@localhost:55432/a1_booking?schema=public
REDIS_URL=redis://localhost:6379
TURNSTILE_SECRET=dev_turnstile_secret
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=support@a1serviceexpert.com
SMTP_PASS=dev_smtp_password
MAIL_FROM_NAME="A1 Service Expert"
MAIL_FROM_EMAIL=support@a1serviceexpert.com
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

**Web - `apps/booking-web/.env.example`**

```
VITE_API_BASE_URL=http://localhost:3000
VITE_TURNSTILE_SITE_KEY=dev_turnstile_site_key
USE_NEW_BOOKING_UI=true
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

---

## Production Setup (One‑Page Guide)

This checklist gets you from local to a secured production deploy. Replace placeholders like `app.example.com` and `api.example.com` with your domains.

1) Domains & DNS
- Decide frontend origin `https://app.example.com` and API origin `https://api.example.com`.
- Create DNS A/AAAA records to your server (or use DigitalOcean App Platform managed domains).

2) Database & Redis
- Prefer managed services (DigitalOcean Managed PostgreSQL and Managed Redis).
- Example connection strings:
  - Postgres: `postgresql://USER:PASSWORD@HOST:PORT/DBNAME?schema=public`
  - Redis: `redis://HOST:PORT`

3) API environment (apps/booking-api/.env)
- Set the following (do not commit real values):
  - `DATABASE_URL=postgresql://...` (managed PG or self-hosted)
  - `REDIS_URL=redis://...`
  - `TURNSTILE_SECRET=<cloudflare-turnstile-secret>`
  - `SMTP_HOST=<smtp-host>` / `SMTP_PORT=587` / `SMTP_SECURE=false`
  - `SMTP_USER=<inbox-user>` / `SMTP_PASS=<app-password>`
  - `MAIL_FROM_NAME="A1 Service Expert"`
  - `MAIL_FROM_EMAIL=support@a1serviceexpert.com`
  - `JWT_SECRET=<strong-random-string>`
  - `SETTINGS_ENCRYPTION_KEY=<exactly 32 bytes>`
  - `CORS_ORIGINS=https://app.example.com`
  - `DOCUMENTS_STORAGE_DIR=/var/lib/a1-service-expert/documents` (or a mounted volume)
  - `DOCUMENTS_BASE_URL=https://api.example.com`
  - `TIMEZONE=Europe/London`
  - `EMAIL_VERIFICATION_URL=https://app.example.com/verify-email`
  - `EXPOSE_VERIFICATION_TOKEN=false` (mandatory for prod)

4) Web environment (apps/booking-web/.env)
- `VITE_API_BASE_URL=https://api.example.com`
- `VITE_TURNSTILE_SITE_KEY=<cloudflare-turnstile-site-key>`
- `USE_NEW_BOOKING_UI=true`

5) Build & Run options
- Option A — Droplet (Docker for infra, host API/Web):
  - Install Docker & Compose on the server.
  - Use Compose only for Postgres/Redis (add persistence volumes), e.g.:
    ```yaml
    services:
      postgres:
        image: postgres:16-alpine
        environment:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: <pg-password>
          POSTGRES_DB: a1_booking
        ports: ["5432:5432"]
        volumes: ["pg_data:/var/lib/postgresql/data"]
      redis:
        image: redis:7-alpine
        ports: ["6379:6379"]
    volumes: { pg_data: {} }
    ```
  - Install Node 18+ and pnpm. Build and run:
    - Web: `cd apps/booking-web && pnpm build` (serve the `dist/` via nginx/Caddy)
    - API: `cd apps/booking-api && pnpm build && node dist/main.js` (or use PM2/systemd)
  - Reverse proxy with HTTPS (Caddyfile example):
    ```
    api.example.com {
      reverse_proxy localhost:3000
    }
    app.example.com {
      root * /srv/a1-service-expert/apps/booking-web/dist
      file_server
      try_files {path} /index.html
    }
    ```
- Option B — DigitalOcean App Platform (managed):
  - Create one service for API (root: `apps/booking-api`, build: `pnpm build`, run: `node dist/main.js`).
  - Create one static site for Web (root: `apps/booking-web`, build: `pnpm build`, output: `dist`). Enable SPA routing.
  - Provide all environment variables/secrets via the platform UI.
  - Use DO Managed Postgres/Redis and wire `DATABASE_URL`/`REDIS_URL`.

6) Migrate & Seed (run once per environment)
- From repo root (or inside `apps/booking-api`):
  - `pnpm --filter booking-api prisma migrate deploy`
  - `pnpm --filter booking-api prisma db seed`
  - `node scripts/create-demo-users.js` (creates admin + demo users)
  - In Admin > Settings, set DVLA key (encrypted) and click “Test DVLA”.

7) Production Hardening
- Keep `settings.captchaEnabled = true`; provide real Turnstile keys.
- Restrict `/dev` page to admins; remove from nav for standard users.
- Add throttling/CAPTCHA to Holds and Contact endpoints.
- Limit `CORS_ORIGINS` to your real frontend origin(s).

8) Smoke Test
- Web: load `https://app.example.com`, verify assets and SPA routing.
- Auth: register/login, verify email link (SMTP sender configured).
- Booking: run the full wizard; confirm documents download via API.

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
* `POST /bookings` - create booking (Turnstile protected)
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
* Cloudflare Turnstile: frontend **Site Key** in web `.env`, backend **Secret** in API `.env`.

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
