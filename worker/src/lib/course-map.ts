/* Module title -> LearnWorlds course id.
 *
 * Ids fetched live from the school via /lw-check on 2026-07-19
 * (53 courses) and matched by meaning - LearnWorlds titles differ
 * slightly from the site catalogue (hyphens vs em-dashes, casing,
 * trailing spaces), so matching is done here once, by hand, not at
 * runtime. A null id means "recommend but cannot auto-enrol".
 *
 * Every key MUST be an exact catalogue title (pinned by tests against
 * lib/pathway's title list). */

export const COURSE_MAP: Record<string, string | null> = {
  /* Financial Literacy */
  "Money Confidence & Everyday Decisions": "sso-2-2",
  "Budgeting that Actually Works": "sso-3-3",
  "Credit, Borrowing & Your Score": "sso-4-3",
  "Saving, Emergency Funds & Building a Safety Net": "sso-5-2",
  "Pay, Payslips, and Planning for Tax & NI": "sso-6-3",
  "Smart Spending: Big Purchases, Contracts & Consumer Rights": "sso-7-3",
  "Living Independently - Housing & Household Bills": "sso-8-2",
  /* Deep Dives (money/housing) */
  "First Time Renting & Housing Rights": "sso-3-4",
  "Debt Traps and Payday Loans": "sso-1-2",
  /* Employability */
  "Introduction to Employability Skills": "sso-1",
  "Communication That Builds Trust": "sso-2",
  "Teamwork & Collaboration": "sso-3-1",
  "Problem Solving & Decision Making": "sso-4-1",
  "Professionalism, Reliability & Time Management": "sso-5",
  "Interviews, CVs & Early Career Mindset": "sso-6-1",
  /* Deep Dives (work/AI) */
  "Preparing for an Interview": "sso-2-3",
  "Boosting Confidence before an Interview": "sso-7-4",
  "How to Use AI": "sso-8-3",
  "AI in the Workplace": "sso-5-3",
  /* Confidence & Resilience ("What They Are…" is titled
   * "Confidence & Resilience Introduction" in LearnWorlds) */
  "What They Are & How to Build Them": "sso-2-1",
  "Building Real Confidence (Even When You Feel None)": "sso-3-2",
  "Resilience in Practice - Pressure, Setbacks & Bounce-Back Plans": "sso-4-2",
  "Communicating Under Pressure: Calm Voice, Clear Steps, Trusted Results": "sso-5-1",
  "Grit & Growth - Motivation That Lasts (Goals, Habits, Accountability)": "sso-6-2",
  "Feedback, Reviews & Continuous Growth": "sso-9",
  "Assertive Boundaries - Saying No Well & Protecting Your Focus": "sso-8-1",
  /* Deep Dive (wellbeing) */
  "Managing Stress & Burnout": "sso-6-4",
  /* Online Safety (the intro course's LearnWorlds id really is "test") */
  "What is Online Safety": "test",
  "Cybersecurity Fundamentals": "sso-3",
  "Understanding Online Identity & Reputation": "sso-4",
  "Toxic Online Culture & Group Chats": "sso5",
  "Digital Well-being & Time Online": "sso-6",
  "Online Scams, Fraud & Money Safety": "sso-7",
};

export function courseIdFor(title: string): string | null {
  /* Catalogue titles moved from em dashes to hyphens (founder copy
   * law, 2026-09-26); pages cached from before the change still post
   * the em-dash spelling, so normalise before the lookup. */
  const normalised = title.replace(/\s*—\s*/g, " - ");
  return COURSE_MAP[title] ?? COURSE_MAP[normalised] ?? null;
}

/* Learner modules that exist on the platform but are not (yet)
 * pathway-emittable - the pathway engine deliberately does not
 * recommend them, but their self-reflections and module health must
 * still be swept. Found live 2026-09-17 when Swift's cohorts rolled
 * onto them. Titles here are the LIVE platform titles, trimmed. */
export const EXTRA_SWEEP_COURSES: Record<string, string> = {
  "Welcome to Financial Literacy": "sso-1-1",
  "Financial Literacy Mastery": "sso-9-1",
  "Employability Skills Mastery": "sso-7-1",
  "Staying Safe Online Mastery": "sso-8",
  "Handling Change & Uncertainty - Adaptability You Can Trust": "sso-7-2",
  "Confidence & Resilience Showcase": "sso-10",
  "Managing Nerves": "sso-4-4",
  "What is Safeguarding?": "sso-9-2",
};

/** Every course the data sweeps cover: the pathway catalogue plus the
 * extra live modules above. One list, so reflections and module
 * health can never disagree about what "complete" means. */
export function sweepCourseEntries(): Array<[string, string]> {
  const entries = Object.entries(COURSE_MAP).filter(
    (e): e is [string, string] => e[1] !== null,
  );
  return entries.concat(Object.entries(EXTRA_SWEEP_COURSES));
}
