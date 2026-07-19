/* #6 — At-risk early-warning engine.
 *
 * Deterministic, evidence-based risk assessment from LearnWorlds
 * activity signals (last_login / created / module progress). Pure
 * functions so every tier decision is testable and every reason a
 * provider reads can be traced to a signal.
 *
 * Tiers (provider-facing language):
 *   high    — needs contact now (long silence, or never arrived)
 *   medium  — drifting (10–20 days quiet)
 *   watch   — early wobble (5–9 days quiet, or active but stuck)
 *   ok      — engaged recently
 *   new     — joined in the last week; onboarding, not risk
 */

export type RiskTier = "high" | "medium" | "watch" | "ok" | "new";

export interface RiskInput {
  id: string;
  email: string;
  name: string;
  createdSecs: number | null;
  lastLoginSecs: number | null;
  tags: string[];
}

export interface RiskEnrichment {
  modulesEnrolled: number;
  modulesCompleted: number;
  stalledTitle: string | null; // an in-progress module, for a personal nudge
}

export interface RiskAssessment {
  id: string;
  email: string;
  name: string;
  tier: RiskTier;
  score: number; // 0-100, higher = more urgent
  daysSinceLogin: number | null; // null = never logged in
  daysSinceJoined: number | null;
  reasons: string[];
  nudge: string;
  cohort: string | null;
  tags: string[];
  enrichment?: RiskEnrichment;
}

export interface RiskSummary {
  assessedAt: string;
  learners: number;
  tiers: Record<RiskTier, number>;
  activeLast7Days: number;
  neverLoggedIn: number;
}

const DAY = 86_400;

function daysBetween(fromSecs: number, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() / 1000 - fromSecs) / DAY));
}

function shortDate(secs: number): string {
  return new Date(secs * 1000).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || "there";
}

/** Assess one learner. Enrichment (module counts) is optional — the
 * core tiers work from login signals alone. */
export function assessLearner(
  input: RiskInput,
  now: Date,
  enrichment?: RiskEnrichment,
): RiskAssessment {
  const joined = input.createdSecs !== null ? daysBetween(input.createdSecs, now) : null;
  const sinceLogin =
    input.lastLoginSecs !== null && input.lastLoginSecs > 0
      ? daysBetween(input.lastLoginSecs, now)
      : null;
  const reasons: string[] = [];
  let tier: RiskTier;
  let score: number;

  if (sinceLogin === null) {
    /* Never logged in — urgency scales with how long the account has
     * been waiting. */
    if (joined === null || joined >= 14) {
      tier = "high";
      score = 90 + Math.min(10, joined ?? 10);
      reasons.push(
        joined !== null
          ? `Added ${joined} days ago but has never logged in`
          : "Has never logged in",
      );
    } else if (joined >= 3) {
      tier = "watch";
      score = 45 + joined;
      reasons.push(`Added ${joined} days ago and hasn't logged in yet`);
    } else {
      tier = "new";
      score = 10;
      reasons.push("Just added — give them a few days to arrive");
    }
  } else if (joined !== null && joined < 7) {
    tier = "new";
    score = 5;
    reasons.push(`Joined ${joined === 0 ? "today" : `${joined} days ago`} and has logged in`);
  } else if (sinceLogin >= 21) {
    tier = "high";
    score = Math.min(100, 70 + sinceLogin);
    reasons.push(
      `No login for ${sinceLogin} days (last seen ${shortDate(input.lastLoginSecs!)})`,
    );
  } else if (sinceLogin >= 10) {
    tier = "medium";
    score = 40 + sinceLogin;
    reasons.push(
      `Quiet for ${sinceLogin} days (last seen ${shortDate(input.lastLoginSecs!)})`,
    );
  } else if (sinceLogin >= 5) {
    tier = "watch";
    score = 20 + sinceLogin;
    reasons.push(`Starting to drift — ${sinceLogin} days since last login`);
  } else {
    tier = "ok";
    score = Math.max(0, sinceLogin * 2);
    reasons.push(
      sinceLogin === 0 ? "Active today" : `Active ${sinceLogin} day${sinceLogin === 1 ? "" : "s"} ago`,
    );
  }

  /* Enrichment can raise a quiet-but-logged-in learner: engaged but
   * stuck is a real early signal. */
  if (enrichment) {
    if (
      tier === "ok" &&
      joined !== null &&
      joined >= 30 &&
      enrichment.modulesEnrolled > 0 &&
      enrichment.modulesCompleted === 0
    ) {
      tier = "watch";
      score = Math.max(score, 30);
      reasons.push(
        `Logs in but hasn't completed a module yet (${enrichment.modulesEnrolled} enrolled, ${joined} days on platform)`,
      );
    }
    if (enrichment.stalledTitle && tier !== "ok" && tier !== "new") {
      reasons.push(`Part-way through “${enrichment.stalledTitle}” — an easy win to restart with`);
    }
  }

  return {
    id: input.id,
    email: input.email,
    name: input.name,
    tier,
    score: Math.round(Math.min(100, score)),
    daysSinceLogin: sinceLogin,
    daysSinceJoined: joined,
    reasons,
    nudge: buildNudge(input.name, tier, sinceLogin, enrichment),
    cohort: input.tags[0] ?? null,
    tags: input.tags,
    ...(enrichment ? { enrichment } : {}),
  };
}

/** A ready-to-send nudge in the Fledglings voice — warm, short,
 * specific, never guilt-tripping. Provider staff copy and send it
 * through their own channel. */
export function buildNudge(
  name: string,
  tier: RiskTier,
  daysSinceLogin: number | null,
  enrichment?: RiskEnrichment,
): string {
  const fn = firstName(name);
  const stalled = enrichment?.stalledTitle;

  if (daysSinceLogin === null) {
    return (
      `Hi ${fn}, your Fledglings account is ready and waiting for you — it's the life-skills platform we've set you up on ` +
      `(money, interviews, staying safe online). Your first module takes about 20 minutes and you can do it on your phone. ` +
      `Log in when you get a minute and have a look around — no pressure, just don't want you missing out.`
    );
  }
  if (tier === "high" || tier === "medium") {
    return (
      `Hi ${fn}, we noticed you haven't been on Fledglings for a little while — no judgement, life gets busy. ` +
      (stalled
        ? `You're already part-way through “${stalled}”, so picking it back up would only take a few minutes. `
        : `Even 10 minutes on a module counts. `) +
      `If anything's making it hard to get on (login trouble, time, anything else), reply and we'll sort it together.`
    );
  }
  if (tier === "watch") {
    return (
      `Hi ${fn}, just a nudge from Fledglings — ` +
      (stalled
        ? `you're close to finishing “${stalled}” and it'd be a shame to lose the streak. `
        : `your next module is sitting ready when you are. `) +
      `Ten minutes this week keeps you moving.`
    );
  }
  return `Hi ${fn}, you're doing brilliantly on Fledglings — keep it up. Your Skills Passport is filling out nicely.`;
}

/** Order for display: most urgent first, then by score. */
const TIER_ORDER: Record<RiskTier, number> = {
  high: 0,
  medium: 1,
  watch: 2,
  new: 3,
  ok: 4,
};

export function sortAssessments(list: RiskAssessment[]): RiskAssessment[] {
  return [...list].sort(
    (a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier] || b.score - a.score,
  );
}

export function summarise(list: RiskAssessment[], now: Date): RiskSummary {
  const tiers: Record<RiskTier, number> = { high: 0, medium: 0, watch: 0, ok: 0, new: 0 };
  let active7 = 0;
  let never = 0;
  for (const a of list) {
    tiers[a.tier] += 1;
    if (a.daysSinceLogin !== null && a.daysSinceLogin <= 7) active7 += 1;
    if (a.daysSinceLogin === null) never += 1;
  }
  return {
    assessedAt: now.toISOString(),
    learners: list.length,
    tiers,
    activeLast7Days: active7,
    neverLoggedIn: never,
  };
}

/* ---------------- history (trend over time) ---------------- */

export interface RiskHistoryPoint {
  date: string; // YYYY-MM-DD
  learners: number;
  activeLast7Days: number;
  high: number;
  medium: number;
}

/** Append today's point, replacing any same-day entry, keeping 60 days. */
export function appendHistory(
  history: RiskHistoryPoint[] | null,
  summary: RiskSummary,
): RiskHistoryPoint[] {
  const date = summary.assessedAt.slice(0, 10);
  const point: RiskHistoryPoint = {
    date,
    learners: summary.learners,
    activeLast7Days: summary.activeLast7Days,
    high: summary.tiers.high,
    medium: summary.tiers.medium,
  };
  const kept = (history ?? []).filter((h) => h.date !== date);
  kept.push(point);
  kept.sort((a, b) => a.date.localeCompare(b.date));
  return kept.slice(-60);
}
