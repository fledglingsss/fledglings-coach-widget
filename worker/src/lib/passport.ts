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
