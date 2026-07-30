/* Skills Passport engine — pure computation for the gamified learner
 * dashboard (Credential Dashboard design, 2026-07-19 handoff).
 *
 * Everything here is derived from REAL LearnWorlds data:
 *   score ring   <- average_score_rate (falls back to progress_rate)
 *   time         <- time_on_course sums
 *   modules      <- completed course count
 *   skills       <- avg progress per curriculum label
 *   badges       <- completions per curriculum + streak + breadth
 *   streak       <- self-tracked daily-visit record (KV, hashed email)
 *   cohort rank  <- upsert-on-visit leaderboard per cohort tag (KV)
 */

export interface CourseRecord {
  courseId: string;
  title: string;
  label: string; // curriculum group from LearnWorlds ("Financial Literacy" …)
  status: "not_started" | "in_progress" | "completed";
  progressRate: number; // 0-100
  scoreRate: number | null; // 0-100 average_score_rate, null if none
  timeSeconds: number;
  unitsDone?: number;
  unitsTotal?: number;
}

/**
 * Display name rule (founder 2026-07-19): usernames/ids are the name
 * without separators ("sakawan"), but the EMAIL local part carries the
 * separator ("sak.awan@…") — so derive "Sak Awan" from the email,
 * falling back to first/last name fields, then the username.
 */
export function displayName(input: {
  email?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
}): string {
  const fromFields = [input.firstName, input.lastName]
    .map((s) => (s ?? "").trim())
    .filter(Boolean)
    .join(" ");
  if (fromFields.includes(" ")) return titleCase(fromFields);

  const local = (input.email ?? "").split("@")[0] ?? "";
  const parts = local.split(/[._\-+]+/).filter((p) => /[a-z]/i.test(p));
  if (parts.length >= 2) return titleCase(parts.join(" "));

  /* Username is first+last run together ("sakawan"): if it starts with
   * the known first name, the remainder is the surname → "Sak Awan". */
  const username = (input.username ?? "").trim();
  const first = (input.firstName ?? "").trim();
  if (first && username.toLowerCase().startsWith(first.toLowerCase())) {
    const rest = username.slice(first.length).replace(/^[._\- ]+/, "");
    if (rest) return titleCase(`${first} ${rest}`);
  }

  if (fromFields) return titleCase(fromFields);
  /* CamelCase usernames ("EllaDaly") carry the word break in their
   * capitals — split there before titleCase lowercases it away. */
  const camel = username.replace(/([a-z])([A-Z])/g, "$1 $2");
  if (camel.includes(" ")) return titleCase(camel);
  if (username) return titleCase(username);
  if (parts.length === 1) return titleCase(parts[0]!);
  return "Fledglings Learner";
}

function titleCase(text: string): string {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0]!.toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export interface StreakState {
  cur: number;
  best: number;
  last: string; // YYYY-MM-DD of last counted day
}

export interface BadgeModel {
  code: string;
  name: string;
  tier: "gold" | "silver" | "bronze";
  state: "earned" | "locked";
  toGo?: number;
}

export interface SkillsPassportModel {
  learner: { name: string; initials: string; cohort: string | null; year: string };
  score: { percent: number; grade: string };
  stats: {
    totalMinutes: number;
    avgMinutesPerModule: number;
    streakDays: number;
    streakBest: number;
    rank: number | null;
    cohortSize: number | null;
    modulesDone: number;
    modulesTotal: number;
    stepsDone: number;
    stepsTotal: number;
  };
  badges: BadgeModel[];
  skills: Array<{ name: string; percent: number }>;
  board: Array<{ rank: number; name: string; completed: number; isMe: boolean }>;
  nearlyThere: Array<{ title: string; percent: number }>;
  modules: Array<{
    title: string;
    label: string;
    percent: number;
    status: CourseRecord["status"];
    minutes: number;
  }>;
}

/* Container/showcase courses that are not learner modules. */
/** Canonical non-module (container/showcase) titles — the ONE list
 * every surface must share (QA 2026-07-22: three divergent copies made
 * provider counts disagree with the learner passport). */
export const EXCLUDED_TITLES = new Set([
  "Financial Literacy",
  "Employability Skills",
  "Confidence & Resilience",
  "Staying Safe Online",
  "Deep Dive Mini Series",
  "Flight Prep",
  "Tutor Resources",
  "The Learner Games",
  "Smart Money Games",
  "Career Games",
  "Mindset Games",
  "Online Safety Games",
]);

export function learnerModules(courses: CourseRecord[]): CourseRecord[] {
  return courses.filter((c) => c.title && !EXCLUDED_TITLES.has(c.title.trim()));
}

/** Whether an enrolment title is a real learner module (used to skip
 * container/showcase courses BEFORE spending progress API calls). */
export function isModuleTitle(title: string): boolean {
  return Boolean(title) && !EXCLUDED_TITLES.has(title.trim());
}

/* ---------------- streak ---------------- */

export function advanceStreak(prev: StreakState | null, todayIso: string): StreakState {
  if (!prev) return { cur: 1, best: 1, last: todayIso };
  if (prev.last === todayIso) return prev;
  const y = new Date(`${todayIso}T00:00:00Z`);
  y.setUTCDate(y.getUTCDate() - 1);
  const yesterdayIso = y.toISOString().slice(0, 10);
  const cur = prev.last === yesterdayIso ? prev.cur + 1 : 1;
  return { cur, best: Math.max(prev.best, cur), last: todayIso };
}

/* ---------------- cohort leaderboard (upsert-on-visit) ---------------- */

export interface LeaderboardEntry {
  h: string; // 12-char email-hash prefix (never the email)
  n: string; // display name (see displayName), e.g. "Sak Awan"
  completed: number;
  score: number;
}

export interface Leaderboard {
  entries: LeaderboardEntry[];
  builtAt: string;
}

export function upsertLeaderboard(
  board: Leaderboard | null,
  entry: LeaderboardEntry,
  nowIso: string,
): Leaderboard {
  const entries = (board?.entries ?? []).filter((e) => e.h !== entry.h);
  entries.push(entry);
  entries.sort(
    (a, b) => b.completed - a.completed || b.score - a.score || a.n.localeCompare(b.n),
  );
  return { entries: entries.slice(0, 200), builtAt: nowIso };
}

export function rankOf(board: Leaderboard, hash: string): number | null {
  const i = board.entries.findIndex((e) => e.h === hash);
  return i === -1 ? null : i + 1;
}

/* ---------------- cohort tag ---------------- */

export function cohortTag(tags: string[] | undefined): string | null {
  if (!tags || tags.length === 0) return null;
  const cohortish = tags.find((t) => /cohort/i.test(t));
  return (cohortish ?? tags[0]).trim() || null;
}

/* ---------------- the passport ---------------- */

const SKILL_ORDER = [
  "Financial Literacy",
  "Employability Skills",
  "Confidence & Resilience",
  "Staying Safe Online",
  "Deep Dive Mini Series",
];

/* Catalogue totals per curriculum (modules a learner could complete). */
const GROUP_TOTALS: Record<string, number> = {
  "Financial Literacy": 7,
  "Employability Skills": 6,
  "Confidence & Resilience": 8,
  "Staying Safe Online": 6,
  "Deep Dive Mini Series": 9,
};

const BADGE_DEFS: Array<{ code: string; name: string; label: string }> = [
  { code: "MM", name: "Money Master", label: "Financial Literacy" },
  { code: "JR", name: "Job Ready", label: "Employability Skills" },
  { code: "TG", name: "True Grit", label: "Confidence & Resilience" },
  { code: "CS", name: "Cyber Smart", label: "Staying Safe Online" },
  { code: "DD", name: "Deep Diver", label: "Deep Dive Mini Series" },
];

function curriculumBadge(
  def: { code: string; name: string; label: string },
  completedInGroup: number,
): BadgeModel {
  const total = GROUP_TOTALS[def.label] ?? 6;
  const silverAt = Math.ceil(total / 2);
  if (completedInGroup >= total) {
    return { ...pick(def), tier: "gold", state: "earned" };
  }
  if (completedInGroup >= silverAt) {
    return { ...pick(def), tier: "silver", state: "earned" };
  }
  if (completedInGroup >= 1) {
    return { ...pick(def), tier: "bronze", state: "earned" };
  }
  return { ...pick(def), tier: "bronze", state: "locked", toGo: 1 };
  function pick(d: typeof def) {
    return { code: d.code, name: d.name };
  }
}

export function gradeFor(percent: number): string {
  if (percent >= 85) return "Distinction";
  if (percent >= 70) return "Merit";
  if (percent >= 50) return "Pass";
  return "Taking Flight";
}

export function computeSkillsPassport(input: {
  firstName: string;
  fullName: string;
  cohort: string | null;
  courses: CourseRecord[];
  streak: StreakState;
  rank: number | null;
  cohortSize: number | null;
  board?: Leaderboard | null;
  myHash?: string;
  now: Date;
}): SkillsPassportModel {
  const modules = learnerModules(input.courses);
  const done = modules.filter((m) => m.status === "completed");

  /* Score: prefer real assessment scores where any exist, otherwise
   * average progress across enrolled modules. */
  const scored = modules.filter((m) => m.scoreRate !== null && m.scoreRate > 0);
  const percent =
    scored.length > 0
      ? Math.round(scored.reduce((s, m) => s + (m.scoreRate as number), 0) / scored.length)
      : modules.length > 0
        ? Math.round(modules.reduce((s, m) => s + m.progressRate, 0) / modules.length)
        : 0;

  const totalMinutes = Math.round(
    modules.reduce((s, m) => s + m.timeSeconds, 0) / 60,
  );

  /* Skills: average progress per curriculum, in catalogue order. */
  const skills = SKILL_ORDER.flatMap((label) => {
    const inGroup = modules.filter((m) => m.label === label);
    if (inGroup.length === 0) return [];
    return [
      {
        name: label === "Deep Dive Mini Series" ? "Deep Dives" : label,
        percent: Math.round(
          inGroup.reduce((s, m) => s + m.progressRate, 0) / inGroup.length,
        ),
      },
    ];
  });

  /* Badges: five curriculum medals + streak + breadth. */
  const badges: BadgeModel[] = BADGE_DEFS.map((def) =>
    curriculumBadge(
      def,
      done.filter((m) => m.label === def.label).length,
    ),
  );
  badges.push(
    input.streak.cur >= 7
      ? { code: "OF", name: "On Fire", tier: "gold", state: "earned" }
      : {
          code: "OF",
          name: "On Fire",
          tier: "gold",
          state: "locked",
          toGo: 7 - input.streak.cur,
        },
  );
  const coreLabels = SKILL_ORDER.slice(0, 4);
  const breadth = coreLabels.filter((l) =>
    done.some((m) => m.label === l),
  ).length;
  badges.push(
    breadth >= 4
      ? { code: "AR", name: "All Rounder", tier: "gold", state: "earned" }
      : { code: "AR", name: "All Rounder", tier: "gold", state: "locked", toGo: 4 - breadth },
  );

  const initials = input.fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("") || "FL";

  const academicYear = (() => {
    const y = input.now.getUTCFullYear();
    const start = input.now.getUTCMonth() >= 7 ? y : y - 1;
    return `${start}/${String(start + 1).slice(2)}`;
  })();

  /* Cohort top-5 (plus the learner if outside the top 5). */
  const boardEntries = input.board?.entries ?? [];
  const board = boardEntries.slice(0, 5).map((e, i) => ({
    rank: i + 1,
    name: e.n,
    completed: e.completed,
    isMe: e.h === input.myHash,
  }));
  if (input.myHash && !board.some((b) => b.isMe)) {
    const idx = boardEntries.findIndex((e) => e.h === input.myHash);
    if (idx >= 5) {
      board.push({
        rank: idx + 1,
        name: boardEntries[idx].n,
        completed: boardEntries[idx].completed,
        isMe: true,
      });
    }
  }

  const nearlyThere = modules
    .filter((m) => m.status !== "completed" && m.progressRate > 0)
    .sort((a, b) => b.progressRate - a.progressRate)
    .slice(0, 3)
    .map((m) => ({ title: m.title, percent: Math.round(m.progressRate) }));

  return {
    learner: {
      name: input.fullName || input.firstName,
      initials,
      cohort: input.cohort,
      year: academicYear,
    },
    score: { percent, grade: gradeFor(percent) },
    stats: {
      totalMinutes,
      avgMinutesPerModule:
        modules.length > 0 ? Math.round(totalMinutes / modules.length) : 0,
      streakDays: input.streak.cur,
      streakBest: input.streak.best,
      rank: input.rank,
      cohortSize: input.cohortSize,
      modulesDone: done.length,
      modulesTotal: modules.length,
      stepsDone: modules.reduce((s, m) => s + (m.unitsDone ?? 0), 0),
      stepsTotal: modules.reduce((s, m) => s + (m.unitsTotal ?? 0), 0),
    },
    badges,
    skills,
    board,
    nearlyThere,
    modules: modules
      .map((m) => ({
        title: m.title,
        label: m.label,
        percent: Math.round(m.progressRate),
        status: m.status,
        minutes: Math.round(m.timeSeconds / 60),
      }))
      .sort((a, b) => b.percent - a.percent || a.title.localeCompare(b.title)),
  };
}

export function formatMinutes(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}
