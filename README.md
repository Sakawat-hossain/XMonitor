# XMonitor

Self-hosted server monitoring platform — server metrics, multi-hop relay chain visualization, and geo-aware reachability monitoring.

## Requirements

- Go 1.26+
- Node.js 20+

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

Then open http://localhost:3000

| URL | What |
|-----|------|
| http://localhost:3000 | Public dashboard |
| http://localhost:3000/chains | Relay chain visualization |
| http://localhost:8080/health | Backend health check |
| http://localhost:8080/api/v1/servers | Servers API |

## Default admin login

- Username: `admin`
- Password: `admin123` (you will be asked to change it on first login)

## Environment variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `JWT_SECRET` | dev fallback | JWT signing secret — **set this in production** |

## Structure

```
backend/    Go + Gin API server
frontend/   Next.js 14 + TypeScript + Tailwind + shadcn/ui
agent/      (planned) agent that runs on monitored servers
probe/      (planned) geo-aware probe nodes
```
