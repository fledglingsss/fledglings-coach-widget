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
import { computePathway, validAnswers } from "./lib/pathway";
import { courseIdFor } from "./lib/course-map";
import {
  addUserTags,
  enrolUserInCourse,
  findUserByEmail,
  lwConfigured,
} from "./lib/learnworlds";
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

/* Max auto-enrol actions per learner per UTC day — a hard cost/abuse
 * cap on the one write path this worker has. */
const PATHWAY_ACTIONS_PER_DAY = 3;

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
      "<script>window.FLEDGLINGS_COACH={endpoint:location.origin,learnerName:'Preview Tester'};</script>" +
      "<script src='/widget.js' defer></script></body></html>",
  ),
);

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
  email?: unknown;
  stage?: unknown;
  area?: unknown;
  focus?: unknown;
  enrol?: unknown;
}

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

  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const wantEnrol = body.enrol === true;

  const recommendations = computePathway(answers);
  const learnerHash = await hashLearnerId(learnerId);

  /* Recommendation-only path: no email / no creds / not requested. */
  const respond = (enrolment: Record<string, unknown>) => {
    console.log(
      `[coach] kind=pathway area=${answers.area} stage=${answers.stage} enrol=${String(
        enrolment.attempted,
      )} outcome=${String(enrolment.reason ?? "ok")}`,
    );
    return c.json({ recommendations, enrolment });
  };

  if (!wantEnrol) return respond({ attempted: false, reason: "not_requested" });
  if (!lwConfigured(c.env)) {
    return respond({ attempted: false, reason: "not_configured" });
  }
  if (!EMAIL_PATTERN.test(email)) {
    return respond({ attempted: false, reason: "no_email" });
  }

  /* Hard daily cap on the write path. */
  const capKey = `pw:day:${learnerHash}:${new Date().toISOString().slice(0, 10)}`;
  const used = parseInt((await c.env.RATE_LIMITS.get(capKey)) || "0", 10) || 0;
  if (used >= PATHWAY_ACTIONS_PER_DAY) {
    return respond({ attempted: false, reason: "daily_cap" });
  }

  try {
    const userId = await findUserByEmail(c.env, email);
    if (!userId) {
      return respond({ attempted: true, reason: "account_not_found" });
    }

    /* Tagging is best-effort — never blocks enrolment. */
    try {
      await addUserTags(c.env, userId, ["fledge-pathway", `pathway-${answers.area}`]);
    } catch (err) {
      console.error("[coach] pathway tagging failed:", String(err));
    }

    const enrolled: string[] = [];
    const skipped: string[] = [];
    for (const rec of recommendations) {
      const courseId = courseIdFor(rec.title);
      if (!courseId) {
        skipped.push(rec.title);
        continue;
      }
      const result = await enrolUserInCourse(
        c.env,
        userId,
        courseId,
        "Fledge pathway finder",
      );
      (result.ok ? enrolled : skipped).push(rec.title);
      if (!result.ok) {
        console.error(
          `[coach] pathway enrol failed: HTTP ${result.status} for course ${courseId}`,
        );
      }
    }

    await c.env.RATE_LIMITS.put(capKey, String(used + 1), {
      expirationTtl: 86_400,
    });
    return respond({ attempted: true, enrolled, skipped });
  } catch (err) {
    console.error("[coach] pathway enrolment error:", String(err));
    return respond({ attempted: true, reason: "service_error" });
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
