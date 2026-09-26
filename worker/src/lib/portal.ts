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

import { EXCLUDED_TITLES } from "./skills-passport";
export { EXCLUDED_TITLES };

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
RULES: Use ONLY the aggregate figures provided — never invent numbers, learners, quotes or outcomes. Never name any individual. State clearly that figures are from a recent sample of learner accounts. Frame contribution honestly ("contributes towards", "provides evidence of") — never claim attribution or outcomes the data cannot show. If early-warning aggregates are provided (learners flagged for attention), present them as evidence of ACTIVE MONITORING and pastoral responsiveness — providers demonstrating they spot disengagement early is itself strong personal development evidence. British English. Never use an em dash; use a comma, a hyphen or a full stop instead. Three short paragraphs, max 240 words total: (1) what the provision is and reach; (2) what the engagement/completion figures show, including the monitoring process if figures are present; (3) how this maps to personal development evidence themes (safeguarding awareness, financial literacy, employability, character). No headings, no bullets.`;
}

/** The per-learner reflections read: judgement for a busy tutor, not
 * a wall of answers. The model may only quote verbatim, and "nothing
 * stands out" is an explicitly correct answer — the endpoint also
 * drops any quote it cannot find in the learner's real answers. */
export function learnerInsightSystemPrompt(): string {
  return `You read one young learner's written self-reflections (answered before and after life-skills modules) on behalf of their training provider. Return STRICT JSON only — no markdown, no commentary:
{"summary":"...","highlights":[{"kind":"positive","quote":"...","module":"...","note":"..."}]}
RULES: "summary" = 2-3 plain-English sentences for a busy tutor on how this learner talks about their confidence and progress overall. "highlights" = ONLY answers that genuinely stand out: real growth, striking self-awareness or effort (kind "positive"), or genuine worry — low mood, fear, harsh self-criticism, disengagement, anything a tutor should follow up in person (kind "concern"). Maximum 5 in total, fewer is better, and an EMPTY list is the correct answer when nothing stands out — routine answers and bare numeric ratings are never notable. "quote" must be copied VERBATIM from one of their answers, never invented or paraphrased; "module" = that answer's module name; "note" = one short sentence on why it matters to the tutor. Never diagnose or label the learner. British English.`;
}

/** The cohort-level reflection scan: safeguarding, reasonable
 * adjustments and positive reinforcement read from the scope's own
 * written answers. Verbatim quotes only; the endpoint drops anything
 * it cannot find in the learner's real answers. */
export function reflectionScanSystemPrompt(): string {
  return `You review a batch of a cohort's written self-reflections on behalf of a UK training provider's tutors, applying the recognised safeguarding and equality frameworks below. Return STRICT JSON only, no markdown, no commentary:
{"safeguarding":[{"email":"...","quote":"...","module":"...","why":"...","severity":"concern|monitor"}],"adjustments":[{"email":"...","quote":"...","module":"...","why":"..."}],"positives":[{"email":"...","quote":"...","module":"...","why":"..."}]}

SAFEGUARDING RUBRIC (aligned to Keeping Children Safe in Education indicator categories and Ofsted's safeguarding expectations). Flag an answer when it discloses or credibly signals any of: harm, abuse or neglect at home or elsewhere; self-harm or suicidal thinking; persistent low mood, anxiety or hopelessness; bullying or harassment, including online; exploitation or coercion, including financial; substance misuse; radicalisation indicators (Prevent duty); serious money distress or unsafe living circumstances; isolation or fear affecting daily life. Severity: "concern" = a tutor should follow up within a day; "monitor" = worth a check-in when they next speak. Vague negativity about a module is NOT safeguarding.

REASONABLE ADJUSTMENTS RUBRIC (aligned to the Equality Act 2010 section 20 duty and SEND practice). Flag an answer that discloses or suggests: a specific learning difficulty (dyslexia, dyspraxia, ADHD, autism); a sensory impairment or a request pointing to one (for example asking for transcripts or captions); a physical or long-term health condition affecting study; a mental health condition affecting access; English as an additional language; caring responsibilities or work patterns limiting access; equipment, format or accessibility barriers (text too long or dense, needs audio, needs more time); content pitched at the wrong level for their experience. State the adjustment the provider could reasonably consider.

POSITIVE REINFORCEMENT RUBRIC (strengths-based feedback practice). Pick answers showing: applying the learning to their real life or job; a genuine confidence or mindset shift in their own words; unusually thoughtful or self-aware reflection; effort or persistence worth naming. Tell the tutor what to praise.

RULES: judge EVERY answer in the batch against all three rubrics; "quote" must be copied VERBATIM from one answer, never invented and never trimmed into a different meaning; "email" and "module" exactly as given for that answer; "why" = one short sentence telling the tutor what to do. Report EVERYTHING that meets the safeguarding or adjustments rubric, however many; up to 4 positives per batch, choosing the strongest. Empty safeguarding or adjustments lists are correct when nothing meets the rubric; never manufacture concern and never diagnose. British English. Never use an em dash.`;
}

/** CSV cell hardening: strip delimiters AND neutralise spreadsheet
 * formula injection — a username crafted to start with = + - or @
 * would otherwise execute as a formula when the provider opens the
 * export in Excel. */
function csvCell(value: string): string {
  const clean = value.replace(/[",\n\r]/g, " ").trim();
  return /^[=+\-@\t]/.test(clean) ? `'${clean}` : clean;
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
    const name = csvCell(user.username || user.first_name || "");
    const risk = riskByEmail?.get((user.email || "").toLowerCase());
    lines.push(
      `${csvCell(user.email || "")},${name},${modules.length},${completed},${inProgress},` +
        `${risk ? (risk.daysSinceLogin === null ? "never logged in" : risk.daysSinceLogin) : ""},${risk?.tier ?? ""}`,
    );
  }
  return lines.join("\n");
}
