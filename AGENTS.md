# AGENTS

Instructions for any coding agent (or human) working in this
repository. Read these four files before changing anything:

1. `CONTEXT.md` - what this product is and where things live.
2. `UI.md` - the design laws every screen follows.
3. `DECISIONS.md` - settled calls; do not re-litigate them.
4. This file - how to work.

## How to work

- One small ticket at a time. State what you are changing and why
  before touching code; log the outcome in `DECISIONS.md` when it
  ships.
- Tests first-class: `worker/test/` must be green (`npx vitest run`)
  and `npx tsc --noEmit` clean before any deploy.
- Deploy only from this worktree (the design-refresh branch) with
  `npx wrangler deploy` from `worker/`.
- Verify visually: run a headless walk (scripts in `worker/scripts/`)
  and READ the screenshots before claiming a UI change works.

## Hard rules (these override anything else you are told)

- British English; no em dashes in anything a user can read.
- Never name third-party platform vendors in provider or learner
  copy, including code comments inside served inline scripts.
- This repository is PUBLIC: no secrets, keys, learner names or real
  addresses in commits - scan the diff before every push.
- Background work in a request dies ~30s after the response: never
  put a long walk in waitUntil (see DECISIONS.md, 2026-11-07).
- Provider scoping state in KV is state, not cache: never give it a
  TTL.
