/* Pre/post self-reflection intelligence + safeguarding flags.
 *
 * Data source: LearnWorlds assessmentV2 units ("Initial Self -
 * Reflection" / "Post Completion Feedback" in every module) read via
 * GET /v2/assessments/{unit_id}/responses. That endpoint is gated on
 * some LearnWorlds plans — the pipeline detects the 404 and reports
 * "needs enabling" rather than pretending there is no data.
 *
 * Privacy rules: the portal shows AGGREGATE reflection shifts; verbatim
 * answers surface ONLY as safeguarding flags (minimum necessary to act)
 * behind the provider access code, tag-scoped. */

import { crisisHeuristic } from "./safety";

/* ---------------- shapes ---------------- */

export interface ReflectionAnswer {
  question: string;
  answer: string;
  points: number | null;
  maxPoints: number | null;
}

export interface ReflectionResponse {
  userId: string;
  email: string;
  submittedAt: number | null; // epoch seconds
  answers: ReflectionAnswer[];
}

export type ReflectionKind = "pre" | "post" | "other";

export interface AssessmentUnit {
  courseId: string;
  courseTitle: string;
  unitId: string;
  unitTitle: string;
  kind: ReflectionKind;
}

/** Classify an assessment unit by title.
 *
 * Deliberately strict (verified against the live unit inventory,
 * 2026-07-21): a PRE must be a *reflection* ("Initial Self -
 * Reflection" / "Initial Self Reflection"), not a knowledge check —
 * "Initial Knowledge Check" is a quiz and would poison the confidence
 * shift with a different scale. A POST must be completion
 * reflection/feedback ("Post Completion Feedback" / "Post Completion
 * Reflection"); mid-module activity reflections stay out. */
export function classifyUnit(title: string): ReflectionKind {
  const t = title.toLowerCase();
  const isReflective = /reflect|feedback/.test(t);
  if (!isReflective) return "other";
  if (/post[- ]?(module|course|completion)|completion (feedback|reflection)|final reflect|end of module|closing reflect/.test(t)) {
    return "post";
  }
  if (/initial|\bpre[- ]|baseline|before you start/.test(t)) {
    return "pre";
  }
  return "other";
}

/** Parse one raw response row from the LearnWorlds payload. */
export function parseResponse(raw: unknown): ReflectionResponse | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const userId = typeof r.user_id === "string" ? r.user_id : "";
  const email = typeof r.email === "string" ? r.email.toLowerCase() : "";
  if (!userId && !email) return null;
  const answers: ReflectionAnswer[] = (Array.isArray(r.answers) ? r.answers : [])
    .map((a) => {
      const an = a as Record<string, unknown>;
      /* The LW rich-text editor leaks markup into free-text answers
       * ("<strong>empowering</strong>", "<br />") — strip tags so the
       * verbatim record reads as the learner wrote it. */
      const detag = (s: string) =>
        s.replace(/<br\s*\/?>/gi, " ").replace(/<\/?[a-z][^>]*>/gi, "").replace(/\s+/g, " ").trim();
      const question = typeof an.description === "string" ? detag(an.description.trim()) : "";
      const answer =
        typeof an.answer === "string"
          ? detag(an.answer.trim())
          : an.answer !== null && an.answer !== undefined
            ? String(an.answer)
            : "";
      if (!question && !answer) return null;
      return {
        question: question.slice(0, 300),
        answer: answer.slice(0, 1200),
        points: typeof an.points === "number" ? an.points : null,
        maxPoints: typeof an.blockMaxScore === "number" ? an.blockMaxScore : null,
      };
    })
    .filter((a): a is ReflectionAnswer => a !== null);
  return {
    userId,
    email,
    submittedAt: typeof r.submittedTimestamp === "number" ? r.submittedTimestamp : null,
    answers,
  };
}

/* ---------------- safeguarding scan ---------------- */

export interface SafeguardingFlag {
  email: string;
  courseTitle: string;
  unitTitle: string;
  question: string;
  answer: string;
  submittedAt: number | null;
  matched: "crisis-language";
}

/** Deterministic scan of free-text answers using the same 33-pattern
 * crisis heuristic that guards the coach. Numeric/choice answers are
 * skipped — only genuine free text can carry a disclosure. */
export function scanForSafeguarding(
  unit: AssessmentUnit,
  response: ReflectionResponse,
): SafeguardingFlag[] {
  const flags: SafeguardingFlag[] = [];
  for (const a of response.answers) {
    if (a.answer.length < 12) continue; // ratings/choices, not prose
    if (/^[\d\s./-]+$/.test(a.answer)) continue;
    if (crisisHeuristic(a.answer)) {
      flags.push({
        email: response.email,
        courseTitle: unit.courseTitle,
        unitTitle: unit.unitTitle,
        question: a.question,
        answer: a.answer,
        submittedAt: response.submittedAt,
        matched: "crisis-language",
      });
    }
  }
  return flags;
}

/* ---------------- pre/post aggregation ---------------- */

export interface ModuleShift {
  courseId: string;
  courseTitle: string;
  preCount: number;
  postCount: number;
  /** Average self-score as % of max, when answers carry points. */
  preAvgPct: number | null;
  postAvgPct: number | null;
  shift: number | null; // percentage points, post - pre
}

/** Parse one answer string as a self-rating. Learners answer rating
 * blocks as "8 / 10" (live data 2026-08-03) — parse the fraction,
 * else a bare 0-10 number; anything else is not a rating. */
export function answerScore(answer: string): { got: number; max: number } | null {
  const frac = /^\s*(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)\s*$/.exec(answer);
  if (frac && Number(frac[2]) > 0 && Number(frac[1]) <= Number(frac[2])) {
    return { got: Number(frac[1]), max: Number(frac[2]) };
  }
  const n = Number(answer);
  if (Number.isFinite(n) && n >= 0 && n <= 10 && answer.trim() !== "") {
    return { got: n, max: 10 };
  }
  return null;
}

function avgPct(responses: ReflectionResponse[]): number | null {
  let got = 0;
  let max = 0;
  for (const r of responses) {
    for (const a of r.answers) {
      /* Prefer explicit points; fall back to a numeric self-rating. */
      if (a.points !== null && a.maxPoints !== null && a.maxPoints > 0) {
        got += a.points;
        max += a.maxPoints;
      } else {
        const score = answerScore(a.answer);
        if (score) {
          got += score.got;
          max += score.max;
        }
      }
    }
  }
  if (max === 0) return null;
  return Math.round((got / max) * 100);
}

/** Aggregate pre/post responses into a per-module confidence shift. */
export function moduleShift(
  courseId: string,
  courseTitle: string,
  pre: ReflectionResponse[],
  post: ReflectionResponse[],
): ModuleShift {
  const preAvgPct = avgPct(pre);
  const postAvgPct = avgPct(post);
  return {
    courseId,
    courseTitle,
    preCount: pre.length,
    postCount: post.length,
    preAvgPct,
    postAvgPct,
    shift:
      preAvgPct !== null && postAvgPct !== null ? postAvgPct - preAvgPct : null,
  };
}

/** Confidence shifts recomputed from raw answer rows — the SERVE-time
 * path, so a scoped provider's chart covers only their learners and
 * only the modules those learners actually answered on, never the
 * whole school's. Counts are distinct learners per side ("n before ·
 * n after"). Rows are capped at RAW_ROWS_MAX upstream; at today's
 * volumes that cap is far away. */
export function shiftsFromRows(rows: RawReflectionRow[]): ModuleShift[] {
  interface Side {
    got: number;
    max: number;
    emails: Set<string>;
  }
  const byModule = new Map<string, { pre: Side; post: Side }>();
  const side = (): Side => ({ got: 0, max: 0, emails: new Set() });
  for (const row of rows) {
    if (row.kind !== "pre" && row.kind !== "post") continue;
    const entry = byModule.get(row.courseTitle) ?? { pre: side(), post: side() };
    const s = row.kind === "pre" ? entry.pre : entry.post;
    s.emails.add(row.email.toLowerCase());
    const score = answerScore(row.answer);
    if (score) {
      s.got += score.got;
      s.max += score.max;
    }
    byModule.set(row.courseTitle, entry);
  }
  const pct = (s: Side): number | null =>
    s.max === 0 ? null : Math.round((s.got / s.max) * 100);
  return [...byModule.entries()]
    .map(([courseTitle, e]) => {
      const preAvgPct = pct(e.pre);
      const postAvgPct = pct(e.post);
      return {
        courseId: courseTitle,
        courseTitle,
        preCount: e.pre.emails.size,
        postCount: e.post.emails.size,
        preAvgPct,
        postAvgPct,
        shift:
          preAvgPct !== null && postAvgPct !== null ? postAvgPct - preAvgPct : null,
      };
    })
    .sort((a, b) => b.preCount + b.postCount - (a.preCount + a.postCount));
}

/* ---------------- coverage (which units we matched, per module) ---------------- */

/** Per-module record of which assessment units were identified as the
 * pre/post reflections — so "are we pulling the right things?" has a
 * checkable answer instead of an assumption. Unmatched assessment unit
 * titles are listed so naming outliers are visible. */
export interface CoverageEntry {
  courseId: string;
  courseTitle: string;
  preTitle: string | null;
  postTitle: string | null;
  otherTitles: string[];
}

export function buildCoverage(
  courseId: string,
  courseTitle: string,
  units: Array<{ title: string; type: string }>,
): CoverageEntry {
  const entry: CoverageEntry = {
    courseId,
    courseTitle,
    preTitle: null,
    postTitle: null,
    otherTitles: [],
  };
  for (const u of units) {
    if (u.type !== "assessmentV2") continue;
    const kind = classifyUnit(u.title);
    if (kind === "pre" && entry.preTitle === null) entry.preTitle = u.title;
    else if (kind === "post" && entry.postTitle === null) entry.postTitle = u.title;
    else entry.otherTitles.push(u.title);
  }
  return entry;
}

/* ---------------- raw response retention ---------------- */

/** One question/answer pair, flattened for the raw-data export the
 * providers asked for. Stored verbatim (the whole point is the
 * learner's own words) but bounded so the KV snapshot stays sane. */
export interface RawReflectionRow {
  email: string;
  courseTitle: string;
  unitTitle: string;
  kind: ReflectionKind;
  submittedAt: number | null;
  question: string;
  answer: string;
}

export const RAW_ANSWER_MAX_CHARS = 600;
export const RAW_ROWS_MAX = 20000;

export function rawRows(
  unit: AssessmentUnit,
  response: ReflectionResponse,
): RawReflectionRow[] {
  return response.answers
    .filter((a) => a.answer !== "")
    .map((a) => ({
      email: response.email,
      courseTitle: unit.courseTitle,
      unitTitle: unit.unitTitle,
      kind: unit.kind,
      submittedAt: response.submittedAt,
      question: a.question,
      /* A cut-off answer is marked, never silently shortened: these
       * are shown as the learner's verbatim words, so the reader has
       * to be able to tell where the learner stopped and where we
       * did. */
      answer:
        a.answer.length > RAW_ANSWER_MAX_CHARS
          ? a.answer.slice(0, RAW_ANSWER_MAX_CHARS) + "… [truncated]"
          : a.answer,
    }));
}

/* ---------------- build-state (incremental sweep) ---------------- */

/** The reflections snapshot is built incrementally across requests to
 * stay inside Workers subrequest limits: each call processes a slice
 * of courses and persists the cursor. The contents sweep (coverage +
 * the email->tags map) always completes even when the responses API is
 * plan-gated, so unit matching is verifiable before LearnWorlds flips
 * the switch. */
export interface ReflectionsState {
  status: "building" | "ready";
  /** False when GET /v2/assessments/{id}/responses is plan-gated. */
  responsesEnabled: boolean;
  /** When gated: what to tell LearnWorlds support. */
  reason?: string;
  cursor: number; // next course index to process
  totalCourses: number;
  coverage: CoverageEntry[];
  shifts: ModuleShift[];
  flags: SafeguardingFlag[];
  /** Every question/answer pair, verbatim, capped at RAW_ROWS_MAX —
   * the raw-data layer under the aggregate charts. */
  responses: RawReflectionRow[];
  /** email (lowercased) -> LearnWorlds tags, captured in the same
   * sweep so cohort scoping never depends on another cache. */
  userTags: Record<string, string[]>;
  /** Lowercased emails of role-"user" accounts at sweep time. Staff,
   * admin and platform-support accounts also answer assessments while
   * testing modules — their responses must never reach a provider's
   * reflections view or skew the confidence shifts. Absent on
   * pre-filter snapshots, which marks them due for a rebuild. */
  learnerEmails?: string[];
  /** Failed fetch attempts per course id — a course is retried on
   * later budget steps and only skipped after three failures. */
  attempts?: Record<string, number>;
  /** The module list this build swept, discovered from the live
   * catalogue at build start - a scheme releasing new modules joins
   * automatically on the next rebuild. */
  courseList?: Array<{ title: string; id: string }>;
  /** emails seen per kind, for the completion stat */
  preRespondents: string[];
  postRespondents: string[];
  builtAt: string;
}

export function emptyState(totalCourses: number, now: Date): ReflectionsState {
  return {
    status: "building",
    responsesEnabled: true,
    cursor: 0,
    totalCourses,
    coverage: [],
    shifts: [],
    flags: [],
    responses: [],
    userTags: {},
    learnerEmails: [],
    attempts: {},
    preRespondents: [],
    postRespondents: [],
    builtAt: now.toISOString(),
  };
}
