/* #5 — Provider evidence portal: pure aggregation over sampled
 * LearnWorlds data + the Ofsted-style narrative prompt.
 *
 * Privacy rules: the dashboard shows AGGREGATES; the narrative is
 * aggregate-only and never contains a learner's name or email. The
 * learner table (names/emails) is only in the CSV export, which sits
 * behind the same access code — provider staff legitimately see their
 * own learners. */

import type { LwUser, LwUserCourse } from "./learnworlds";

export interface CourseStat {
  title: string;
  enrolled: number;
  completed: number;
  completionRate: number; // 0-100, of the sample
}

export interface PortalStats {
  totalUsers: number | null;
  sampleSize: number;
  activeInSample: number;
  avgModulesPerLearner: number;
  courseStats: CourseStat[];
  generatedAt: string;
}

export const EXCLUDED_TITLES = new Set([
  "Financial Literacy",
  "Employability Skills",
  "Confidence & Resilience",
  "Staying Safe Online",
  "Deep Dive Mini Series",
  "Flight Prep",
  "Tutor Resources",
]);

export function aggregate(
  totalUsers: number | null,
  sample: Array<{ user: LwUser; courses: LwUserCourse[] }>,
  now: Date,
): PortalStats {
  const byCourse = new Map<string, { enrolled: number; completed: number }>();
  let active = 0;
  let moduleCount = 0;

  for (const { courses } of sample) {
    const modules = courses.filter((c) => c.title && !EXCLUDED_TITLES.has(c.title));
    moduleCount += modules.length;
    if (
      modules.some((c) => c.completed || (c.progressRate !== null && c.progressRate > 0))
    ) {
      active += 1;
    }
    for (const c of modules) {
      const entry = byCourse.get(c.title) ?? { enrolled: 0, completed: 0 };
      entry.enrolled += 1;
      if (c.completed) entry.completed += 1;
      byCourse.set(c.title, entry);
    }
  }

  const courseStats: CourseStat[] = [...byCourse.entries()]
    .map(([title, s]) => ({
      title,
      enrolled: s.enrolled,
      completed: s.completed,
      completionRate: s.enrolled === 0 ? 0 : Math.round((s.completed / s.enrolled) * 100),
    }))
    .sort((a, b) => b.enrolled - a.enrolled || a.title.localeCompare(b.title));

  return {
    totalUsers,
    sampleSize: sample.length,
    activeInSample: active,
    avgModulesPerLearner:
      sample.length === 0 ? 0 : Math.round((moduleCount / sample.length) * 10) / 10,
    courseStats,
    generatedAt: now.toISOString(),
  };
}

export function narrativeSystemPrompt(): string {
  return `You write short evidence narratives for UK apprenticeship training providers and schools using the Fledglings life-skills platform, for use in self-assessment reports and Ofsted personal development evidence.
RULES: Use ONLY the aggregate figures provided — never invent numbers, learners, quotes or outcomes. Never name any individual. State clearly that figures are from a recent sample of learner accounts. Frame contribution honestly ("contributes towards", "provides evidence of") — never claim attribution or outcomes the data cannot show. If early-warning aggregates are provided (learners flagged for attention), present them as evidence of ACTIVE MONITORING and pastoral responsiveness — providers demonstrating they spot disengagement early is itself strong personal development evidence. British English. Three short paragraphs, max 240 words total: (1) what the provision is and reach; (2) what the engagement/completion figures show, including the monitoring process if figures are present; (3) how this maps to personal development evidence themes (safeguarding awareness, financial literacy, employability, character). No headings, no bullets.`;
}

export function csvExport(
  sample: Array<{ user: LwUser; courses: LwUserCourse[] }>,
  riskByEmail?: Map<string, { tier: string; daysSinceLogin: number | null }>,
): string {
  const lines = [
    "email,name,modules_enrolled,modules_completed,in_progress,days_since_login,attention_level",
  ];
  for (const { user, courses } of sample) {
    const modules = courses.filter((c) => c.title && !EXCLUDED_TITLES.has(c.title));
    const completed = modules.filter((c) => c.completed).length;
    const inProgress = modules.length - completed;
    const name = (user.username || user.first_name || "").replace(/[",\n]/g, " ");
    const risk = riskByEmail?.get((user.email || "").toLowerCase());
    lines.push(
      `${(user.email || "").replace(/[",\n]/g, " ")},${name},${modules.length},${completed},${inProgress},` +
        `${risk ? (risk.daysSinceLogin === null ? "never logged in" : risk.daysSinceLogin) : ""},${risk?.tier ?? ""}`,
    );
  }
  return lines.join("\n");
}
