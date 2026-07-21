/* Fledglings school-wide AI coach — Hono router.
 *
 * Endpoints:
 *   GET  /            — service info
 *   GET  /health      — liveness probe (the widget checks this before
 *                       showing itself; unreachable worker = no widget,
 *                       never a broken one)
 *   GET  /widget.js   — the floating chat widget, served from this
 *                       worker so LearnWorlds only needs a two-line
 *                       custom-code snippet
 *   POST /api/coach   — the layered coach pipeline (below)
 *
 * Pipeline for every coach message, in order:
 *   0. Origin allowlist + body-size cap + strict validation
 *   1. Kill switch (COACH_DISABLED)
 *   2. Rate limits (hashed ids in KV; nothing else is stored)
 *   3. Deterministic crisis heuristic — authored signposting reply,
 *      NO model call; works even in a total model outage
 *   4. Haiku moderation classifier (ALLOW / BLOCK / CRISIS);
 *      classifier failure => authored fallback WITH signposts,
 *      never an unscreened coach reply
 *   5. Sonnet coach reply, then guardReply() output gate
 *
 * Privacy by design: this worker stores NOTHING a learner writes.
 * Conversation history lives in the learner's browser (sessionStorage)
 * and is sent with each request. KV holds only hashed rate-limit
 * counters. Logs carry outcome kinds and latency, never message text. */

import { Hono } from "hono";
import { cors } from "hono/cors";

import { isOriginAllowed } from "./lib/origin";
import { checkAndIncrement, hashLearnerId, limits } from "./lib/rate-limit";
import { crisisHeuristic, guardReply } from "./lib/safety";
import {
  CAPS,
  EMAIL_PATTERN,
  ID_PATTERN,
  validateCoachRequest,
} from "./lib/validate";
import { allPathwayTitles, computePathway, validAnswers } from "./lib/pathway";
import { COURSE_MAP, courseIdFor } from "./lib/course-map";
import {
  enrolUserInCourse,
  findUserByEmail,
  getAssessmentResponses,
  getCourseContents,
  getUserByEmail,
  getUserCourses,
  listCourses,
  countUsersByTag,
  getEnrolments,
  getUserProgress,
  listAllUsers,
  listUsersPage,
  lwConfigured,
  type LwUser,
  type LwUserCourse,
} from "./lib/learnworlds";
import {
  buildCoverage,
  classifyUnit,
  emptyState,
  moduleShift,
  parseResponse,
  scanForSafeguarding,
  type ReflectionResponse,
  type ReflectionsState,
} from "./lib/reflections";
import {
  advanceStreak,
  cohortTag,
  computeSkillsPassport,
  displayName,
  isModuleTitle,
  rankOf,
  upsertLeaderboard,
  type CourseRecord,
  type Leaderboard,
  type StreakState,
} from "./lib/skills-passport";
import { renderSkillsPassport } from "./pages-skills";
import { runCvChecks } from "./lib/cv-checks";
import {
  parseReviewReport,
  REVIEW_CAPS,
  reviewSystemPrompt,
  reviewUserMessage,
  validateReviewRequest,
} from "./lib/review";
import {
  buildPassport,
  groupPassport,
  isPassportData,
  passportAgeDays,
  type PassportData,
} from "./lib/passport";
import {
  renderPassportExpired,
  renderPassportPage,
  renderToolsPage,
} from "./pages";
import { renderPortalDashboard, renderPortalLogin } from "./pages-portal";
import { demoProviderName, renderDemoPage } from "./pages-demo";
import { renderInterviewPage } from "./pages-interview";
import {
  INTERVIEW_CAPS,
  interviewSystemPrompt,
  interviewUserMessage,
  parseInterviewReport,
  validateInterviewRequest,
} from "./lib/interview";
import {
  parseWebhookEvent,
  pushFeed,
  toFeedEntry,
  verifyWebhookSignature,
  type FeedEntry,
} from "./lib/webhooks";
import { aggregate, csvExport, EXCLUDED_TITLES, narrativeSystemPrompt } from "./lib/portal";
import {
  appendHistory,
  assessLearner,
  sortAssessments,
  summarise,
  type RiskAssessment,
  type RiskHistoryPoint,
  type RiskSummary,
} from "./lib/risk";
import { b64urlDecode, b64urlEncode, signPayload, verifyPayload } from "./lib/sign";
import { generate } from "./lib/anthropic";
import {
  BLOCKED_REPLY,
  BUSY_REPLY,
  CRISIS_REPLY,
  FALLBACK_REPLY,
  LIMIT_REPLY,
  UNAVAILABLE_REPLY,
  cleanApiKey,
  coach,
  moderate,
} from "./lib/anthropic";
import { classifyModelError } from "./lib/model-error";
import widgetSource from "./widget/coach-widget.js.txt";

export interface Env {
  RATE_LIMITS: KVNamespace;
  ANTHROPIC_API_KEY: string;
  COACH_DISABLED: string;
  WORKER_VERSION: string;
  COACH_MODEL: string;
  MODERATION_MODEL: string;
  /* LearnWorlds Admin API (optional — pathway enrolment degrades to
   * links-only recommendations when unset). */
  LEARNWORLDS_CLIENT_ID?: string;
  LEARNWORLDS_CLIENT_SECRET?: string;
  LEARNWORLDS_SCHOOL_URL?: string;
  /* Pre-shared value from LW admin Settings > Developers > Webhooks.
   * Unset = webhook endpoint answers 503 and the real-time layer is
   * simply off. */
  LW_WEBHOOK_SIGNATURE?: string;
}

/* Max learner-confirmed enrolments per learner per UTC day — a hard
 * cost/abuse cap on the one write path this worker has. */
const ENROLS_PER_DAY = 6;

/* Map a model failure to the learner-facing reply + a loud log line.
 * Billing and auth failures mean the coach is DOWN until the founder
 * acts — the log line is the alarm bell (visible in wrangler tail and
 * Cloudflare observability). */
function modelFailure(where: string, err: unknown) {
  const kind = classifyModelError(err);
  const detail = err as { status?: number; message?: string };
  if (kind === "billing") {
    console.error(
      `[coach] SERVICE DOWN - ANTHROPIC CREDITS EXHAUSTED (${where}): top up at console.anthropic.com`,
      detail.status ?? "",
      detail.message ?? "",
    );
    return { reply: UNAVAILABLE_REPLY, kind: "unavailable" };
  }
  if (kind === "auth") {
    console.error(
      `[coach] SERVICE DOWN - API KEY REJECTED (${where}): check/rotate ANTHROPIC_API_KEY`,
      detail.status ?? "",
      detail.message ?? "",
    );
    return { reply: UNAVAILABLE_REPLY, kind: "unavailable" };
  }
  if (kind === "busy") {
    console.error(`[coach] upstream busy (${where}):`, detail.status ?? "", detail.message ?? "");
    return { reply: BUSY_REPLY, kind: "busy" };
  }
  console.error(`[coach] ${where} failed:`, detail.status ?? "", detail.message ?? String(err));
  return { reply: FALLBACK_REPLY, kind: "fallback" };
}

export const app = new Hono<{ Bindings: Env }>();

app.use(
  "*",
  cors({
    origin: (origin) => (origin && isOriginAllowed(origin) ? origin : null),
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type"],
    maxAge: 600,
    credentials: false,
  }),
);

/* Origin allowlist on the API — runs after CORS so preflights still
 * get a CORS response. */
app.use("/api/*", async (c, next) => {
  const origin = c.req.header("Origin") || c.req.header("Referer") || "";
  if (!origin || !isOriginAllowed(origin)) {
    return c.json({ error: "origin_forbidden" }, 403);
  }
  return next();
});

app.get("/", (c) =>
  c.json({
    service: "fledglings-coach",
    status: "ok",
    docs: "POST /api/coach; widget at GET /widget.js",
  }),
);

app.get("/health", (c) => {
  /* Surfaces missing configuration loudly at deploy time instead of
   * silently serving fallbacks forever. Never exposes secrets. */
  return c.json({
    ok: true,
    version: c.env.WORKER_VERSION || "dev",
    coach_disabled: (c.env.COACH_DISABLED || "false").toLowerCase() === "true",
    api_key_configured: Boolean(c.env.ANTHROPIC_API_KEY),
    /* True only when the stored secret actually contains an sk-ant-…
     * token — catches empty/whitespace/mangled pastes loudly. */
    api_key_looks_valid: cleanApiKey(c.env.ANTHROPIC_API_KEY || "").startsWith(
      "sk-ant-",
    ),
    learnworlds_configured: lwConfigured(c.env),
    webhooks_configured: Boolean(c.env.LW_WEBHOOK_SIGNATURE),
  });
});

/* Internal QA page — a stand-in Fledglings page hosting the live
 * widget, so design and behaviour can be checked without touching
 * LearnWorlds. Same rate limits and safeguarding as production. */
app.get("/preview", (c) =>
  c.html(
    "<!doctype html><html><head><meta charset='utf-8'>" +
      "<meta name='viewport' content='width=device-width,initial-scale=1'>" +
      "<meta name='robots' content='noindex'><title>Fledge widget preview</title>" +
      "<style>body{font-family:Arial,sans-serif;background:#ECE7E6;margin:0;padding:48px;}" +
      "h1{color:#05253C;}p{color:#13507F;max-width:32em;}</style></head>" +
      "<body><h1>Fledglings page stand-in</h1>" +
      "<p>Internal QA page. The Fledge button should appear bottom-right, " +
      "fully live against the production coach.</p>" +
      "<script>window.FLEDGLINGS_COACH={endpoint:location.origin,learnerName:'Preview Tester'," +
      "learnerEmail:new URLSearchParams(location.search).get('email')||''};</script>" +
      "<script src='/widget.js' defer></script></body></html>",
  ),
);

/* Ops probe: verifies the stored LearnWorlds credentials by listing
 * courses (titles + ids — already public on the school site; no
 * secrets, no learner data). */
app.get("/lw-check", async (c) => {
  if (!lwConfigured(c.env)) {
    return c.json({ configured: false, ok: false });
  }
  try {
    const courses = await listCourses(c.env);
    return c.json({ configured: true, ok: true, count: courses.length, courses });
  } catch (err) {
    return c.json({
      configured: true,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

/* ==================================================================
 * Skills Passport — the gamified learner dashboard (embedded in the
 * logged-in LearnWorlds platform via {{USER.EMAIL}}).
 * ================================================================== */

const SP_CACHE_TTL = 600; // 10 min per learner
/* Bump whenever the rendered passport changes so learners see fixes
 * immediately instead of waiting out a stale cached page. */
const SP_CACHE_VERSION = "v4";
const SP_MAX_PROGRESS_CALLS = 36;

function demoSkillsModel(): Parameters<typeof renderSkillsPassport>[0] {
  const now = new Date();
  const courses: CourseRecord[] = [
    { courseId: "a", title: "Money Confidence & Everyday Decisions", label: "Financial Literacy", status: "completed", progressRate: 100, scoreRate: 91, timeSeconds: 5400, unitsDone: 8, unitsTotal: 8 },
    { courseId: "b", title: "Budgeting That Actually Works", label: "Financial Literacy", status: "completed", progressRate: 100, scoreRate: 84, timeSeconds: 6100, unitsDone: 9, unitsTotal: 9 },
    { courseId: "c", title: "Pay, Payslips, and Planning for Tax & NI", label: "Financial Literacy", status: "in_progress", progressRate: 55, scoreRate: 78, timeSeconds: 2400, unitsDone: 5, unitsTotal: 9 },
    { courseId: "d", title: "Introduction to Employability Skills", label: "Employability Skills", status: "completed", progressRate: 100, scoreRate: 88, timeSeconds: 4800, unitsDone: 7, unitsTotal: 7 },
    { courseId: "e", title: "Communication That Builds Trust", label: "Employability Skills", status: "completed", progressRate: 100, scoreRate: 90, timeSeconds: 5200, unitsDone: 8, unitsTotal: 8 },
    { courseId: "f", title: "Interviews, CVs & Early-Career Mindset", label: "Employability Skills", status: "in_progress", progressRate: 40, scoreRate: null, timeSeconds: 1800, unitsDone: 3, unitsTotal: 8 },
    { courseId: "g", title: "What is Online Safety?", label: "Staying Safe Online", status: "completed", progressRate: 100, scoreRate: 86, timeSeconds: 3900, unitsDone: 6, unitsTotal: 6 },
    { courseId: "h", title: "Online Scams, Fraud & Money Safety", label: "Staying Safe Online", status: "in_progress", progressRate: 70, scoreRate: 82, timeSeconds: 2600, unitsDone: 5, unitsTotal: 7 },
    { courseId: "i", title: "Confidence & Resilience Introduction", label: "Confidence & Resilience", status: "completed", progressRate: 100, scoreRate: 80, timeSeconds: 3600, unitsDone: 6, unitsTotal: 6 },
    { courseId: "j", title: "Preparing for an Interview", label: "Deep Dive Mini Series", status: "completed", progressRate: 100, scoreRate: 89, timeSeconds: 1900, unitsDone: 4, unitsTotal: 4 },
  ];
  const stamp = now.toISOString();
  const demoBoard: Leaderboard = {
    entries: [
      { h: "demo-jordan", n: "Jordan Lee", completed: 9, score: 92 },
      { h: "demo-priya", n: "Priya Patel", completed: 8, score: 88 },
      { h: "demo-sam", n: "Sam Okafor", completed: 8, score: 81 },
      { h: "demo-maya", n: "Maya Thompson", completed: 7, score: 86 },
      { h: "demo-tyler", n: "Tyler Brooks", completed: 6, score: 74 },
    ],
    builtAt: stamp,
  };
  return computeSkillsPassport({
    firstName: "Maya",
    fullName: "Maya Thompson",
    cohort: "Cohort 24B",
    courses,
    streak: { cur: 12, best: 18, last: now.toISOString().slice(0, 10) },
    rank: 4,
    cohortSize: 120,
    board: demoBoard,
    myHash: "demo-maya",
    now,
  });
}

app.get("/skills-passport", async (c) => {
  if (c.req.query("demo")) {
    return c.html(
      renderSkillsPassport(demoSkillsModel(), { demo: true, shareEmail: null }),
      200,
      FRAME_HEADERS,
    );
  }
  const email = (c.req.query("email") || "").trim().toLowerCase();
  if (!EMAIL_PATTERN.test(email) || !lwConfigured(c.env)) {
    return c.html(
      renderSkillsPassport(demoSkillsModel(), { demo: true, shareEmail: null }),
      200,
      FRAME_HEADERS,
    );
  }

  const emailHash = await hashLearnerId(email);
  const today = new Date().toISOString().slice(0, 10);

  /* Streak first — a visit counts even when the page itself is cached. */
  const streakKey = `sp:streak:${emailHash}`;
  const prevStreak = JSON.parse(
    (await c.env.RATE_LIMITS.get(streakKey)) || "null",
  ) as StreakState | null;
  const streak = advanceStreak(prevStreak, today);
  const streakChanged = !prevStreak || prevStreak.last !== streak.last;
  if (streakChanged) {
    await c.env.RATE_LIMITS.put(streakKey, JSON.stringify(streak));
  }

  const cacheKey = `sp:html:${SP_CACHE_VERSION}:${emailHash}`;
  if (!streakChanged) {
    const cached = await c.env.RATE_LIMITS.get(cacheKey);
    if (cached) return c.html(cached, 200, FRAME_HEADERS);
  }

  try {
    const user = await getUserByEmail(c.env, email);
    if (!user) {
      return c.html(
        renderSkillsPassport(demoSkillsModel(), { demo: true, shareEmail: null }),
        200,
        FRAME_HEADERS,
      );
    }

    const enrolments = (await getEnrolments(c.env, user.id)).filter((e) =>
      isModuleTitle(e.title),
    );
    /* Progress calls run in parallel batches — serial took ~1s per
     * module; batches of 6 stay inside LearnWorlds' 30 req/10s limit. */
    const wanted = enrolments.slice(0, SP_MAX_PROGRESS_CALLS);
    const courses: CourseRecord[] = [];
    for (let i = 0; i < wanted.length; i += 6) {
      const batch = await Promise.all(
        wanted.slice(i, i + 6).map(async (e) => {
          try {
            const p = await getUserProgress(c.env, user.id, e.courseId);
            return { courseId: e.courseId, title: e.title, label: e.label, ...p };
          } catch {
            return {
              courseId: e.courseId,
              title: e.title,
              label: e.label,
              status: "not_started" as const,
              progressRate: 0,
              scoreRate: null,
              timeSeconds: 0,
            };
          }
        }),
      );
      courses.push(...batch);
    }

    const fullName = displayName({
      email,
      firstName: user.first_name,
      lastName: user.last_name,
      username: user.username,
    });
    const myHash = emailHash.slice(0, 12);

    /* Cohort leaderboard: upsert this learner, read rank + size. */
    const tag = cohortTag(user.tags);
    let rank: number | null = null;
    let cohortSize: number | null = null;
    let board: Leaderboard | null = null;
    if (tag) {
      const tagSlug = tag.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const lbKey = `sp:lb:${tagSlug}`;
      const prev = JSON.parse(
        (await c.env.RATE_LIMITS.get(lbKey)) || "null",
      ) as Leaderboard | null;
      const completed = courses.filter((x) => x.status === "completed").length;
      const avg =
        courses.length > 0
          ? Math.round(courses.reduce((s, x) => s + x.progressRate, 0) / courses.length)
          : 0;
      board = upsertLeaderboard(
        prev,
        { h: myHash, n: fullName, completed, score: avg },
        new Date().toISOString(),
      );
      await c.env.RATE_LIMITS.put(lbKey, JSON.stringify(board));
      rank = rankOf(board, myHash);
      cohortSize = (await countUsersByTag(c.env, tag)) ?? board.entries.length;
      if (cohortSize < board.entries.length) cohortSize = board.entries.length;
    }

    const model = computeSkillsPassport({
      firstName: fullName.split(/\s+/)[0] || "Learner",
      fullName,
      cohort: tag,
      courses,
      streak,
      rank,
      cohortSize,
      board,
      myHash,
      now: new Date(),
    });

    const html = renderSkillsPassport(model, { demo: false, shareEmail: email });
    await c.env.RATE_LIMITS.put(cacheKey, html, { expirationTtl: SP_CACHE_TTL });
    console.log(
      `[coach] kind=skills-passport modules=${model.stats.modulesTotal} done=${model.stats.modulesDone} rank=${rank ?? "-"}`,
    );
    return c.html(html, 200, FRAME_HEADERS);
  } catch (err) {
    console.error("[coach] skills-passport error:", String(err));
    return c.html(
      renderSkillsPassport(demoSkillsModel(), { demo: true, shareEmail: null }),
      200,
      FRAME_HEADERS,
    );
  }
});

app.get("/widget.js", (c) =>
  c.body(widgetSource, 200, {
    "Content-Type": "application/javascript; charset=utf-8",
    /* Short cache so widget fixes roll out quickly without a
     * LearnWorlds snippet change. */
    "Cache-Control": "public, max-age=300",
    "X-Content-Type-Options": "nosniff",
  }),
);

app.post("/api/coach", async (c) => {
  const startedAt = Date.now();

  /* -- 0. Parse + validate ------------------------------------------ */
  const contentLength = Number(c.req.header("Content-Length") || "0");
  if (contentLength > CAPS.maxBodyBytes) {
    return c.json({ error: "body_too_large" }, 413);
  }

  let parsedBody: unknown;
  try {
    const raw = await c.req.text();
    if (raw.length > CAPS.maxBodyBytes) {
      return c.json({ error: "body_too_large" }, 413);
    }
    parsedBody = JSON.parse(raw);
  } catch {
    return c.json({ error: "invalid_json" }, 400);
  }

  const validated = validateCoachRequest(parsedBody);
  if (!validated.ok) {
    return c.json({ error: "invalid_request", detail: validated.error }, 400);
  }
  const req = validated.request;
  const latest = req.history[req.history.length - 1].content;

  const done = (kind: string, payload: Record<string, unknown>) => {
    console.log(
      `[coach] kind=${kind} ms=${Date.now() - startedAt} turns=${req.history.length}`,
    );
    return c.json(payload);
  };

  /* -- 1. Kill switch ------------------------------------------------ */
  if ((c.env.COACH_DISABLED || "false").toLowerCase() === "true") {
    return done("disabled", { reply: FALLBACK_REPLY, kind: "fallback" });
  }

  /* -- 2. Rate limits (before any model call) ------------------------ */
  const learnerHash = await hashLearnerId(req.learnerId);
  const rate = await checkAndIncrement(
    c.env.RATE_LIMITS,
    learnerHash,
    req.sessionId,
  );
  if (!rate.allowed) {
    return done("limit", {
      reply: LIMIT_REPLY,
      kind: "limit",
      reason: rate.reason,
      limits,
    });
  }

  /* -- 3. Deterministic crisis screen (no model needed) -------------- */
  if (crisisHeuristic(latest)) {
    return done("crisis_heuristic", { reply: CRISIS_REPLY, kind: "crisis" });
  }

  /* -- 4. Model moderation pre-pass ---------------------------------- */
  try {
    const verdict = await moderate(
      c.env.ANTHROPIC_API_KEY,
      c.env.MODERATION_MODEL || "claude-haiku-4-5",
      latest,
    );
    if (verdict === "CRISIS") {
      return done("crisis_model", { reply: CRISIS_REPLY, kind: "crisis" });
    }
    if (verdict === "BLOCK") {
      return done("blocked", { reply: BLOCKED_REPLY, kind: "blocked" });
    }
  } catch (err) {
    return done("moderation_error", modelFailure("moderation", err));
  }

  /* -- 5. Coach reply + output gate ---------------------------------- */
  try {
    const rawReply = await coach(
      c.env.ANTHROPIC_API_KEY,
      c.env.COACH_MODEL || "claude-sonnet-4-6",
      req.history,
      { learnerName: req.learnerName, page: req.page },
    );
    const reply = guardReply(rawReply);
    if (reply === null) {
      console.error("[coach] reply failed output gate");
      return done("reply_gated", { reply: FALLBACK_REPLY, kind: "fallback" });
    }
    return done("coach", {
      reply,
      kind: "coach",
      remaining_day: rate.remainingDay,
    });
  } catch (err) {
    return done("coach_error", modelFailure("coach", err));
  }
});

interface PathwayBody {
  learner_id?: unknown;
  session_id?: unknown;
  stage?: unknown;
  area?: unknown;
  focus?: unknown;
}

/* Recommendations ONLY. This route never writes anything anywhere —
 * enrolment happens solely via POST /api/enrol, one module at a time,
 * after the learner confirms that module by name. */
app.post("/api/pathway", async (c) => {
  let body: PathwayBody;
  try {
    body = await c.req.json<PathwayBody>();
  } catch {
    return c.json({ error: "invalid_json" }, 400);
  }

  const learnerId = typeof body.learner_id === "string" ? body.learner_id : "";
  const sessionId = typeof body.session_id === "string" ? body.session_id : "";
  if (!ID_PATTERN.test(learnerId) || !ID_PATTERN.test(sessionId)) {
    return c.json({ error: "invalid_request" }, 400);
  }
  const answers = validAnswers(body);
  if (!answers) return c.json({ error: "invalid_answers" }, 400);

  const recommendations = computePathway(answers);
  console.log(
    `[coach] kind=pathway area=${answers.area} stage=${answers.stage} focus=${answers.focus}`,
  );
  return c.json({
    recommendations,
    /* Widget offers the add-to-dashboard step only when a confirmed
     * enrolment could actually succeed. */
    can_enrol: lwConfigured(c.env),
  });
});

interface EnrolBody {
  learner_id?: unknown;
  session_id?: unknown;
  email?: unknown;
  title?: unknown;
}

/* One module, explicitly confirmed by the learner in the widget.
 * No tagging, no batch writes, allowlisted titles only. */
app.post("/api/enrol", async (c) => {
  let body: EnrolBody;
  try {
    body = await c.req.json<EnrolBody>();
  } catch {
    return c.json({ error: "invalid_json" }, 400);
  }

  const learnerId = typeof body.learner_id === "string" ? body.learner_id : "";
  const sessionId = typeof body.session_id === "string" ? body.session_id : "";
  if (!ID_PATTERN.test(learnerId) || !ID_PATTERN.test(sessionId)) {
    return c.json({ error: "invalid_request" }, 400);
  }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const title = typeof body.title === "string" ? body.title : "";

  /* The title must be one the pathway engine can actually emit. */
  if (!allPathwayTitles().includes(title)) {
    return c.json({ error: "unknown_title" }, 400);
  }

  const respond = (ok: boolean, reason?: string) => {
    console.log(`[coach] kind=enrol ok=${String(ok)} outcome=${reason ?? "enrolled"}`);
    return c.json({ ok, title, reason });
  };

  if (!lwConfigured(c.env)) return respond(false, "not_configured");
  if (!EMAIL_PATTERN.test(email)) return respond(false, "no_email");

  const courseId = courseIdFor(title);
  if (!courseId) return respond(false, "not_mapped");

  const learnerHash = await hashLearnerId(learnerId);
  const capKey = `enrol:day:${learnerHash}:${new Date().toISOString().slice(0, 10)}`;
  const used = parseInt((await c.env.RATE_LIMITS.get(capKey)) || "0", 10) || 0;
  if (used >= ENROLS_PER_DAY) return respond(false, "daily_cap");

  try {
    const userId = await findUserByEmail(c.env, email);
    if (!userId) return respond(false, "account_not_found");

    const result = await enrolUserInCourse(
      c.env,
      userId,
      courseId,
      "Learner-confirmed via Fledge pathway finder",
    );
    if (!result.ok) {
      console.error(`[coach] enrol failed: HTTP ${result.status} for course ${courseId}`);
      return respond(false, "enrol_failed");
    }
    await c.env.RATE_LIMITS.put(capKey, String(used + 1), { expirationTtl: 86_400 });
    return respond(true);
  } catch (err) {
    console.error("[coach] enrol error:", String(err));
    return respond(false, "service_error");
  }
});

/* ==================================================================
 * #3 — AI employability tools (ATS CV review, LinkedIn review)
 * ================================================================== */

const REVIEW_MAX_TOKENS = 2000;

app.post("/api/review", async (c) => {
  let body: Record<string, unknown>;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid_json" }, 400);
  }
  const learnerId = typeof body.learner_id === "string" ? body.learner_id : "";
  const sessionId = typeof body.session_id === "string" ? body.session_id : "";
  if (!ID_PATTERN.test(learnerId) || !ID_PATTERN.test(sessionId)) {
    return c.json({ error: "invalid_request" }, 400);
  }
  const validated = validateReviewRequest(body);
  if ("error" in validated) {
    return c.json({ error: "invalid_review", detail: validated.error }, 400);
  }

  if ((c.env.COACH_DISABLED || "false").toLowerCase() === "true") {
    return c.json({ reply: FALLBACK_REPLY, kind: "fallback" });
  }

  /* Safeguarding first: a CV or profile can carry a disclosure. */
  if (crisisHeuristic(validated.text) || crisisHeuristic(validated.target)) {
    console.log("[coach] kind=review outcome=crisis");
    return c.json({ reply: CRISIS_REPLY, kind: "crisis" });
  }

  /* Own daily budget — reviews are heavier than chat turns. */
  const learnerHash = await hashLearnerId(learnerId);
  const capKey = `rv:day:${learnerHash}:${new Date().toISOString().slice(0, 10)}`;
  const used = parseInt((await c.env.RATE_LIMITS.get(capKey)) || "0", 10) || 0;
  if (used >= REVIEW_CAPS.perDay) {
    return c.json({
      reply:
        "You've used today's reviews — nicely thorough! They top back up tomorrow. " +
        "Work the feedback you've already got in the meantime.",
      kind: "limit",
    });
  }

  /* Deterministic recruiter checks — computed before the model runs so
   * the AI can complement rather than repeat them. */
  const checks = runCvChecks(validated.text, validated.kind);
  const checksNote =
    "\n<automated_checks_already_shown_to_learner>\n" +
    checks.groups
      .flatMap((g) => g.items)
      .map((i) => `${i.status.toUpperCase()}: ${i.label}`)
      .join("\n") +
    "\n</automated_checks_already_shown_to_learner>\n" +
    "The learner sees those rule-based results separately — do not repeat them; add the judgement a rule cannot make.";

  try {
    const raw = await generate(
      c.env.ANTHROPIC_API_KEY,
      c.env.COACH_MODEL || "claude-sonnet-4-6",
      reviewSystemPrompt(validated.kind),
      reviewUserMessage(validated) + checksNote,
      REVIEW_MAX_TOKENS,
    );
    const report = parseReviewReport(raw);
    if (report === "crisis") {
      console.log("[coach] kind=review outcome=model_crisis");
      return c.json({ reply: CRISIS_REPLY, kind: "crisis" });
    }
    if (report === null) {
      console.error("[coach] review report failed to parse");
      return c.json({ reply: FALLBACK_REPLY, kind: "fallback" });
    }
    /* Output gate over every string the learner will see. */
    const visible = [
      report.verdict,
      report.next_step,
      ...report.strengths,
      ...report.dimensions.map((d) => d.tip),
      ...report.improvements.map((i) => `${i.title} ${i.detail}`),
    ].join("\n");
    if (guardReply(visible, 8000) === null) {
      console.error("[coach] review report failed output gate");
      return c.json({ reply: FALLBACK_REPLY, kind: "fallback" });
    }
    await c.env.RATE_LIMITS.put(capKey, String(used + 1), { expirationTtl: 86_400 });
    console.log(
      `[coach] kind=review tool=${validated.kind} outcome=ok overall=${report.overall} checks=${checks.passed}/${checks.total}`,
    );
    return c.json({ report, checks, kind: "review" });
  } catch (err) {
    return c.json(modelFailure("review", err));
  }
});

const FRAME_HEADERS = {
  "Content-Security-Policy":
    "frame-ancestors 'self' https://*.fledglings.co https://fledglings.co " +
    "https://*.learnworlds.com https://*.mycourse.app https://*.fledglings-school.co.uk",
};

app.get("/tools", (c) => c.html(renderToolsPage(), 200, FRAME_HEADERS));

/* ==================================================================
 * #4 — Readiness Passport
 * ================================================================== */

const PASSPORTS_PER_DAY = 10;

app.post("/api/passport", async (c) => {
  let body: Record<string, unknown>;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid_json" }, 400);
  }
  const learnerId = typeof body.learner_id === "string" ? body.learner_id : "";
  const sessionId = typeof body.session_id === "string" ? body.session_id : "";
  if (!ID_PATTERN.test(learnerId) || !ID_PATTERN.test(sessionId)) {
    return c.json({ error: "invalid_request" }, 400);
  }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!lwConfigured(c.env)) return c.json({ ok: false, reason: "not_configured" });
  if (!EMAIL_PATTERN.test(email)) return c.json({ ok: false, reason: "no_email" });

  const learnerHash = await hashLearnerId(learnerId);
  const capKey = `pp:day:${learnerHash}:${new Date().toISOString().slice(0, 10)}`;
  const used = parseInt((await c.env.RATE_LIMITS.get(capKey)) || "0", 10) || 0;
  if (used >= PASSPORTS_PER_DAY) return c.json({ ok: false, reason: "daily_cap" });

  try {
    const user = await getUserByEmail(c.env, email);
    if (!user) return c.json({ ok: false, reason: "account_not_found" });
    const courses = await getUserCourses(c.env, user.id);
    const data = buildPassport(user, courses, new Date());
    const payload = b64urlEncode(JSON.stringify(data));
    const sig = await signPayload(c.env.LEARNWORLDS_CLIENT_SECRET || "", payload);
    await c.env.RATE_LIMITS.put(capKey, String(used + 1), { expirationTtl: 86_400 });
    console.log(`[coach] kind=passport outcome=ok completed=${data.completed.length}`);
    return c.json({
      ok: true,
      url: `/passport?d=${payload}&s=${sig}`,
      completed: data.completed.length,
      in_progress: data.inProgress.length,
    });
  } catch (err) {
    console.error("[coach] passport error:", String(err));
    return c.json({ ok: false, reason: "service_error" });
  }
});

app.get("/passport", async (c) => {
  const d = c.req.query("d") || "";
  const s = c.req.query("s") || "";
  const decoded = b64urlDecode(d);
  const valid =
    decoded !== null &&
    (await verifyPayload(c.env.LEARNWORLDS_CLIENT_SECRET || "", d, s));
  let data: unknown = null;
  try {
    data = valid && decoded ? JSON.parse(decoded) : null;
  } catch {
    data = null;
  }
  if (!isPassportData(data) || passportAgeDays(data, new Date()) > 7) {
    return c.html(renderPassportExpired(), 200, FRAME_HEADERS);
  }
  return c.html(renderPassportPage(data, groupPassport(data), false), 200, FRAME_HEADERS);
});

/* A clearly-watermarked SAMPLE passport — for showing providers and
 * design QA. Contains no real learner data. */
app.get("/passport/sample", (c) => {
  const demo: PassportData = {
    v: 1,
    firstName: "Sample",
    sinceYear: "2026",
    completed: [
      "Money Confidence & Everyday Decisions",
      "Budgeting That Actually Works",
      "What is Online Safety?",
      "Preparing for an Interview",
    ],
    inProgress: [
      { title: "Online Scams, Fraud & Money Safety", pct: 60 },
      { title: "Interviews, CVs & Early-Career Mindset", pct: 25 },
      { title: "Building Real Confidence", pct: null },
    ],
    totalEnrolled: 7,
    issuedAt: new Date().toISOString().slice(0, 10),
  };
  return c.html(renderPassportPage(demo, groupPassport(demo), true), 200, FRAME_HEADERS);
});

/* ==================================================================
 * #5 — Provider evidence portal (access-code gated)
 * ================================================================== */

const PORTAL_SAMPLE_SIZE = 30;
const PORTAL_CACHE_TTL = 6 * 3600;
const PORTAL_COOKIE = "fl_portal";

/* A portal code grants either the whole school or ONE cohort tag —
 * tag scoping is enforced server-side on every data/CSV response, so a
 * scoped code can never see another provider's learners. */
interface PortalAccess {
  label: string;
  tag: string | null;
}

async function portalCodeMeta(c: { env: Env }, code: string): Promise<PortalAccess | null> {
  if (!/^[A-Za-z0-9-]{8,40}$/.test(code)) return null;
  const raw = await c.env.RATE_LIMITS.get(`portal:code:${code}`);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { label?: string; tag?: string };
    return { label: parsed.label ?? "Provider", tag: parsed.tag?.trim() || null };
  } catch {
    /* Legacy plain-string codes: the value IS the label. */
    return { label: raw.trim() || "Provider", tag: null };
  }
}

async function portalSession(c: {
  env: Env;
  req: { header: (n: string) => string | undefined };
}): Promise<PortalAccess | null> {
  const cookies = c.req.header("Cookie") || "";
  const match = cookies.match(new RegExp(`${PORTAL_COOKIE}=([^;]+)`));
  if (!match) return null;
  const [code, sig] = match[1].split(".");
  if (!code || !sig) return null;
  const okSig = await verifyPayload(
    c.env.LEARNWORLDS_CLIENT_SECRET || "",
    `portal:${code}`,
    sig,
  );
  if (!okSig) return null;
  return portalCodeMeta(c, code);
}

function inScope(tags: string[] | undefined, tag: string | null): boolean {
  return tag === null || (tags ?? []).some((t) => t.toLowerCase() === tag.toLowerCase());
}

function isLearner(u: LwUser): boolean {
  return Boolean(u.email) && !u.is_admin && !u.is_instructor && !u.is_suspended;
}

async function portalSample(
  env: Env,
  tag: string | null = null,
): Promise<{
  totalUsers: number | null;
  sample: Array<{ user: LwUser; courses: LwUserCourse[] }>;
}> {
  const page = await listUsersPage(env, 1);
  const learners = page.users
    .filter(isLearner)
    .filter((u) => inScope(u.tags ?? [], tag))
    .slice(0, PORTAL_SAMPLE_SIZE);
  const sample: Array<{ user: LwUser; courses: LwUserCourse[] }> = [];
  for (const user of learners) {
    try {
      sample.push({ user, courses: await getUserCourses(env, user.id) });
    } catch {
      /* One failed learner never sinks the report. */
    }
  }
  return { totalUsers: page.totalItems, sample };
}

/* ---------------- early-warning engine (#6) ---------------- */

const RISK_CACHE_KEY = "portal:risk:v2";
const RISK_HISTORY_KEY = "portal:risk:history:v1";
const RISK_CACHE_TTL = 6 * 3600;
const RISK_ENRICH_TOP = 10;

interface RiskReport {
  summary: RiskSummary;
  learners: RiskAssessment[];
}

async function buildRiskReport(env: Env, now: Date): Promise<RiskReport> {
  const users = (await listAllUsers(env)).filter(isLearner);
  let assessments = users.map((u) =>
    assessLearner(
      {
        id: u.id,
        email: (u.email || "").toLowerCase(),
        name: displayName({
          email: u.email,
          firstName: u.first_name,
          lastName: u.last_name,
          username: u.username,
        }),
        createdSecs: typeof u.created === "number" && u.created > 0 ? u.created : null,
        lastLoginSecs:
          typeof u.last_login === "number" && u.last_login > 0 ? u.last_login : null,
        tags: u.tags ?? [],
      },
      now,
    ),
  );
  assessments = sortAssessments(assessments);

  /* Enrich the most urgent learners with module context so the nudge
   * can name the module they're part-way through. */
  const enrichable = assessments
    .filter((a) => a.tier === "high" || a.tier === "medium" || a.tier === "watch")
    .slice(0, RISK_ENRICH_TOP);
  for (const a of enrichable) {
    try {
      const courses = (await getUserCourses(env, a.id)).filter(
        (course) => course.title && !EXCLUDED_TITLES.has(course.title),
      );
      const stalled =
        courses.find(
          (course) =>
            !course.completed && course.progressRate !== null && course.progressRate > 0,
        ) ?? null;
      const enrichment = {
        modulesEnrolled: courses.length,
        modulesCompleted: courses.filter((course) => course.completed).length,
        stalledTitle: stalled?.title ?? null,
      };
      const user = users.find((u) => u.id === a.id);
      if (user) {
        const idx = assessments.findIndex((x) => x.id === a.id);
        assessments[idx] = assessLearner(
          {
            id: a.id,
            email: a.email,
            name: a.name,
            createdSecs:
              typeof user.created === "number" && user.created > 0 ? user.created : null,
            lastLoginSecs:
              typeof user.last_login === "number" && user.last_login > 0
                ? user.last_login
                : null,
            tags: user.tags ?? [],
          },
          now,
          enrichment,
        );
      }
    } catch {
      /* Enrichment is a bonus — never sinks the report. */
    }
  }
  assessments = sortAssessments(assessments);
  return { summary: summarise(assessments, now), learners: assessments };
}

async function getRiskReport(env: Env, forceRefresh = false): Promise<RiskReport> {
  if (!forceRefresh) {
    const cached = await env.RATE_LIMITS.get(RISK_CACHE_KEY);
    if (cached) return JSON.parse(cached) as RiskReport;
  }
  const report = await buildRiskReport(env, new Date());
  await env.RATE_LIMITS.put(RISK_CACHE_KEY, JSON.stringify(report), {
    expirationTtl: RISK_CACHE_TTL,
  });
  const history = appendHistory(
    JSON.parse((await env.RATE_LIMITS.get(RISK_HISTORY_KEY)) || "null"),
    report.summary,
  );
  await env.RATE_LIMITS.put(RISK_HISTORY_KEY, JSON.stringify(history));
  return report;
}

/* ==================================================================
 * Reflections + safeguarding flags (pre/post assessmentV2 answers).
 * Built incrementally to stay inside Workers subrequest limits; the
 * snapshot is whole-school, filtered per scope at read time.
 * ================================================================== */

const REFLECT_KV_KEY = "portal:reflect:v3";
const REFLECT_MAX_AGE_MS = 6 * 3600 * 1000;
const REFLECT_CALL_BUDGET = 28; // LW subrequests per build step
const LW_SUPPORT_ASK =
  "Hi LearnWorlds — we're on a plan with API access, but GET /v2/assessments/{id}/responses " +
  "and GET /v2/forms/{id}/responses return 404 on our school (other v2 endpoints work fine). " +
  "Please enable the Assessments & Forms API endpoints for our school so we can read learner " +
  "assessment responses. Thanks!";

async function advanceReflections(env: Env): Promise<ReflectionsState> {
  const now = new Date();
  let state: ReflectionsState | null = JSON.parse(
    (await env.RATE_LIMITS.get(REFLECT_KV_KEY)) || "null",
  );
  const stale =
    state !== null &&
    now.getTime() - new Date(state.builtAt).getTime() > REFLECT_MAX_AGE_MS;
  const courseEntries = Object.entries(COURSE_MAP).filter(
    (e): e is [string, string] => e[1] !== null,
  );
  if (
    state === null ||
    stale ||
    state.totalCourses !== courseEntries.length ||
    state.userTags === undefined // pre-v2 cached shape
  ) {
    state = emptyState(courseEntries.length, now);
  }
  if (state.status === "ready") return state;

  let calls = 0;

  /* First step of a fresh sweep: capture email -> tags for every
   * learner (1 call per 100 users) so cohort scoping is self-contained. */
  if (state.cursor === 0 && Object.keys(state.userTags).length === 0) {
    try {
      const users = await listAllUsers(env, 5);
      calls += Math.max(1, Math.ceil(users.length / 100));
      for (const u of users) {
        if (u.email) state.userTags[u.email.toLowerCase()] = u.tags ?? [];
      }
    } catch {
      /* tags map is best-effort; scoping falls back to empty */
    }
  }

  while (state.cursor < courseEntries.length && calls < REFLECT_CALL_BUDGET) {
    const [courseTitle, courseId] = courseEntries[state.cursor]!;
    try {
      calls++;
      const units = await getCourseContents(env, courseId);
      state.coverage.push(buildCoverage(courseId, courseTitle, units));
      const pre: ReflectionResponse[] = [];
      const post: ReflectionResponse[] = [];
      for (const u of units) {
        if (state.responsesEnabled === false) break;
        if (u.type !== "assessmentV2") continue;
        const kind = classifyUnit(u.title);
        if (kind === "other") continue;
        const assessmentUnit = {
          courseId,
          courseTitle,
          unitId: u.id,
          unitTitle: u.title,
          kind,
        };
        let page = 1;
        for (;;) {
          calls++;
          const res = await getAssessmentResponses(env, u.id, page);
          if (res === null) {
            /* Plan-gated: record it, keep sweeping contents-only so the
             * coverage table still completes. */
            state.responsesEnabled = false;
            state.reason = LW_SUPPORT_ASK;
            break;
          }
          for (const raw of res.rows) {
            const parsed = parseResponse(raw);
            if (!parsed) continue;
            (kind === "pre" ? pre : post).push(parsed);
            state.flags.push(...scanForSafeguarding(assessmentUnit, parsed));
            const bucket =
              kind === "pre" ? state.preRespondents : state.postRespondents;
            if (parsed.email && !bucket.includes(parsed.email)) bucket.push(parsed.email);
          }
          if (page >= res.totalPages || page >= 3) break;
          page++;
        }
      }
      if (pre.length > 0 || post.length > 0) {
        state.shifts.push(moduleShift(courseId, courseTitle, pre, post));
      }
    } catch {
      /* one broken course never sinks the sweep */
    }
    state.cursor++;
  }
  if (state.cursor >= courseEntries.length) state.status = "ready";
  state.builtAt = now.toISOString();
  await env.RATE_LIMITS.put(REFLECT_KV_KEY, JSON.stringify(state), {
    expirationTtl: 24 * 3600,
  });
  return state;
}

app.get("/portal/reflections", async (c) => {
  const access = await portalSession(c);
  if (!access) return c.json({ error: "unauthorised" }, 401);
  if (!lwConfigured(c.env)) return c.json({ error: "learnworlds_not_configured" });
  try {
    const state = await advanceReflections(c.env);
    /* Scope filtering uses the email->tags map captured in the same
     * sweep — no dependency on any other cache. Flags are annotated
     * with the learner's cohort tag either way. */
    const tagsOf = (email: string): string[] =>
      state.userTags[email.toLowerCase()] ?? [];
    let flags = state.flags.map((f) => ({
      ...f,
      cohort: cohortTag(tagsOf(f.email)),
    }));
    let preCount = state.preRespondents.length;
    let postCount = state.postRespondents.length;
    if (access.tag) {
      const tag = access.tag;
      flags = flags.filter((f) => inScope(tagsOf(f.email), tag));
      preCount = state.preRespondents.filter((e) => inScope(tagsOf(e), tag)).length;
      postCount = state.postRespondents.filter((e) => inScope(tagsOf(e), tag)).length;
    }
    return c.json({
      status: state.status,
      responsesEnabled: state.responsesEnabled,
      reason: state.reason ?? null,
      progress: { done: state.cursor, total: state.totalCourses },
      coverage: state.coverage,
      shifts: state.shifts,
      flags,
      preCount,
      postCount,
      scoped: access.tag,
      builtAt: state.builtAt,
    });
  } catch (err) {
    console.error("[coach] reflections error:", String(err));
    return c.json({ error: "service_error" });
  }
});

/* ==================================================================
 * #3b — voice mock interview. Speech is transcribed on-device; only
 * text arrives here. Same guardrail stack as the CV review.
 * ================================================================== */

const INTERVIEW_MAX_TOKENS = 2200;

app.get("/interview", (c) => c.html(renderInterviewPage(), 200, FRAME_HEADERS));

app.post("/api/interview", async (c) => {
  let body: Record<string, unknown>;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid_json" }, 400);
  }
  const learnerId = typeof body.learner_id === "string" ? body.learner_id : "";
  const sessionId = typeof body.session_id === "string" ? body.session_id : "";
  if (!ID_PATTERN.test(learnerId) || !ID_PATTERN.test(sessionId)) {
    return c.json({ error: "invalid_request" }, 400);
  }
  const validated = validateInterviewRequest(body);
  if ("error" in validated) {
    return c.json({ error: "invalid_interview", detail: validated.error }, 400);
  }

  if ((c.env.COACH_DISABLED || "false").toLowerCase() === "true") {
    return c.json({ reply: FALLBACK_REPLY, kind: "fallback" });
  }

  /* Safeguarding first — a spoken answer can carry a disclosure. */
  if (validated.answers.some((a) => crisisHeuristic(a.answer))) {
    console.log("[coach] kind=interview outcome=crisis");
    return c.json({ reply: CRISIS_REPLY, kind: "crisis" });
  }

  const learnerHash = await hashLearnerId(learnerId);
  const capKey = `iv:day:${learnerHash}:${new Date().toISOString().slice(0, 10)}`;
  const used = parseInt((await c.env.RATE_LIMITS.get(capKey)) || "0", 10) || 0;
  if (used >= INTERVIEW_CAPS.perDay) {
    return c.json({
      reply:
        "You've done today's three mock interviews — that's genuinely good practice. " +
        "They top back up tomorrow; work the feedback you've got in the meantime.",
      kind: "limit",
    });
  }

  try {
    const raw = await generate(
      c.env.ANTHROPIC_API_KEY,
      c.env.COACH_MODEL || "claude-sonnet-4-6",
      interviewSystemPrompt(),
      interviewUserMessage(validated),
      INTERVIEW_MAX_TOKENS,
    );
    const report = parseInterviewReport(raw, validated.answers.length);
    if (report === "crisis") {
      console.log("[coach] kind=interview outcome=model_crisis");
      return c.json({ reply: CRISIS_REPLY, kind: "crisis" });
    }
    if (report === null) {
      console.error("[coach] interview report failed to parse");
      return c.json({ reply: FALLBACK_REPLY, kind: "fallback" });
    }
    const visible = [
      report.verdict,
      report.next_step,
      ...report.answers.flatMap((a) => [a.strength, a.improve, a.sharper]),
    ].join("\n");
    if (guardReply(visible, 10_000) === null) {
      console.error("[coach] interview report failed output gate");
      return c.json({ reply: FALLBACK_REPLY, kind: "fallback" });
    }
    await c.env.RATE_LIMITS.put(capKey, String(used + 1), { expirationTtl: 86_400 });
    console.log(
      `[coach] kind=interview role=${validated.role} answers=${validated.answers.length} outcome=ok overall=${report.overall}`,
    );
    return c.json({ report, kind: "interview" });
  } catch (err) {
    return c.json(modelFailure("interview", err));
  }
});

/* ==================================================================
 * LearnWorlds webhooks — the real-time layer. Configure in LW admin:
 * Settings > Developers > Webhooks -> this URL, events: course
 * completed + user registered/updated + lead created. The pre-shared
 * signature goes in the LW_WEBHOOK_SIGNATURE secret. Payments and
 * subscriptions are deliberately not handled.
 * ================================================================== */

const FEED_KV_KEY = "portal:feed:v1";
const HOOK_SEEN_KV_KEY = "hooks:last-event";

app.post("/hooks/learnworlds", async (c) => {
  const secret = c.env.LW_WEBHOOK_SIGNATURE || "";
  if (!secret) return c.json({ error: "webhook_not_configured" }, 503);
  if (!verifyWebhookSignature(c.req.header("Learnworlds-Webhook-Signature"), secret)) {
    console.error("[coach] webhook rejected: bad signature");
    return c.json({ error: "bad_signature" }, 401);
  }
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid_json" }, 400);
  }
  const now = new Date();
  /* Any correctly-signed delivery proves the connection — record the
   * heartbeat BEFORE deciding whether we act on the event. */
  await c.env.RATE_LIMITS.put(HOOK_SEEN_KV_KEY, now.toISOString());
  const ev = parseWebhookEvent(body, now);
  /* Unknown/ignored event types still get a 200 so LW doesn't retry. */
  if (!ev) {
    const t =
      typeof body === "object" && body !== null
        ? String((body as Record<string, unknown>).type ?? "?")
        : "?";
    console.log(`[coach] kind=webhook type=${t} outcome=ignored`);
    return c.json({ ok: true, ignored: true });
  }

  /* Cohort: prefer tags in the payload; fall back to a user lookup. */
  let tags = ev.tags;
  if (tags === null && lwConfigured(c.env)) {
    try {
      tags = (await getUserByEmail(c.env, ev.email))?.tags ?? [];
    } catch {
      tags = [];
    }
  }
  const cohort = cohortTag(tags ?? []);

  /* Feed */
  const entry = toFeedEntry(ev, cohort, now);
  if (entry) {
    const feed = JSON.parse(
      (await c.env.RATE_LIMITS.get(FEED_KV_KEY)) || "[]",
    ) as FeedEntry[];
    await c.env.RATE_LIMITS.put(FEED_KV_KEY, JSON.stringify(pushFeed(feed, entry)));
  }

  /* Completions bump the cohort leaderboard live (same entry shape the
   * Skills Passport maintains on visit). */
  if (ev.type === "courseCompleted" && cohort) {
    try {
      const emailHash = (await hashLearnerId(ev.email)).slice(0, 12);
      const slug = cohort.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const lbKey = `sp:lb:${slug}`;
      const board = JSON.parse(
        (await c.env.RATE_LIMITS.get(lbKey)) || "null",
      ) as Leaderboard | null;
      const existing = board?.entries.find((e) => e.h === emailHash);
      if (board && existing) {
        const next = upsertLeaderboard(
          board,
          { ...existing, completed: existing.completed + 1 },
          now.toISOString(),
        );
        await c.env.RATE_LIMITS.put(lbKey, JSON.stringify(next));
      }
    } catch {
      /* live bump is best-effort; the nightly/visit paths reconcile */
    }
  }

  /* Tag changes keep the reflections cohort map fresh. */
  if (ev.type === "userUpdated" && ev.tags !== null) {
    try {
      const raw = await c.env.RATE_LIMITS.get(REFLECT_KV_KEY);
      if (raw) {
        const state = JSON.parse(raw) as ReflectionsState;
        state.userTags[ev.email] = ev.tags;
        await c.env.RATE_LIMITS.put(REFLECT_KV_KEY, JSON.stringify(state), {
          expirationTtl: 24 * 3600,
        });
      }
    } catch {
      /* best-effort */
    }
  }

  console.log(`[coach] kind=webhook type=${ev.type} cohort=${cohort ?? "-"}`);
  return c.json({ ok: true });
});

/* #8 — personalised instant demo (outreach landing page). Public,
 * marketing-only: no learner data is reachable from it. */
app.get("/demo", (c) =>
  c.html(renderDemoPage(demoProviderName(c.req.query("p")))),
);

app.get("/portal", async (c) => {
  const access = await portalSession(c);
  if (!access) return c.html(renderPortalLogin());
  return c.html(renderPortalDashboard(access.label, access.tag));
});

app.get("/portal/logout", (c) => {
  c.header(
    "Set-Cookie",
    PORTAL_COOKIE + "=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0",
  );
  return c.redirect("/portal");
});

app.post("/portal/login", async (c) => {
  const form = await c.req.parseBody();
  const code = typeof form.code === "string" ? form.code.trim() : "";
  const meta = await portalCodeMeta(c, code);
  if (!meta) {
    return c.html(
      renderPortalLogin("That code didn't work — check it and try again, or contact Fledglings for access."),
      401,
    );
  }
  const sig = await signPayload(c.env.LEARNWORLDS_CLIENT_SECRET || "", `portal:${code}`);
  c.header(
    "Set-Cookie",
    `${PORTAL_COOKIE}=${code}.${sig}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=28800`,
  );
  return c.redirect("/portal");
});

app.get("/portal/data", async (c) => {
  const access = await portalSession(c);
  if (!access) return c.json({ error: "unauthorised" }, 401);
  if (!lwConfigured(c.env)) return c.json({ error: "learnworlds_not_configured" });

  /* Cache is per scope — a tag-scoped code must never be served the
   * whole-school payload. */
  const scopeKey = access.tag ? access.tag.toLowerCase().replace(/[^a-z0-9]+/g, "-") : "all";
  const cacheKey = `portal:data:v3:${scopeKey}`;
  const cached = await c.env.RATE_LIMITS.get(cacheKey);
  if (cached) return c.json(JSON.parse(cached));

  try {
    const { totalUsers, sample } = await portalSample(c.env, access.tag);
    const stats = aggregate(totalUsers, sample, new Date());
    const riskAll = await getRiskReport(c.env);
    const learners = riskAll.learners.filter((a) => inScope(a.tags, access.tag));
    const summary = access.tag ? summarise(learners, new Date()) : riskAll.summary;
    const history = access.tag
      ? [] /* history is school-wide; scoped views grow their own later */
      : (JSON.parse(
          (await c.env.RATE_LIMITS.get(RISK_HISTORY_KEY)) || "[]",
        ) as RiskHistoryPoint[]);

    /* Distinct cohorts (whole-school codes only) power the in-page
     * cohort switcher. */
    const cohortCounts = new Map<string, number>();
    if (!access.tag) {
      for (const a of riskAll.learners) {
        for (const t of a.tags) cohortCounts.set(t, (cohortCounts.get(t) ?? 0) + 1);
      }
    }

    let narrative = "";
    try {
      narrative = await generate(
        c.env.ANTHROPIC_API_KEY,
        c.env.COACH_MODEL || "claude-sonnet-4-6",
        narrativeSystemPrompt(),
        JSON.stringify({
          scope: access.tag ? `cohort: ${access.tag}` : "whole school",
          engagement: stats,
          earlyWarning: {
            learnersMonitored: summary.learners,
            activeLast7Days: summary.activeLast7Days,
            flaggedForAttention: summary.tiers.high + summary.tiers.medium,
            monitoringNote:
              "Learners are monitored continuously; those going quiet are flagged for personal follow-up.",
          },
        }),
        450,
      );
    } catch (err) {
      console.error("[coach] portal narrative failed:", String(err));
      narrative =
        "Narrative unavailable just now — the figures above are live from the platform.";
    }
    const payload = {
      stats,
      narrative,
      risk: { summary, learners },
      history,
      scopedTag: access.tag,
      cohorts: [...cohortCounts.entries()]
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count),
    };
    await c.env.RATE_LIMITS.put(cacheKey, JSON.stringify(payload), {
      expirationTtl: PORTAL_CACHE_TTL,
    });
    return c.json(payload);
  } catch (err) {
    console.error("[coach] portal data error:", String(err));
    return c.json({ error: "service_error" });
  }
});

/* Live activity feed — deliberately uncached; the webhook layer
 * writes it in real time. Scoped codes see only their cohort's
 * completions/joins; leads are HQ-only. */
app.get("/portal/feed", async (c) => {
  const access = await portalSession(c);
  if (!access) return c.json({ error: "unauthorised" }, 401);
  const feed = JSON.parse(
    (await c.env.RATE_LIMITS.get(FEED_KV_KEY)) || "[]",
  ) as FeedEntry[];
  const scoped = access.tag
    ? feed.filter(
        (f) =>
          f.kind !== "lead" &&
          f.cohort !== null &&
          f.cohort.toLowerCase() === access.tag!.toLowerCase(),
      )
    : feed;
  return c.json({
    configured: Boolean(c.env.LW_WEBHOOK_SIGNATURE),
    lastEvent: (await c.env.RATE_LIMITS.get(HOOK_SEEN_KV_KEY)) || null,
    feed: scoped.slice(0, 30),
  });
});

app.get("/portal/export.csv", async (c) => {
  const access = await portalSession(c);
  if (!access) return c.json({ error: "unauthorised" }, 401);
  if (!lwConfigured(c.env)) return c.json({ error: "learnworlds_not_configured" });
  try {
    const { sample } = await portalSample(c.env, access.tag);
    let riskByEmail: Map<string, { tier: string; daysSinceLogin: number | null }> | undefined;
    try {
      const risk = await getRiskReport(c.env);
      riskByEmail = new Map(
        risk.learners.map((a) => [a.email, { tier: a.tier, daysSinceLogin: a.daysSinceLogin }]),
      );
    } catch {
      /* CSV still exports without risk columns filled. */
    }
    return c.body(csvExport(sample, riskByEmail), 200, {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=fledglings-learners.csv",
    });
  } catch (err) {
    console.error("[coach] portal csv error:", String(err));
    return c.json({ error: "service_error" });
  }
});

app.notFound((c) => c.json({ error: "not_found" }, 404));

app.onError((err, c) => {
  console.error("[coach] unhandled error:", err);
  /* Learner-facing never-break promise: the API path degrades to the
   * authored fallback rather than a bare 500. */
  if (c.req.path.startsWith("/api/")) {
    return c.json({ reply: FALLBACK_REPLY, kind: "fallback" });
  }
  return c.json({ error: "internal_error" }, 500);
});

/* Nightly cron: rebuild the early-warning report so the portal opens
 * instantly and the trend history accrues even on days nobody signs
 * in. */
async function scheduled(
  _event: ScheduledController,
  env: Env,
  ctx: ExecutionContext,
): Promise<void> {
  if (!lwConfigured(env)) return;
  ctx.waitUntil(
    getRiskReport(env, true)
      .then((r) =>
        console.log(
          `[coach] kind=risk-cron learners=${r.summary.learners} high=${r.summary.tiers.high}`,
        ),
      )
      .catch((err) => console.error("[coach] risk cron failed:", String(err))),
  );
}

export default {
  fetch: app.fetch,
  scheduled,
};
