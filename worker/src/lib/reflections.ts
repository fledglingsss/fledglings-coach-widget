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

/** Classify an assessment unit by title. */
export function classifyUnit(title: string): ReflectionKind {
  const t = title.toLowerCase();
  if (/initial|pre[- ]?(module|course|completion)?\s*(self)?[- ]?reflect|baseline|before you start/.test(t)) {
    return "pre";
  }
  if (/post[- ]?(module|course|completion)|completion feedback|final reflect|end of module|closing reflect/.test(t)) {
    return "post";
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
      const question = typeof an.description === "string" ? an.description.trim() : "";
      const answer =
        typeof an.answer === "string"
          ? an.answer.trim()
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

function avgPct(responses: ReflectionResponse[]): number | null {
  let got = 0;
  let max = 0;
  for (const r of responses) {
    for (const a of r.answers) {
      /* Prefer explicit points; fall back to a numeric answer that
       * looks like a 1-5 / 1-10 self-rating. */
      if (a.points !== null && a.maxPoints !== null && a.maxPoints > 0) {
        got += a.points;
        max += a.maxPoints;
      } else {
        const n = Number(a.answer);
        if (Number.isFinite(n) && n >= 0 && n <= 10 && a.answer !== "") {
          got += n;
          max += 10;
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

/* ---------------- build-state (incremental sweep) ---------------- */

/** The reflections snapshot is built incrementally across requests to
 * stay inside Workers subrequest limits: each call processes a slice
 * of courses and persists the cursor. */
export interface ReflectionsState {
  status: "unavailable" | "building" | "ready";
  /** When unavailable: what to tell LearnWorlds support. */
  reason?: string;
  cursor: number; // next course index to process
  totalCourses: number;
  shifts: ModuleShift[];
  flags: SafeguardingFlag[];
  /** emails seen per kind, for the completion stat */
  preRespondents: string[];
  postRespondents: string[];
  builtAt: string;
}

export function emptyState(totalCourses: number, now: Date): ReflectionsState {
  return {
    status: "building",
    cursor: 0,
    totalCourses,
    shifts: [],
    flags: [],
    preRespondents: [],
    postRespondents: [],
    builtAt: now.toISOString(),
  };
}
