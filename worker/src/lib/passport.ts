/* #4 — Readiness Passport: a learner-facing, printable evidence
 * summary built from LearnWorlds enrolment/progress data.
 *
 * Deliberately modest data surface: first name, member-since year,
 * completed module titles, in-progress module titles with percentage,
 * and totals. No scores, no judgements, no personal data beyond the
 * first name — evidence of practice, not a rating of the person. */

import type { LwUser, LwUserCourse } from "./learnworlds";

export interface PassportData {
  v: 1;
  firstName: string;
  sinceYear: string;
  completed: string[];
  inProgress: Array<{ title: string; pct: number | null }>;
  totalEnrolled: number;
  issuedAt: string; // ISO date
}

/* Container/showcase courses that aren't learner modules. */
const EXCLUDED_TITLES = new Set([
  "Financial Literacy",
  "Employability Skills",
  "Confidence & Resilience",
  "Staying Safe Online",
  "Deep Dive Mini Series",
  "Flight Prep",
  "Tutor Resources",
]);

export function buildPassport(
  user: LwUser,
  courses: LwUserCourse[],
  now: Date,
): PassportData {
  const modules = courses.filter((c) => c.title && !EXCLUDED_TITLES.has(c.title));
  const completed = modules.filter((c) => c.completed).map((c) => c.title);
  const inProgress = modules
    .filter((c) => !c.completed)
    .map((c) => ({
      title: c.title,
      pct: c.progressRate === null ? null : Math.round(c.progressRate),
    }));

  const firstName =
    (user.first_name || user.username || "").trim().split(/\s+/)[0] || "Learner";
  const sinceYear = user.created
    ? new Date(user.created * 1000).getFullYear().toString()
    : "";

  return {
    v: 1,
    firstName,
    sinceYear,
    completed,
    inProgress,
    totalEnrolled: modules.length,
    issuedAt: now.toISOString().slice(0, 10),
  };
}

export function isPassportData(v: unknown): v is PassportData {
  const p = v as PassportData;
  return (
    typeof p === "object" &&
    p !== null &&
    p.v === 1 &&
    typeof p.firstName === "string" &&
    Array.isArray(p.completed) &&
    Array.isArray(p.inProgress) &&
    typeof p.issuedAt === "string"
  );
}

/** Days between issue and now — links expire after 7 days. */
export function passportAgeDays(data: PassportData, now: Date): number {
  const issued = Date.parse(data.issuedAt);
  if (Number.isNaN(issued)) return Infinity;
  return (now.getTime() - issued) / 86_400_000;
}

/* ------------------------------------------------------------------
 * Curriculum grouping — LearnWorlds titles differ slightly from the
 * site catalogue (hyphens vs em-dashes, dropped parentheticals,
 * trailing spaces), so matching is on normalised text with prefix
 * tolerance.
 * ------------------------------------------------------------------ */

function norm(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const GROUP_DEFS: Array<{ group: string; titles: string[] }> = [
  {
    group: "Financial Literacy",
    titles: [
      "Welcome to Financial Literacy",
      "Money Confidence & Everyday Decisions",
      "Budgeting that Actually Works",
      "Credit, Borrowing & Your Score",
      "Saving, Emergency Funds & Building a Safety Net",
      "Pay, Payslips, and Planning for Tax & NI",
      "Smart Spending: Big Purchases, Contracts & Consumer Rights",
      "Living Independently — Housing & Household Bills",
      "Financial Literacy Mastery",
    ],
  },
  {
    group: "Employability Skills",
    titles: [
      "Introduction to Employability Skills",
      "Communication That Builds Trust",
      "Teamwork & Collaboration",
      "Problem Solving & Decision Making",
      "Professionalism, Reliability & Time Management",
      "Interviews, CVs & Early Career Mindset",
      "Employability Skills Mastery",
    ],
  },
  {
    group: "Confidence & Resilience",
    titles: [
      "Confidence & Resilience Introduction",
      "What They Are & How to Build Them",
      "Building Real Confidence (Even When You Feel None)",
      "Resilience in Practice — Pressure, Setbacks & Bounce-Back Plans",
      "Communicating Under Pressure: Calm Voice, Clear Steps, Trusted Results",
      "Grit & Growth — Motivation That Lasts (Goals, Habits, Accountability)",
      "Handling Change & Uncertainty — Adaptability You Can Trust",
      "Assertive Boundaries — Saying No Well & Protecting Your Focus",
      "Feedback, Reviews & Continuous Growth",
      "Confidence & Resilience Showcase",
    ],
  },
  {
    group: "Staying Safe Online",
    titles: [
      "What is Online Safety",
      "Cybersecurity Fundamentals",
      "Understanding Online Identity & Reputation",
      "Toxic Online Culture & Group Chats",
      "Digital Well-being & Time Online",
      "Online Scams, Fraud & Money Safety",
      "Staying Safe Online Mastery",
    ],
  },
  {
    group: "Deep Dive Mini Series",
    titles: [
      "Debt Traps and Payday Loans",
      "Preparing for an Interview",
      "First Time Renting & Housing Rights",
      "Managing Nerves",
      "AI in the Workplace",
      "Managing Stress & Burnout",
      "Boosting Confidence before an Interview",
      "How to Use AI",
      "What is Safeguarding",
    ],
  },
];

const GROUP_LOOKUP: Array<{ group: string; key: string }> = GROUP_DEFS.flatMap((g) =>
  g.titles.map((t) => ({ group: g.group, key: norm(t) })),
);

export function groupForTitle(title: string): string {
  const n = norm(title);
  if (!n) return "More learning";
  for (const entry of GROUP_LOOKUP) {
    if (n === entry.key || n.startsWith(entry.key) || entry.key.startsWith(n)) {
      return entry.group;
    }
  }
  return "More learning";
}

export interface PassportGroup {
  group: string;
  completed: string[];
  inProgress: Array<{ title: string; pct: number | null }>;
}

/** Group a passport's modules by curriculum, in catalogue order. */
export function groupPassport(data: PassportData): PassportGroup[] {
  const order = [...GROUP_DEFS.map((g) => g.group), "More learning"];
  const byGroup = new Map<string, PassportGroup>(
    order.map((g) => [g, { group: g, completed: [], inProgress: [] }]),
  );
  for (const title of data.completed) {
    byGroup.get(groupForTitle(title))!.completed.push(title);
  }
  for (const m of data.inProgress) {
    byGroup.get(groupForTitle(m.title))!.inProgress.push(m);
  }
  return order
    .map((g) => byGroup.get(g)!)
    .filter((g) => g.completed.length > 0 || g.inProgress.length > 0);
}
