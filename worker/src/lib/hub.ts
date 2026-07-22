/* Employability Hub — score history + readiness computation.
 *
 * Privacy contract: we store ONLY integer scores and timestamps,
 * keyed by a hash (email when the hub knows it, device id otherwise).
 * Never any CV text, transcript, or answer — those remain unstored by
 * design. History is capped so a learner's record stays tiny. */

export type HubTool = "cv" | "linkedin" | "interview";

export interface ScorePoint {
  s: number; // 0-100
  at: number; // epoch seconds
}

export interface HubScores {
  cv: ScorePoint[];
  linkedin: ScorePoint[];
  interview: ScorePoint[];
}

export const HUB_HISTORY_MAX = 12;

export function emptyScores(): HubScores {
  return { cv: [], linkedin: [], interview: [] };
}

export function parseScores(raw: string | null): HubScores {
  if (!raw) return emptyScores();
  try {
    const parsed = JSON.parse(raw) as Partial<HubScores>;
    const clean = (list: unknown): ScorePoint[] =>
      (Array.isArray(list) ? list : [])
        .filter(
          (p): p is ScorePoint =>
            typeof p === "object" &&
            p !== null &&
            typeof (p as ScorePoint).s === "number" &&
            typeof (p as ScorePoint).at === "number",
        )
        .map((p) => ({ s: Math.max(0, Math.min(100, Math.round(p.s))), at: p.at }))
        .slice(-HUB_HISTORY_MAX);
    return {
      cv: clean(parsed.cv),
      linkedin: clean(parsed.linkedin),
      interview: clean(parsed.interview),
    };
  } catch {
    return emptyScores();
  }
}

export function pushScore(
  scores: HubScores,
  tool: HubTool,
  score: number,
  atSecs: number,
): HubScores {
  const next = { ...scores, [tool]: [...scores[tool]] };
  next[tool].push({ s: Math.max(0, Math.min(100, Math.round(score))), at: atSecs });
  next[tool] = next[tool].slice(-HUB_HISTORY_MAX);
  return next;
}

export interface ToolSummary {
  latest: number | null;
  previous: number | null;
  delta: number | null;
  attempts: number;
  lastAt: number | null;
  history: number[]; // for sparklines
}

export function summariseTool(points: ScorePoint[]): ToolSummary {
  const latest = points.length ? points[points.length - 1]!.s : null;
  const previous = points.length > 1 ? points[points.length - 2]!.s : null;
  return {
    latest,
    previous,
    delta: latest !== null && previous !== null ? latest - previous : null,
    attempts: points.length,
    lastAt: points.length ? points[points.length - 1]!.at : null,
    history: points.map((p) => p.s),
  };
}

export interface HubSummary {
  cv: ToolSummary;
  linkedin: ToolSummary;
  interview: ToolSummary;
  /** Weighted blend of latest scores across practised tools; null
   * until at least one tool has been used. */
  readiness: number | null;
  /** Which tool to do next, with a plain-English reason. */
  next: { tool: HubTool; reason: string };
}

export function summariseHub(scores: HubScores): HubSummary {
  const cv = summariseTool(scores.cv);
  const linkedin = summariseTool(scores.linkedin);
  const interview = summariseTool(scores.interview);

  const parts: Array<{ v: number; w: number }> = [];
  if (cv.latest !== null) parts.push({ v: cv.latest, w: 0.4 });
  if (linkedin.latest !== null) parts.push({ v: linkedin.latest, w: 0.25 });
  if (interview.latest !== null) parts.push({ v: interview.latest, w: 0.35 });
  const totalW = parts.reduce((s, p) => s + p.w, 0);
  const readiness =
    parts.length === 0
      ? null
      : Math.round(parts.reduce((s, p) => s + p.v * p.w, 0) / totalW);

  /* Guided journey: unpractised tools first (CV -> LinkedIn ->
   * Interview), then the weakest score. */
  let next: HubSummary["next"];
  if (cv.latest === null) {
    next = { tool: "cv", reason: "Start here — a scored CV review is the foundation for everything else." };
  } else if (linkedin.latest === null) {
    next = { tool: "linkedin", reason: "Your CV is scored — now get your LinkedIn profile to match it." };
  } else if (interview.latest === null) {
    next = { tool: "interview", reason: "Paper's sorted — time to practise saying it out loud." };
  } else {
    const lowest = [
      { tool: "cv" as const, v: cv.latest },
      { tool: "linkedin" as const, v: linkedin.latest },
      { tool: "interview" as const, v: interview.latest },
    ].sort((a, b) => a.v - b.v)[0]!;
    next = {
      tool: lowest.tool,
      reason: `Your ${lowest.tool === "cv" ? "CV" : lowest.tool === "linkedin" ? "LinkedIn" : "interview"} score (${lowest.v}) is the one holding your readiness back — one more round.`,
    };
  }

  return { cv, linkedin, interview, readiness, next };
}
