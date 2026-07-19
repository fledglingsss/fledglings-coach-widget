/* Module title -> LearnWorlds course id.
 *
 * A null id means "recommend but cannot auto-enrol" — the pathway
 * still renders, the learner is pointed at the module by name, and no
 * API write is attempted. Populate ids by running the founder script
 * `set-lw-keys.ps1`, which fetches the school's course list and writes
 * `config/courses.generated.json`; paste the matching ids here.
 *
 * Every key MUST be an exact catalogue title (pinned by tests against
 * lib/pathway's title list). */

export const COURSE_MAP: Record<string, string | null> = {
  "Money Confidence & Everyday Decisions": null,
  "Budgeting that Actually Works": null,
  "Credit, Borrowing & Your Score": null,
  "Saving, Emergency Funds & Building a Safety Net": null,
  "Pay, Payslips, and Planning for Tax & NI": null,
  "Smart Spending: Big Purchases, Contracts & Consumer Rights": null,
  "Living Independently — Housing & Household Bills": null,
  "First Time Renting & Housing Rights": null,
  "Debt Traps and Payday Loans": null,
  "Introduction to Employability Skills": null,
  "Communication That Builds Trust": null,
  "Teamwork & Collaboration": null,
  "Problem Solving & Decision Making": null,
  "Professionalism, Reliability & Time Management": null,
  "Interviews, CVs & Early Career Mindset": null,
  "Preparing for an Interview": null,
  "Boosting Confidence before an Interview": null,
  "How to Use AI": null,
  "AI in the Workplace": null,
  "What They Are & How to Build Them": null,
  "Building Real Confidence (Even When You Feel None)": null,
  "Resilience in Practice — Pressure, Setbacks & Bounce-Back Plans": null,
  "Communicating Under Pressure: Calm Voice, Clear Steps, Trusted Results": null,
  "Grit & Growth — Motivation That Lasts (Goals, Habits, Accountability)": null,
  "Feedback, Reviews & Continuous Growth": null,
  "Assertive Boundaries — Saying No Well & Protecting Your Focus": null,
  "Managing Stress & Burnout": null,
  "What is Online Safety": null,
  "Cybersecurity Fundamentals": null,
  "Understanding Online Identity & Reputation": null,
  "Toxic Online Culture & Group Chats": null,
  "Digital Well-being & Time Online": null,
  "Online Scams, Fraud & Money Safety": null,
};

export function courseIdFor(title: string): string | null {
  return COURSE_MAP[title] ?? null;
}
