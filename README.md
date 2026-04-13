# Fintor (invest-grow)

**Fintor** is a gamified paper-trading web app: users sign up, get a virtual cash balance from onboarding, then buy and sell U.S. stocks against **live quotes** while an **AI assistant** (Google Gemini) explains concepts. Market data and news are proxied through a small **Flask** backend so API keys stay off the browser; accounts, holdings, and history live in **Supabase**.

This repository is a Vite + React + TypeScript SPA with a Python companion server under `server/`.

## What you get

- **Landing & auth** — marketing page, Supabase email/password sign-in and sign-up.
- **Onboarding** — experience level, age band, and starting virtual capital (written to the user’s `profiles` row).
- **Dashboard** — snapshot of cash, confidence score, holdings with refreshed quotes, and a small “top movers” strip fed by Finnhub when the backend is up.
- **Market** — search symbols (Finnhub), browse, and open a **per-symbol** detail view with quotes and context links.
- **Portfolio** — paper buy/sell, transaction history, and sells backed by Supabase RPCs/migrations.
- **News** — Finnhub market headlines (category + pagination via the server).
- **Leaderboard** — merges demo “traders” with **your** total return so you always have a board to compare against.
- **AI chat** — text replies from Gemini; optional **voice** via browser speech recognition, Gemini TTS, and/or **ElevenLabs** audio proxied at `/api/elevenlabs/tts` so the ElevenLabs key never ships to the client.

`/watchlist` redirects to `/market` (watchlist data still exists in Supabase for future UI).

## Tech stack

| Area | Choice |
|------|--------|
| UI | React 18, TypeScript, Tailwind CSS, shadcn/ui (Radix), Framer Motion, Recharts |
| Data fetching | TanStack Query |
| Routing | React Router v6 |
| Backend | Flask 3 (`server/main.py`) — Finnhub + ElevenLabs proxies, rate-limited |
| Auth & DB | Supabase (Auth + Postgres: `profiles`, `holdings`, `transactions`, `watchlist`, `sold_stocks`, …) |
| AI | Gemini (client-side key for chat/TTS models configured in Vite env) |

## Prerequisites

- **Node.js** (LTS recommended) and npm  
- **Python 3** with pip (for the Flask API)

## Quick start

1. **Clone and install the frontend**

   ```bash
   npm install
   ```

2. **Install Python dependencies for the API**

   ```bash
   pip install -r server/requirements.txt
   ```

   (A virtual environment under `server/.venv` or the repo root is recommended but not required.)

3. **Environment variables**

   Copy `.env.example` to `.env` at the **repository root** and fill in the values you need. The Flask process loads the root `.env` first (see `server/main.py`). Comments in `.env.example` describe each variable; in short:

   - **Vite (prefix `VITE_`)** — Supabase URL + anon/publishable key, Gemini API key and model IDs.
   - **Flask (no `VITE_` prefix)** — `FINNHUB_API_KEY`, optional `ELEVENLABS_API_KEY` / `ELEVENLABS_VOICE_ID`, `FLASK_PORT` (default **5050**).

   Do **not** use port **5000** for Flask on macOS if AirPlay Receiver is enabled; the app and Vite proxy assume **5050** by default.

4. **Supabase schema**

   In the Supabase SQL editor, run the migrations in `supabase/migrations/` **in filename order**. The example file documents optional follow-up migrations for paper sells / `sold_stocks`.

5. **Run everything (recommended)**

   ```bash
   npm run dev
   ```

   This starts **Vite** (dev server, default [http://localhost:8080](http://localhost:8080)) and **Flask** together. Vite proxies `/api/*` to `http://127.0.0.1:${FLASK_PORT}` (see `vite.config.ts`).

   **Run services separately** (optional):

   ```bash
   npm run web    # Vite only
   npm run api    # Flask only (from repo root)
   ```

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Vite + Flask via `concurrently` |
| `npm run web` | Frontend only |
| `npm run api` | `cd server && python main.py` |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build (proxy still applies) |
| `npm run lint` | ESLint |
| `npm test` / `npm run test:watch` | Vitest |

## API surface (Flask)

All routes are under `/api` (same path the Vite dev server proxies).

- `GET /api/stocks/search?q=` — symbol search (Finnhub)  
- `GET /api/stocks/quote/<symbol>` — quote  
- `GET /api/stocks/profile/<symbol>` — company profile  
- `GET /api/stocks/news?category=&minId=` — headlines  
- `POST /api/elevenlabs/tts` — JSON `{ "text": "...", "voice_id": "optional" }` → audio (requires server-side ElevenLabs config)

If `FINNHUB_API_KEY` is missing, quote/search/news endpoints respond with **503** and the UI falls back where it can.

## Project layout (high level)

```
src/
  pages/           # Landing, Auth, Onboarding, Dashboard, Market, Portfolio, News, Leaderboard, …
  components/      # App shell, sidebar, Chatbot, UI primitives
  hooks/           # Paper portfolio + React Query hooks
  api/             # Client calls into `/api` (Finnhub proxy)
  lib/             # Gemini, helpers, formatting
  integrations/supabase/
server/
  main.py          # Flask app
  requirements.txt
supabase/migrations/
```

## Deployment notes

- For production, set **`VITE_API_URL`** to your deployed backend **origin only** (no `/api` suffix); when unset, the browser uses relative `/api` (works with the Vite proxy in dev or a reverse proxy in prod).
- Never expose **Finnhub** or **ElevenLabs** keys in the frontend bundle; keep them on the server.

## License / attribution

This project was bootstrapped with tooling that includes **Lovable**-oriented dependencies (for example `lovable-tagger` in development). Product naming in the UI is **Fintor**.
