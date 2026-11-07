# CONTEXT

What this repository is, for anyone (or any agent) starting cold.

## The product

Fledglings is a learning platform for 16 to 24 year olds in UK training
providers, schools, colleges and employers. This repository holds the
Cloudflare Worker that serves everything around the school platform:

- **The provider dashboard** (`/dashboard`): tag-scoped views for each
  provider (learners, cohorts, reflections, test scores, analytics,
  evidence). Access by per-provider code; sessions last 8 hours.
- **The learner hub and career tools** (`/hub`, `/builder`, `/interview`,
  `/cover-letter`, `/linkedin`): CV, interview and letter tools.
- **Fledge, the coach** (`/widget.js`, `/api/coach`): the in-course chat
  coach with layered safety (deterministic crisis screen first, model
  second, output gate third).
- **The founder ops console** (`/ops`, `/ops/verify`): code minting,
  verification checks, safeguarding self-test, access audit.

## The data flow

A daily 06:00 UTC cron refreshes course and engagement data, the
reflections snapshot and early-warning tiers; the AI safeguarding deep
read runs weekly (Monday-anchored cache). Providers can pull fresh data
any time with the dashboard Refresh button. All provider scoping runs
server-side off tags plus a user-group overlay; the overlay patch in KV
is live state, never expiring cache.

## Where things live

- `worker/src/index.ts`: routes, jobs, crons, scoping, security.
- `worker/src/pages-*.ts`: served pages (dashboard, verify, hub, tools).
- `worker/src/lib/`: pure logic (reflections, safety, risk, portal).
- `worker/test/`: vitest suite; it must stay green before any deploy.
- `worker/scripts/`: headless QA walks and audits (puppeteer-core).

## Hard laws (founder)

- British English everywhere; no em dashes in anything user-facing,
  including AI-written text (plainDashes enforces it).
- Never name third-party platform vendors in provider or learner copy,
  including view-source.
- No learner-identifiable data on marketing or inspector surfaces.
- This repo is PUBLIC: no secrets, keys or real addresses in commits.
- Production deploys from the design-refresh branch worktree.
