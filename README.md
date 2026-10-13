# Akash Gupta — AI show guide

A responsive fan-made comedy homepage, configurable conversational agent, owner-only admin panel, and persistent timestamped chat transcripts. This branch runs on Next.js and Node.js for hosting on Render.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/riddhipareekworks-collab/standup)

## Deploy on Render

The repository includes `render.yaml` for a Node web service with a 1 GB persistent disk. This uses a paid Starter instance so chat transcripts survive deploys and restarts. Review Render's current price before creating the service.

1. Open the Deploy to Render link and connect this GitHub repository.
2. Review the service, disk, region, and pricing.
3. Supply `OPENAI_API_KEY` and an `ADMIN_PASSWORD` of at least 12 characters. Render generates `SESSION_SECRET` automatically.
4. Deploy. Share the resulting `https://…onrender.com` homepage URL with testers.
5. Visit `/admin` and sign in with your admin password. View conversations at `/admin/chats`.

If using the Web Service form instead of a Blueprint:

| Setting | Value |
| --- | --- |
| Runtime | Node |
| Node version | 22.22.0 |
| Build command | `npm ci && npm run build` |
| Start command | `npm start` |
| Health check | `/api/health` |
| Disk mount | `/var/data` |
| Disk size | 1 GB |
| `DATABASE_PATH` | `/var/data/standup.sqlite` |

Also set `OPENAI_API_KEY`, `ADMIN_PASSWORD`, and a random `SESSION_SECRET` of at least 32 characters as private environment variables. `RENDER_EXTERNAL_URL` is supplied by Render and is used to validate browser request origins. If using a custom domain, configure `APP_ORIGIN` for that origin.

The local database and hosted database are separate. The hosted database starts empty. To transfer the agent's persona/tone/empathy/initiative configuration, set `INITIAL_AGENT_SETTINGS` to a JSON settings object before the first startup, or configure it in `/admin`. Existing saved settings are never overwritten by this seed.

## Local setup

Use Node.js 22.13 or newer:

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Edit `.env.local` with your API key, admin password and session secret. Never commit it. The development URL is `http://127.0.0.1:5174`; set `APP_ORIGIN` to that exact URL. The SQLite database is automatically initialized in `.data/standup.sqlite` on the first server request.

```bash
npm run typecheck
npm run build
npm start
```

Production preview listens on `PORT` (default `10000`). For local production testing, set `APP_ORIGIN=http://localhost:10000` or your exact local URL. The server respects Render's `PORT` setting.

## Database

Tables include `agent_settings`, `chat_sessions`, and `chat_turns`. Each session is independent and each user/agent exchange includes UTC timestamps and response status. Failed requests remain visible. The model reads session history from the database. Parallel sessions are supported; a per-session lease prevents overlapping generations and duplicate request IDs do not duplicate successful replies.

Schema migrations in `drizzle/` run automatically at runtime, when Render's disk is available. Applied migrations are recorded and checked for changes. Do not edit an applied SQL migration; add a new migration.

The included SQLite storage is intended for one web-service instance. The Blueprint explicitly uses one instance; it supports parallel chat sessions within that instance. Multiple server instances would require a shared database such as Postgres.

## Administration

`/admin` is protected with a signed, HTTP-only session cookie. Public visitors cannot read transcripts or change settings. Cookies expire after eight hours. The admin password and signing secret remain server-side. Never share the admin password with testers.

The agent controls include persona, a 3,000-character tone field, five empathy examples, an empathy slider, initiative, and conversation goal. Save applies changes to future replies.

## Validation

Production build and type checks pass. Local production tests verify health, password login, rejection of spoofed admin headers, parallel live AI sessions, timestamped transcripts, token isolation, and idempotent replies. Render deployment still requires a connected account, configured secrets, and approval of its paid service/disk cost.

Legacy Sites/Cloudflare helper sources are retained for reference but are not used by the Next.js build or Render runtime. GitHub Actions checks installation, types and build.

## Content

The displayed show schedule is illustrative, not confirmed or bookable. Official show links are at https://linktr.ee/theskygupta; biography source: https://in.bookmyshow.com/person/aakash-gupta/1047892 .
