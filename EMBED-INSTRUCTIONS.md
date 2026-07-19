# LearnWorlds embed instructions

The two `.html` snippet files in this folder are **paste-in code only** —
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
