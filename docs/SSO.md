# Sign in with your school account (SSO)

## What it does

A learner on the standalone hub taps **Sign in with your school
account**, gets a six-character code, submits that code on a page that
sits behind the school's own login, and comes back signed in. Their
scores then follow them, and the address is **proven** — not merely
claimed first — which closes the residual documented in
[IDENTITY.md](IDENTITY.md).

No password is ever typed outside the school. Nothing the browser
asserts is trusted anywhere in the loop.

## Why it is shaped this way

The platform's API offers no identity-provider mode: it cannot hand a
third-party app a signed statement of who is logged in. Its only
user-token flow is an OAuth *password grant* — the learner's school
password typed into our page — which is exactly the phishing habit this
platform teaches young people to refuse, so it was rejected outright.
There is also no Forms API on this school's plan (probed live,
2026-08-30: `GET /v2/forms` → 404), and no form-submission webhook.

What the school DOES attribute reliably is an **assessment response**:
who submitted it, what they wrote, and when — readable server-to-server
over the admin API that already powers the reflections pipeline.

## The trust chain

1. `POST /api/sso/start` — the hub shows this device a one-time code
   (10 minutes, single use, stored against a hash of the device).
2. The learner opens the school's **Hub sign-in** course. The school's
   own login wall stands in front of it.
3. They submit the code into the course's one-question assessment.
4. The hub polls `POST /api/sso/check`. The worker reads the
   assessment's recent responses **server-to-server**, finds the row
   whose answer matches the code, and takes the email from the
   school's own attribution of who submitted it.
5. The code matches → mint a signed identity token bound to the device
   that asked → **rebind the address to exactly that device, marked
   verified**. Any device that had merely claimed the address first
   stops working immediately, because token verification re-checks the
   binding record on every call.

Guards: 6 codes per device per day, 24 per IP, 60 polls per code, a
15-minute freshness window on the matched response, and a shared
5-second cache on the response fetch so a classroom signing in at once
costs the platform API no more than one learner does. Unknown codes,
expired codes and someone else's codes all get the same answer, so
polling cannot confirm which codes are live.

## The school side (BUILT, live, proven 2026-08-30)

The worker discovers everything by name — no config, no ids to paste.
The course was created in the school admin and verified end to end:

- **Course:** `Hub sign-in` (id `hub-sign-in`), free, one section
  ("Sign in", free) with one **self-assessment** unit, "Sign-in code"
  (unit `6a9460471a3c19b7510ed4c1`), containing a single required
  short-text form question: *"Type your sign-in code (the Hub page you
  came from is showing it)"*.
- Self-assessment (Form-question) rather than an exam or text
  assignment deliberately: no right/wrong marking to confuse a
  learner, and nothing lands in the admin's manual-review queue.
- The hub links `{school}/course/hub-sign-in` — confirmed to be the
  live page; an enrolled learner's button reads **Continue** and opens
  the player directly on the code box.

Proven against production, full loop, twice:

1. `/api/sso/start` discovered the course by title and issued a code.
2. The code was submitted through the school's own player.
3. `/api/sso/check` read the school's attribution and minted a token
   for the logged-in account's email — never typed anywhere.
4. A replayed code answered `expired`.
5. A second code for a second device was submitted through the SAME
   unit (self-assessments re-open on revisit — the default attempts
   settings are correct as-is) and minted for the new device; the KV
   record afterwards read `{"d":["<new device>"],"v":true}` — one
   device, verified, the previous one evicted. Test bindings were
   then deleted so real first use starts clean.

If the course is ever deleted or renamed, the button degrades to the
honest "not switched on yet" message within 12 hours (or immediately
after clearing `sso:unit:v1` in KV), and recovers by itself within
five minutes of the course reappearing.

Cosmetic leftovers, deliberately not blocking: the course page uses
the default theme template (stock construction photos and placeholder
staff names) and the school-wide post-enrol "thank you" page carries
B2B enquiry copy. Both are one-time edits in the site builder if
wanted; learners only pass them once.

## What learners see

- Hub → **Sign in with your school account** → code like `KMT-4WQ` +
  an **Open my school** button.
- Submit the code on the school page, switch back, and the hub signs
  itself in (it checks the moment the tab regains focus).
- The email path ("link with just your email") remains underneath for
  anyone who prefers it — it is first-claim, not proof, and a
  school-verified sign-in always beats it.

## Learner-visible guarantees

- A stolen or shoulder-surfed code is useless on another device: the
  mint is bound to the device that asked for the code.
- Submitting the code proves the school session, so someone who had
  squatted the address by claiming it first is evicted the moment the
  real learner signs in properly.
- The token is the only key to score history — same as everywhere
  else on the platform (see IDENTITY.md).
