# UI

The design rules every screen in this repository follows. Read before
touching any `pages-*.ts`.

## Brand

- Palette, exact hex only: Navy `#05253C`, Orange `#D9452B`, Mango
  `#ED9249`, Blue `#13507F`, Off-White `#ECE7E6`, White `#FFFFFF`.
- Navy + Orange is the lead pairing; Mango never appears without Orange
  somewhere on the screen; Orange is never body text on white.
- Type: Outfit only. 600 for headings and big numbers, 400 for body.
- The Skills Passport look is the reference for product UI depth:
  brand-compliant alone is not enough, and generic white cards read as
  "AI slop". Start new product UI from `worker/src/pages-kit.ts`.
- No em dashes in any copy a user can read. British English.

## The interaction laws (adopted 2026-11-07, after rory.ridgers'
"5 laws behind addictive apps"; they match the classic usability laws)

1. **Familiarity first.** Standard controls live in standard places:
   primary action right or centre, sign-out in the sidebar footer,
   search above tables, filters as chips above the thing they filter.
   Never move a convention to be clever.
2. **Hick's Law.** Cut simultaneous choices. One story per screen;
   section decks (one section visible at a time) over long pages; chip
   rows stay short, with overflow folded behind a "+N more" control.
3. **One dominant action per screen.** Every view has exactly one
   visually loudest control (orange); everything else is ghost or text.
4. **Big targets.** Tap targets at least 44px; whole cards and rows are
   the control, not a small link inside them.
5. **Instant feedback.** Every press answers within the same second:
   pressed state, progress wording, then a visible confirmation.
   Nothing a user triggers may complete silently.

## Standing patterns

- Long lists open on their top slice with "Show N more / Show all N";
  any filter change resets to the top slice. Weakest-or-most-urgent
  sorts first so the opening slice is the one that matters.
- Tables are registers: dense rows, units in headers, status as
  coloured chips (red = act today, amber = watch, green = fine).
- Every chart label must FIT its slot (abbreviate with the
  distinguishing tail kept, full name in the hover title).
- Empty states say the honest reason and what will change it, never
  just "no data".
- Counters over 999 take thousands separators.
- Charts and copy are verified by headless screenshot, read by eye,
  before any change ships (scripts in `worker/scripts/`).
