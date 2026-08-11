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
   - an email already in use, from a **standalone** browser → **refused**,
     with copy telling the learner to open the tools once from inside
     their Fledglings course;
   - from a **school page** (fledglings.co / LearnWorlds), where
     LearnWorlds itself rendered the signed-in learner's address →
     allowed. This is how a learner links a second device.

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
person owns an address. Two residuals remain:

1. **A page on a school origin may claim any known address.** Someone
   signed in to the school who knows a classmate's email could mint a
   token for it. This is the path SSO would close; it is deliberately
   allowed today because it is also how legitimate second-device
   linking works.
2. **An unclaimed address can be claimed by whoever gets there first.**
   Trust on first use: the protection starts once a real learner is
   using it.

The data behind identity remains whole numbers and timestamps —
scores, never documents, answers, letters or video. That is why this
trade-off is acceptable, and it is written down rather than implied.

## Closing residual 1 later

If LearnWorlds SSO (or the Assessments/Forms-style plan gate) becomes
available: have LearnWorlds sign a short-lived assertion, verify it in
`/api/identity`, and drop the `school_origin` branch of `decideMint`.
Nothing else changes — every caller already speaks tokens.

## Provider "open their hub view"

Providers view a learner's journey read-only. That path does not use a
learner token: `/api/hub` accepts `view_email` only with a valid portal
session **and** only when the learner is inside that session's tag
scope, never merges the viewer's own device history, and mints nothing.
