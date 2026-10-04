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
   lookup, cached so it cannot become an email-existence oracle worth
   harvesting: a hit for 6 hours, a miss for 10 minutes. (Misses were
   also kept for 6 hours until October 2026. A learner whose account
   had only just been created, or who mistyped once, was then refused
   for the rest of the school day with nothing they could do about it.
   The caps in step 1 are what stop sweeping, and the refusal reads the
   same either way.)
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
The learner's avatar is not drawn in that view and nothing about them
is kept in the provider's browser.

## What a token unlocks besides scores (October 2026)

Testers asked for the learner's avatar beside the logo and for cohort
leaderboards "from the API". Both read the platform's own record of the
account, and both are unlocked by the same token as everything else.

| Read | Where | What comes back |
|---|---|---|
| Profile | `/api/hub` → `profile`, `/api/next-step` → `me` | first name, initials, cohort tag |
| Cohort board | `/api/leaderboard` | this month's cohort race (names and totals, already public on `/challenge`), and the learner's **own** cohort's top five plus their own row |

- **There is no picture.** The platform's user record has a name and
  tags and no avatar field (checked against its API reference,
  2026-10-03), so the avatar is the learner's initials, on the same
  warm tile for everyone (the Skills Passport's). Nobody has a colour
  of their own, so nothing about the tile is worked out from, or says
  anything about, who they are.
- **Kept server side:** `hub:profile:v1:<emailHash16>` for six hours
  (name, initials, cohort; misses too), so a page view costs the
  platform nothing.
- **Kept in the browser:** `fl_profile_v1` (first name, initials,
  cohort, Career Readiness), beside the token and checked against it on
  every read. "Not you?" removes it with the token. The chat widget
  keeps the initials for the tab only (`fl_coach_me_v1`, with whose
  they are).
- **A cohort's board never leaves the cohort.** `/api/leaderboard`
  returns a board only to a token whose learner carries that cohort's
  tag. It is the same board the Skills Passport has shown since July
  (`sp:lb:<cohortSlug>`), ranks modules completed, and is written only
  when the learner's own entry has changed. No score from the CV,
  interview or cover letter tools is read for it.

**The first-claim residual applies here too**, and is written down
rather than implied: someone who claimed an unclaimed address would be
shown that learner's first name and cohort, and that cohort's top five
names. The Skills Passport has exposed the same board behind a weaker
gate (an allowlisted `Referer`) since July, so this adds no new reach;
school-account sign-in evicts a squatter as before.

## School networks: which caps count per address

A whole school usually reaches the internet from one address.

- **Signed-in reads are capped per device only.** `/api/hub` skips its
  per-address cap (240 a day) for a caller holding a valid token, and
  `/api/next-step` (which nothing reaches without a token) no longer
  has one. Those caps dated from when an address in the request body
  was enough to read a learner; with tokens they only counted a
  school's own learners against each other, and three classes in a day
  would have emptied the hub for everyone on that network. A caller
  with no token is still capped per address.
- **Sign-in is still capped per address, on purpose:** 40 token mints
  and 24 school sign-in starts a day. These are the anti-sweeping
  control and were left alone. They are also a ceiling on how many
  *new* devices one school network can sign in on one day (a token then
  lasts 30 days), and a browser that blocks embedded storage (Safari on
  an iPad) mints on every visit. If a rollout to more than about 40
  learners a day on one network is planned, raise
  `IDENTITY_MINTS_PER_IP_PER_DAY` deliberately rather than discover it
  in a classroom.
