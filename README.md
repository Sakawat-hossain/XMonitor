# XMonitor

Self-hosted server monitoring platform — a Nezha-style monitor with two unique additions: **multi-hop relay chain visualization** and **geo-aware reachability monitoring** ("Blocked in [country]" detection).

## Features

**Monitoring**
- Live server metrics (CPU, memory, disk, network) over WebSocket, with per-server history charts
- HTTP / TCP / ping service monitoring with real probes, uptime %, and a public status page
- Geo-aware probes: a reachability matrix per server across global vantage points, surfacing country-level blocking
- Multi-hop relay chain visualization (🇨🇳 entry → 🇭🇰 relay → 🇸🇬 main → Internet) with per-hop latency and hidden-node indicators
- Interactive world map of server locations colored by health

**Alerting**
- Threshold rules (CPU/memory/disk/offline/service-down) with cooldowns and muting
- Notification channels: Telegram, Discord, Slack, generic webhook, ntfy, Gotify, Bark, SMTP email — each with test-send

**Operations**
- WebSSH: browser terminal to any server (xterm.js ↔ SSH bridge)
- SFTP file manager: browse, upload, download, delete
- Scheduled tasks (cron) with human-readable schedules and run history
- Audit log, scoped API tokens (`xmt_…`, read or full), JSON backup/restore

**UX**
- Public status pages (no login) + JWT-protected admin panel (`admin / admin123`, change on first login)
- Light/dark/system themes; English, 中文, বাংলা, 日本語

## Run (development)

Open **two terminals**.

**Terminal 1 — Backend (port 8080):**

```bash
cd backend
go run ./cmd/server
```

**Terminal 2 — Frontend (port 3000):**

```bash
cd frontend
npm install   # first time only
npm run dev
```

| URL | What |
|-----|------|
| http://localhost:3000 | Public dashboard (live over WebSocket) |
| http://localhost:3000/chains | Relay chain visualization |
| http://localhost:3000/service-status | Public service status |
| http://localhost:3000/map | World map |
| http://localhost:3000/admin | Admin panel (login required) |
| http://localhost:8080/health | Backend health check |

## Default admin login

- Username: `admin` / Password: `admin123` (you'll be prompted to change it)

## API

- Public (no auth): `GET /api/v1/{servers,chains,services,probes,settings}` and per-server `metrics` / `reachability`
- Auth: `POST /api/v1/auth/login` → JWT (24h); or generate an API token in the admin panel and send `Authorization: Bearer xmt_…`
- Admin (auth): full CRUD under `/api/v1/admin/*`
- Live updates: WebSocket at `/ws`

## Environment variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `JWT_SECRET` | dev fallback | JWT signing secret — **set this in production** |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8080` | Backend URL used by the frontend |

## Current limitations (roadmap)

- **In-memory store** — data resets on backend restart (export a backup from Settings first). SQLite persistence is next.
- **Agent not yet built** — server metrics are simulated; cron commands record as `no_agent`; probes are simulated. The `agent/` and `probe/` components will replace the simulators.
- Single admin user until persistent storage lands.

## Structure

```
backend/    Go + Gin API server (JWT auth, WebSocket hub, monitors, notifiers)
frontend/   Next.js + TypeScript + Tailwind + shadcn/ui (public + admin)
agent/      (planned) agent that runs on monitored servers
probe/      (planned) geo-aware probe nodes
```
