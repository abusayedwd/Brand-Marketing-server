# Brivio API (`Brand-Marketing-server`)

Express + MongoDB + Stripe + Socket.IO backend for the Brivio platform.

## Setup

```bash
cp .env.example .env
npm install
npm run dev
```

- Health / API base: `http://localhost:3050/v1`
- Swagger (development): `http://localhost:3050/v1/docs`

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Nodemon local server |
| `npm start` | Production start |
| `npm test` | Jest unit tests (no DB required) |
| `npm run seed` | Seed helpers |

## Notable routes

- Auth: `/v1/auth/*`
- Campaigns: `/v1/campaigns/*` (includes public `GET /campaigns/open`)
- Payments / Stripe webhooks
- Withdrawals, notifications, CMS content, plans, favorites, ratings, support

See root [`README.md`](../README.md) and [`PROJECT.md`](../PROJECT.md).
