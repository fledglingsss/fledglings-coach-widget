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

## One-time setup (founder, ~5 minutes)

The worker discovers everything by name — no config, no ids to paste.

1. In the school admin, create a **free course titled exactly
   `Hub sign-in`** (capitalisation doesn't matter; the name does).
2. Give it **one unit: an Assessment** (the standard assessment
   activity), with a **single free-text question** — suggested wording:
   *"Type your sign-in code (it's on the hub page you just came
   from)."* No pass mark, no time limit, unlimited attempts.
3. Course access: **free, open to any logged-in learner** — not listed
   in the catalogue if you prefer (the hub links straight to it).
4. That's it. Within ~5 minutes the hub's sign-in button goes live
   (the worker checks for the course every 5 minutes until it finds
   it, then caches it for 12 hours).

Until the course exists, the button answers honestly: "School sign-in
is not switched on yet — link with your email below instead."

**One thing to verify on first try:** the hub links to
`{school}/course/hub-sign-in`. If your course page lives at a
different URL shape, tell me and it's a one-line fix.

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
