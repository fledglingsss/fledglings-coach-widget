# Identity: signed tokens

## The rule

**An email address is never accepted as a claim.** The only thing that
keys a learner's score history is a token this worker minted and
signed. A raw `email` field in a request body is ignored by every
endpoint — the sole exception is `/api/identity`, whose whole job is to
decide whether that address may be exchanged for a token.

## The token

```
<b64url(JSON claims)>.<hex HMAC-SHA256>
```

Claims: `{ e: email, d: device-hash (16 hex), iat, exp }`, signed over
`fl-identity:v1:<payload>` with the server-only key. It carries:

| Property | Why |
|---|---|
| **Signature** | The claims cannot be edited. Swap the email inside and verification fails. |
| **Device binding** (`d`) | `learner_id` travels with every request, so a token lifted from a URL or a shared screenshot is inert on another machine. |
| **Expiry** (`exp`, 30 days) | An abandoned browser stops carrying an identity. |

The browser reads the claims for display only ("Saving progress as …")
— the signature is what the server checks on every call, so what the
learner sees is exactly what the worker honours.

## Getting one: `POST /api/identity`

Layered, in order:

1. **Origin allowlist** (global on `/api/*`) plus hard daily caps —
   10 mints per device, 40 per IP. The route cannot be swept.
2. **The address must belong to a real learner** — a LearnWorlds
   lookup, cached for 6 hours including misses so it cannot become an
   email-existence oracle worth harvesting.
3. **First-claim binding.** Each email records the devices bound to it
   (max 6, 180 days):
   - a device already bound → allowed;
   - an email nobody has claimed → allowed (trust on first use);
   - an email already in use → **refused**, unless the request carries a
     valid device link code (below);
   - a full record (6 devices) → refused outright, even with a code, so
     the cap can never be used to displace the real learner.

There is deliberately **no** "the request came from a school page"
branch. That existed until 2026-08-11 and rested on an `Origin` header,
which a browser enforces but any non-browser client can simply assert —
and it accepted the whole `learnworlds.com` / `mycourse.app` vendor
estate, so a free school at `attacker.learnworlds.com` counted as ours.
Device link codes replaced it.

## Adding a second device: link codes

The learner proves possession of a device that already holds the
identity, rather than asserting anything about themselves.

1. On the linked device: Hub → **Link another device** →
   `POST /api/identity/link-code` (requires a valid token for *that*
   device) returns a six-character code, shown as `ABC-234`.
2. On the new device: Hub → **I already use Fledglings on another
   device** → type the code → `POST /api/identity {code}` mints a token
   bound to the new device and adds the binding.

Properties:

| Property | Value |
|---|---|
| Alphabet | 31 chars, no `0/O/1/I/L` — it gets read aloud and typed |
| Space | 31⁶ ≈ 887 million |
| Life | 10 minutes |
| Uses | One — deleted the moment it is accepted |
| Redemption attempts | 10 per device per day, 30 per IP per day |
| Issuing | 20 per device per day, and only from a linked device |

A redeemed code skips the LearnWorlds existence check: the address came
from a device already holding it, so it is known-good.

**The one stored address.** `id:link:<CODE>` holds the email for up to
ten minutes so the handover can complete. It is the only place this
worker stores an address in clear, it is deleted on use, and it expires
on its own. Everything else is a hash.

## What this protects against

- Editing or forging a token (signature).
- Reusing someone's token on another machine (device binding).
- Naming a classmate's address in a request to read or pollute their
  scores — the previous behaviour, now closed on `/api/hub`,
  `/api/review`, `/api/linkedin`, `/api/interview`, `/api/cover-letter`
  and `/api/next-step`.
- Scripted enumeration of who is enrolled (caps + cached lookups).
- Taking over an **active** learner's history from a random browser
  (first-claim binding).

## What it does not protect against — honestly

Without LearnWorlds SSO or an email round-trip, nothing can *prove* a
person owns an address. One residual remains:

**An unclaimed address can be claimed by whoever gets there first.**
Trust on first use — the protection starts the moment a real learner
links. Someone who knew a classmate's address, knew they had never
used the tools, and got there first could sit on their score history;
the classmate would then be refused — and can now evict the squatter
themselves by signing in with their school account (below), no support
contact needed. Clearing the binding (`id:bind:<emailHash16>`) still
revokes everything immediately as the manual fallback.

The data behind identity remains whole numbers and timestamps —
scores, never documents, answers, letters or video. That is why this
trade-off is acceptable, and it is written down rather than implied.

## Closing the last residual: school-account sign-in (SHIPPED)

The school cannot sign an assertion directly (no IdP mode; its only
user-token flow wants the learner's password typed into our page,
which was rejected). What it does attribute reliably is an assessment
response — so the proof rides on one. The hub shows a one-time code;
the learner submits it inside the **Hub sign-in** course behind the
school's own login; the worker reads the school's record of who
submitted it server-to-server and mints for the device that asked.

A verified sign-in **rebinds the address to exactly the proven device**
(`{d: [device], v: true}` — the record format grew a verified flag;
legacy bare arrays still parse). Because `emailFromToken` re-checks
bindings on every call, a first-claim squatter is revoked the moment
the real learner proves the address. Full design and founder setup:
[SSO.md](SSO.md).

Link codes stay as the offline path, and adding a device via link code
preserves the verified flag rather than downgrading it.

## Provider "open their hub view"

Providers view a learner's journey read-only. That path does not use a
learner token: `/api/hub` accepts `view_email` only with a valid portal
session **and** only when the learner is inside that session's tag
scope, never merges the viewer's own device history, and mints nothing.
