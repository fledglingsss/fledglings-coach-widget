# LearnWorlds embed instructions

The `.html` snippet files in this folder are **paste-in code only** —
they deliberately contain no comments, because LearnWorlds's custom-code
editor can strip HTML comment markers and render the comment text on the
page (it also substitutes Liquid variables such as the user's name even
inside comments). All guidance lives here instead.

## Coach widget — `learnworlds-snippet.html`

**Where:** LearnWorlds admin → Site Builder → Settings (gear) →
Custom Code → **"Before the closing of the BODY tag"** (the global
body-end slot — *not* the head slot: LearnWorlds does not inject
head-slot code inside the course player, but body-slot code runs
everywhere including the player).

**Privacy:** `USER.NAME` / `USER.EMAIL` are LearnWorlds Liquid
variables, replaced with the logged-in learner's details at render
time. The name is used only to greet the learner; the email lets the
coach personalise module suggestions. The widget sends no other
personal data and stores the conversation only in the learner's own
browser.

## Skills Passport — `skills-passport-embed.html`

**Where:** create a page for logged-in learners (or an embed activity
inside a course) and paste the file's contents into a Custom Code /
HTML block.

**How it works:** LearnWorlds replaces the `USER.EMAIL` Liquid variable
with the logged-in learner's email when it serves the page, so every
learner automatically sees their own passport — scores, streak, badges,
leaderboard, and their cohort (from their LearnWorlds tag) are looked
up server-side. If Liquid isn't substituted (e.g. a logged-out
preview), the sample passport shows instead. The iframe auto-sizes to
the passport's height, so the full page is always visible without an
inner scrollbar.

## Interview Studio — `interview-embed.html`

**Where:** create a page or embed activity for logged-in learners and
paste the file's contents into a Custom Code / HTML block.

**Critical:** the iframe carries `allow="camera; microphone"` — without
it the browser silently blocks the camera/mic inside LearnWorlds and
learners can only type. Do not remove that attribute.

**How it works:** learners practise their 60-second pitch, pick a role
set, or paste a real job advert to generate five tailored questions
(HMAC-signed, 5/day). A camera/mic setup check (with an accessibility
note) leads into think-time countdowns and recorded answers with live
captions; recordings can be reviewed and re-recorded before submitting.
**Video and audio never leave the device** — recording and speech
transcription are entirely in-browser; only the words, answer timings
and face-framing tallies reach the worker. The AI review blends the
answer evaluation (80%) with deterministic speech metrics (wpm bands +
filler words, 10%) and camera presence (10%); unmeasured signals show
as "not measured", never a guessed number. Typing fallback throughout.
3 AI-reviewed interviews per learner per day; crisis language routes to
signposting instead of scoring.

## CV & LinkedIn review — `tools-embed.html`

**Where:** a page or embed activity for logged-in learners.
Upload-only review with scored report; PDFs are read in the learner's
browser and never uploaded. `allow="clipboard-write"` keeps copy
buttons working inside the iframe. 5 reviews/learner/day; crisis
language routes to signposting.

## The Learner Games — `challenge-embed.html`

**Where:** any learner-facing page. Aggregate-only (cohort names and
completion counts — never learners), safe anywhere logged-in learners
can see. Scores update live from module completions.

## Standalone use (no LearnWorlds needed)

Every employability tool also works as a normal website at
`https://fledglings-coach.fledglings.workers.dev/hub` — the suite has
its own sidebar navigation (Home, Resume Builder, CV Review, Cover
Letter, LinkedIn Review, Interview Practice, AI & Privacy). Learners
who arrive outside LearnWorlds save their email once on the Home page
and their scores follow them; inside LearnWorlds the Liquid email does
it automatically. Every tool shows a "Saving progress as … · Not you?"
chip so shared devices never silently mix learners up.

**How identity works (signed tokens):** an email address is never
accepted as a claim. The learner's browser exchanges it — once — for a
token the worker signs, binds to that browser and expires after 30
days; every scoring call carries the token, and a raw `email` field in
a request body is ignored everywhere. Inside LearnWorlds the exchange
happens automatically from the Liquid email; standalone, the learner
enters it on the Home page. See `docs/IDENTITY.md` for the full model,
including what it does and does not protect against.

## Employability Hub — `hub-embed.html`

**Where:** ONE page for logged-in learners — the single destination for
the whole employability journey (CV review → LinkedIn Optimizer →
Interview Studio → Cover Letter Studio, plus the Resume Builder).
The dashboard shows a journey stepper, a Career Readiness ring
(7 tasks), a job-ready quality score, and per-tool cards with scores
and trends. The Liquid email ties every score to the learner so
everything persists across devices (numbers only — documents, videos,
letters and answers are never stored). Each tool shows a "Back to your
Employability Hub" link.
`allow="clipboard-write; camera; microphone"` keeps copy buttons and
the Interview Studio's camera/mic working when tools open inside the
same iframe tab — do not remove it.

## LinkedIn Optimizer — `linkedin-embed.html`

**Where:** a page or embed activity for logged-in learners (already
reachable from the hub — a standalone page is optional).
Learners upload their LinkedIn "Save to PDF" export (read in-browser,
never uploaded) and get Hiration-style per-section scores summing to
100: Profile URL (deterministic), Headline, Location, About,
Experience, Education, Skills, and Certifications & extras — each with
"things you got right" (verbatim-quoted) and "what to improve".
Shares the 5/day review budget with the CV review.

## Cover Letter Studio — `cover-letter-embed.html`

**Where:** a page or embed activity for logged-in learners (also
reachable from the hub). Learners paste a job advert plus optionally
their real CV; the draft only claims what the CV actually says, with
[bracket] placeholders for everything only they can write. Three letter
designs, editable in place, copy + print-to-PDF. 3 drafts/day; nothing
stored.

## Resume Builder — `builder-embed.html`

**Where:** a page or embed activity for logged-in learners. CVs are
stored only in the learner's browser (localStorage) with autosave; the
worker only sees the sections when the learner runs the instant
recruiter check (deterministic, no AI) and forgets them. Live preview
in two print-ready designs; one tap sends the finished CV into the full
AI review.
