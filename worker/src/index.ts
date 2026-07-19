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
import { courseIdFor } from "./lib/course-map";
import {
  enrolUserInCourse,
  findUserByEmail,
  getUserByEmail,
  getUserCourses,
  listCourses,
  countUsersByTag,
  getEnrolments,
  getUserProgress,
  listUsersPage,
  lwConfigured,
  type LwUser,
  type LwUserCourse,
} from "./lib/learnworlds";
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
import {
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
  renderPortalDashboard,
  renderPortalLogin,
  renderToolsPage,
} from "./pages";
import { aggregate, csvExport, narrativeSystemPrompt } from "./lib/portal";
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

const app = new Hono<{ Bindings: Env }>();

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
const SP_CACHE_VERSION = "v2";
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

const REVIEW_MAX_TOKENS = 1100;

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

  try {
    const raw = await generate(
      c.env.ANTHROPIC_API_KEY,
      c.env.COACH_MODEL || "claude-sonnet-4-6",
      reviewSystemPrompt(validated.kind),
      reviewUserMessage(validated),
      REVIEW_MAX_TOKENS,
    );
    const reply = guardReply(raw, 5000);
    if (reply === null) {
      console.error("[coach] review reply failed output gate");
      return c.json({ reply: FALLBACK_REPLY, kind: "fallback" });
    }
    await c.env.RATE_LIMITS.put(capKey, String(used + 1), { expirationTtl: 86_400 });
    console.log(`[coach] kind=review tool=${validated.kind} outcome=ok`);
    return c.json({ reply, kind: "review" });
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

const PASSPORTS_PER_DAY = 3;

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

async function portalCodeLabel(c: { env: Env }, code: string): Promise<string | null> {
  if (!/^[A-Za-z0-9-]{8,40}$/.test(code)) return null;
  const raw = await c.env.RATE_LIMITS.get(`portal:code:${code}`);
  if (!raw) return null;
  try {
    return (JSON.parse(raw) as { label?: string }).label ?? "Provider";
  } catch {
    return "Provider";
  }
}

async function portalSession(c: {
  env: Env;
  req: { header: (n: string) => string | undefined };
}): Promise<string | null> {
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
  return portalCodeLabel(c, code);
}

async function portalSample(env: Env): Promise<{
  totalUsers: number | null;
  sample: Array<{ user: LwUser; courses: LwUserCourse[] }>;
}> {
  const page = await listUsersPage(env, 1);
  const learners = page.users.filter((u) => u.email).slice(0, PORTAL_SAMPLE_SIZE);
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

app.get("/portal", async (c) => {
  const label = await portalSession(c);
  if (!label) return c.html(renderPortalLogin());
  return c.html(renderPortalDashboard(label));
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
  const label = await portalCodeLabel(c, code);
  if (!label) {
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
  const label = await portalSession(c);
  if (!label) return c.json({ error: "unauthorised" }, 401);
  if (!lwConfigured(c.env)) return c.json({ error: "learnworlds_not_configured" });

  const cached = await c.env.RATE_LIMITS.get("portal:data:v1");
  if (cached) return c.json(JSON.parse(cached));

  try {
    const { totalUsers, sample } = await portalSample(c.env);
    const stats = aggregate(totalUsers, sample, new Date());
    let narrative = "";
    try {
      narrative = await generate(
        c.env.ANTHROPIC_API_KEY,
        c.env.COACH_MODEL || "claude-sonnet-4-6",
        narrativeSystemPrompt(),
        JSON.stringify(stats),
        400,
      );
    } catch (err) {
      console.error("[coach] portal narrative failed:", String(err));
      narrative =
        "Narrative unavailable just now — the figures above are live from the platform.";
    }
    const payload = { stats, narrative };
    await c.env.RATE_LIMITS.put("portal:data:v1", JSON.stringify(payload), {
      expirationTtl: PORTAL_CACHE_TTL,
    });
    return c.json(payload);
  } catch (err) {
    console.error("[coach] portal data error:", String(err));
    return c.json({ error: "service_error" });
  }
});

app.get("/portal/export.csv", async (c) => {
  const label = await portalSession(c);
  if (!label) return c.json({ error: "unauthorised" }, 401);
  if (!lwConfigured(c.env)) return c.json({ error: "learnworlds_not_configured" });
  try {
    const { sample } = await portalSample(c.env);
    return c.body(csvExport(sample), 200, {
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

export default app;
